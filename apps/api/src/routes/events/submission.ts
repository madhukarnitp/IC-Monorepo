import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "@repo/database";

const saveSubmissionSchema = z.object({
  data: z.record(z.string(), z.any()),
});

export async function submissionRoutes(app: FastifyInstance) {
  // GET /api/events/:eventId/submission - Get current submission
  app.get(
    "/",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const user = (request as any).user;

      const participant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        include: { teamMemberships: true },
      });

      if (!participant || !participant.teamMemberships[0]) {
        return reply.status(403).send({ error: "No team found" });
      }

      const teamId = participant.teamMemberships[0].teamId;

      const submission = await prisma.eventSubmission.findFirst({
        where: { eventId, teamId },
        orderBy: { createdAt: "desc" }
      });

      return reply.send({ submission });
    }
  );

  // PUT /api/events/:eventId/submission - Save draft
  app.put(
    "/",
    { preHandler: [requireAuth], config: { rateLimit: { max: 15, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const user = (request as any).user;
      
      const body = saveSubmissionSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== "SUBMISSIONS_OPEN") {
        return reply.status(400).send({ error: "Submissions are not currently open for this event." });
      }

      const participant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        include: { teamMemberships: true },
      });

      if (!participant || !participant.teamMemberships[0]) {
        return reply.status(403).send({ error: "No team found" });
      }

      const teamId = participant.teamMemberships[0].teamId;

      const existing = await prisma.eventSubmission.findFirst({
        where: { eventId, teamId },
      });

      if (existing && existing.status === "SUBMITTED") {
        return reply.status(400).send({ error: "Your submission is already submitted and cannot be edited." });
      }

      let submission;
      if (existing) {
        submission = await prisma.eventSubmission.update({
          where: { id: existing.id },
          data: { data: body.data.data as any, submittedByUserId: user.id },
        });
      } else {
        submission = await prisma.eventSubmission.create({
          data: {
            eventId,
            teamId,
            submittedByUserId: user.id,
            data: body.data.data as any,
            status: "DRAFT",
          },
        });
      }

      return reply.send({ submission });
    }
  );

  // POST /api/events/:eventId/submission/submit - Finalize submission
  app.post(
    "/submit",
    { preHandler: [requireAuth], config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const user = (request as any).user;

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== "SUBMISSIONS_OPEN") {
        return reply.status(400).send({ error: "Submissions are not currently open for this event." });
      }

      const participant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        include: { teamMemberships: true },
      });

      if (!participant || !participant.teamMemberships[0]) {
        return reply.status(403).send({ error: "No team found" });
      }

      const teamId = participant.teamMemberships[0].teamId;

      const existing = await prisma.eventSubmission.findFirst({
        where: { eventId, teamId },
      });

      if (!existing) {
        return reply.status(400).send({ error: "No draft submission found to submit." });
      }

      if (existing.status === "SUBMITTED") {
        return reply.status(400).send({ error: "Already submitted." });
      }

      const submission = await prisma.eventSubmission.update({
        where: { id: existing.id },
        data: { status: "SUBMITTED", submittedAt: new Date(), submittedByUserId: user.id },
      });

      return reply.send({ success: true, submission });
    }
  );
}
