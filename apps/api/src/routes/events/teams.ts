import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "@repo/database";

export async function teamRoutes(app: FastifyInstance) {
  // Get all teams for an event
  app.get(
    "/:eventId/teams",
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      
      const teams = await prisma.eventTeam.findMany({
        where: { eventId },
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: {
          createdAt: "desc"
        }
      });
      
      return reply.send({ teams });
    }
  );

  // Create a team (also creates participant and team member)
  app.post(
    "/:eventId/teams",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const { name } = request.body as { name: string };
      const user = (request as any).user;

      if (!name || name.trim() === "") {
        return reply.status(400).send({ error: "Team name is required" });
      }

      // Check if user is already in a team for this event
      const existingParticipant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        include: { teamMemberships: true }
      });

      if (existingParticipant && existingParticipant.teamMemberships.length > 0) {
        return reply.status(400).send({ error: "You are already in a team for this event" });
      }

      // Create Team and Member in a transaction
      try {
        const team = await prisma.$transaction(async (tx) => {
          let participant = existingParticipant;
          
          if (!participant) {
            participant = await tx.eventParticipant.create({
              data: { eventId, userId: user.id },
              include: { teamMemberships: true }
            });
          }

          const newTeam = await tx.eventTeam.create({
            data: { eventId, name },
          });

          await tx.eventTeamMember.create({
            data: {
              teamId: newTeam.id,
              participantId: participant.id,
            },
          });

          return newTeam;
        });

        return reply.send({ team });
      } catch (error: any) {
        if (error.code === 'P2002') {
          return reply.status(400).send({ error: "A team with this name already exists in this event." });
        }
        throw error;
      }
    }
  );

  // Request to join a team
  app.post(
    "/:eventId/teams/:teamId/join-requests",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventId, teamId } = request.params as { eventId: string; teamId: string };
      const user = (request as any).user;

      // Check if already in a team
      const existingParticipant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        include: { teamMemberships: true }
      });

      if (existingParticipant && existingParticipant.teamMemberships.length > 0) {
        return reply.status(400).send({ error: "You are already in a team for this event" });
      }

      // Check for existing pending request
      if (existingParticipant) {
        const existingRequest = await prisma.teamJoinRequest.findUnique({
          where: {
            teamId_participantId: {
              teamId,
              participantId: existingParticipant.id,
            },
          },
        });

        if (existingRequest) {
          if (existingRequest.status === "PENDING") {
            return reply.status(400).send({ error: "You already have a pending request to join this team" });
          } else if (existingRequest.status === "REJECTED") {
            // Allow re-applying by updating status
            const updatedRequest = await prisma.teamJoinRequest.update({
              where: { id: existingRequest.id },
              data: { status: "PENDING" },
            });
            return reply.send({ joinRequest: updatedRequest });
          }
        }
      }

      const joinRequest = await prisma.$transaction(async (tx) => {
        let participant = existingParticipant;
        
        if (!participant) {
          participant = await tx.eventParticipant.create({
            data: { eventId, userId: user.id },
            include: { teamMemberships: true }
          });
        }
        
        return tx.teamJoinRequest.create({
          data: {
            teamId,
            participantId: participant.id,
            status: "PENDING",
          },
        });
      });

      return reply.send({ joinRequest });
    }
  );

  // Get join requests for a team (Leader/Member only)
  app.get(
    "/:eventId/teams/:teamId/join-requests",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventId, teamId } = request.params as { eventId: string; teamId: string };
      const user = (request as any).user;

      // Verify the requester is part of this team
      const requesterParticipant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        include: { teamMemberships: true },
      });

      const isMember = requesterParticipant?.teamMemberships.some((m) => m.teamId === teamId);
      if (!isMember) {
        return reply.status(403).send({ error: "Only team members can view join requests" });
      }

      const requests = await prisma.teamJoinRequest.findMany({
        where: { teamId, status: "PENDING" },
        include: {
          participant: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({ requests });
    }
  );

  // Accept/Reject a join request
  app.patch(
    "/:eventId/teams/:teamId/join-requests/:requestId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventId, teamId, requestId } = request.params as { eventId: string; teamId: string; requestId: string };
      const { status } = request.body as { status: "APPROVED" | "REJECTED" };
      const user = (request as any).user;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        return reply.status(400).send({ error: "Status must be APPROVED or REJECTED" });
      }

      // Verify requester is part of this team
      const requesterParticipant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        include: { teamMemberships: true },
      });

      const isMember = requesterParticipant?.teamMemberships.some((m) => m.teamId === teamId);
      if (!isMember) {
        return reply.status(403).send({ error: "Only team members can manage join requests" });
      }

      const joinRequest = await prisma.teamJoinRequest.findUnique({
        where: { id: requestId },
      });

      if (!joinRequest || joinRequest.teamId !== teamId) {
        return reply.status(404).send({ error: "Join request not found" });
      }

      if (joinRequest.status !== "PENDING") {
        return reply.status(400).send({ error: "Request is already processed" });
      }

      if (status === "APPROVED") {
        // Verify target participant isn't already in a team
        const targetMembership = await prisma.eventTeamMember.findUnique({
          where: { participantId: joinRequest.participantId },
        });

        if (targetMembership) {
          // Reject request automatically because they joined another team
          await prisma.teamJoinRequest.update({
            where: { id: requestId },
            data: { status: "REJECTED" },
          });
          return reply.status(400).send({ error: "User is already in a team" });
        }

        // Transaction to approve and add member
        await prisma.$transaction([
          prisma.teamJoinRequest.update({
            where: { id: requestId },
            data: { status: "APPROVED" },
          }),
          prisma.eventTeamMember.create({
            data: {
              teamId,
              participantId: joinRequest.participantId,
            },
          }),
        ]);
      } else {
        await prisma.teamJoinRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED" },
        });
      }

      return reply.send({ success: true, status });
    }
  );

  // Get current user's sent join requests
  app.get(
    "/:eventId/join-requests/me",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const user = (request as any).user;

      const participant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
      });

      if (!participant) {
        return reply.send({ requests: [] });
      }

      const requests = await prisma.teamJoinRequest.findMany({
        where: { participantId: participant.id },
        include: {
          team: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({ requests });
    }
  );
  
  // Cancel a sent join request
  app.delete(
    "/:eventId/join-requests/me/:requestId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventId, requestId } = request.params as { eventId: string, requestId: string };
      const user = (request as any).user;

      const participant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
      });

      if (!participant) {
        return reply.status(404).send({ error: "Participant not found" });
      }

      const joinRequest = await prisma.teamJoinRequest.findUnique({
        where: { id: requestId },
      });

      if (!joinRequest || joinRequest.participantId !== participant.id) {
        return reply.status(404).send({ error: "Join request not found" });
      }
      
      if (joinRequest.status !== "PENDING") {
        return reply.status(400).send({ error: "Can only cancel pending requests" });
      }

      await prisma.teamJoinRequest.delete({
        where: { id: requestId }
      });

      return reply.send({ success: true });
    }
  );
}
