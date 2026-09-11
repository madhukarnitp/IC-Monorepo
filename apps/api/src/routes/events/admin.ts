import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/adminAuth";
import { prisma } from "@repo/database";
import { randomBytes, createHash } from "crypto";

const createEventSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["STARTUP_HUNT", "TREASURE_HUNT", "HACKATHON", "QUIZ", "COMPETITION", "CUSTOM"]),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "ACTIVE", "BUILDING", "SUBMISSIONS_OPEN", "SUBMISSIONS_CLOSED", "COMPLETED", "CANCELLED"]).default("DRAFT"),
});

const createTeamSchema = z.object({
  name: z.string().min(1),
});

const createResourceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  content: z.record(z.string(), z.any()).optional(),
});

const createCheckpointSchema = z.object({
  sequence: z.number().int().min(1),
  name: z.string().optional(),
  type: z.enum(["QR", "CODE", "NFC", "LOCATION", "MANUAL", "CUSTOM"]),
  points: z.number().int().default(0),
  config: z.record(z.string(), z.any()).optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // Enforce admin privileges for all routes in this plugin
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireAdmin);
  
  // Event Management
  app.get("/events", async (request, reply) => {
    const events = await prisma.event.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ events });
  });

  app.post("/events", async (request, reply) => {
    const body = createEventSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    try {
      const event = await prisma.event.create({
        data: body.data,
      });
      return reply.send({ event });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.put("/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createEventSchema.partial().safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    try {
      const event = await prisma.event.update({
        where: { id },
        data: body.data,
      });
      return reply.send({ event });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Team Management

  app.post("/events/:eventId/teams", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const body = createTeamSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    try {
      const team = await prisma.eventTeam.create({
        data: {
          eventId,
          name: body.data.name,
        },
      });
      return reply.send({ team });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Resource Management

  app.post("/events/:eventId/resources", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const body = createResourceSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    try {
      const resource = await prisma.eventResource.create({
        data: {
          eventId,
          name: body.data.name,
          description: body.data.description,
          type: body.data.type,
          content: (body.data.content as any) || {},
        },
      });
      return reply.send({ resource });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Checkpoint Management
  app.post("/events/:eventId/checkpoints", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const body = createCheckpointSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    try {
      const checkpoint = await prisma.eventCheckpoint.create({
        data: {
          eventId,
          sequence: body.data.sequence,
          name: body.data.name,
          type: body.data.type,
          points: body.data.points,
          config: (body.data.config as any) || {},
        },
      });
      return reply.send({ checkpoint });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Team-Wise QR Generation
  app.post("/events/:eventId/generate-qrs", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };

    const teams = await prisma.eventTeam.findMany({ where: { eventId } });
    const checkpoints = await prisma.eventCheckpoint.findMany({ where: { eventId } });

    if (teams.length === 0 || checkpoints.length === 0) {
      return reply.status(400).send({ error: "Ensure you have teams and checkpoints created first." });
    }

    let generatedCount = 0;
    const generatedTokens = [];

    for (const team of teams) {
      for (const checkpoint of checkpoints) {
        // Skip if this team-checkpoint combination already exists
        const existing = await prisma.eventTeamCheckpoint.findUnique({
          where: { teamId_checkpointId: { teamId: team.id, checkpointId: checkpoint.id } },
        });

        if (!existing) {
          // Generate a secure random token
          const rawToken = randomBytes(16).toString("hex");
          // Hash it before storing in the database
          const hashedToken = createHash("sha256").update(rawToken).digest("hex");
          
          await prisma.eventTeamCheckpoint.create({
            data: {
              teamId: team.id,
              checkpointId: checkpoint.id,
              tokenHash: hashedToken,
              status: "LOCKED",
            },
          });
          
          generatedTokens.push({
            teamId: team.id,
            teamName: team.name,
            checkpointId: checkpoint.id,
            checkpointSequence: checkpoint.sequence,
            rawToken
          });
          generatedCount++;
        }
      }
    }

    return reply.send({ 
      success: true, 
      generatedCount,
      tokens: generatedTokens,
      message: "Please save these raw tokens. They will not be accessible again. Print them as QR codes." 
    });
  });

  // Admin Recovery / View Operations
  app.get("/events/:eventId/live", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const teams = await prisma.eventTeam.findMany({
      where: { eventId },
      include: {
        members: { include: { participant: { include: { user: { select: { name: true } } } } } },
        checkpoints: { include: { checkpoint: true } },
        scans: true,
      },
    });

    const scans = await prisma.eventScan.count({
      where: { team: { eventId } },
    });

    return reply.send({
      totalTeams: teams.length,
      totalScans: scans,
      teams: teams.map(t => ({
        id: t.id,
        name: t.name,
        points: t.totalPoints,
        progress: t.checkpoints.filter(c => c.status === "COMPLETED").length,
        totalCheckpoints: t.checkpoints.length,
      })),
    });
  });
}
