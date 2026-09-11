import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "@repo/database";
import { verifyQrToken } from "./resources";

const VOTE_WINDOW_MS = 60_000;   // 60 s for all members to vote
const COOLDOWN_MS    = 30_000;   // 30 s cooldown on decline

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

async function getTeamForUser(eventId: string, userId: string) {
  const participant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: {
      teamMemberships: {
        include: {
          team: {
            include: {
              members: {
                include: {
                  participant: { include: { user: { select: { id: true, name: true, image: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  const membership = participant?.teamMemberships[0];
  return membership ? { participant, team: membership.team } : null;
}

async function checkCooldown(teamId: string) {
  const cooldown = await prisma.teamScanCooldown.findUnique({ where: { teamId } });
  if (!cooldown) return null;

  if (new Date() > cooldown.expiresAt) {
    // Expired — clean up
    await prisma.teamScanCooldown.delete({ where: { teamId } });
    return null;
  }

  return cooldown;
}

async function expireOldVotes() {
  // Mark expired PENDING sessions as EXPIRED
  await prisma.resourceScanVote.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}

// ──────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────

export async function scanVoteRoutes(app: FastifyInstance) {

  // ── POST /api/events/:eventId/scan
  // Phase 1: Initiate scan — validate HMAC token, create vote session
  app.post(
    "/",
    { preHandler: [requireAuth], config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const user = (request as any).user;

      const body = z.object({ token: z.string().min(1) }).safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: "Token is required" });
      }

      await expireOldVotes();

      // Ensure the event is active
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { status: true },
      });
      if (!event || !["ACTIVE", "BUILDING"].includes(event.status)) {
        return reply.status(400).send({ error: "Event is not active" });
      }

      // Get team for this user
      const teamData = await getTeamForUser(eventId, user.id);
      if (!teamData) {
        return reply.status(403).send({
          error: "You must be in a team to scan resources",
        });
      }

      const { team } = teamData;

      // Check cooldown
      const cooldown = await checkCooldown(team.id);
      if (cooldown) {
        const secondsLeft = Math.ceil(
          (cooldown.expiresAt.getTime() - Date.now()) / 1000
        );
        return reply.status(429).send({
          error: "TEAM_ON_COOLDOWN",
          message: `Your team is in cooldown for ${secondsLeft} more seconds.`,
          cooldownExpiresAt: cooldown.expiresAt,
          secondsLeft,
        });
      }

      // Check if team already has an active vote session
      const existingVote = await prisma.resourceScanVote.findFirst({
        where: { teamId: team.id, status: "PENDING" },
      });
      if (existingVote) {
        return reply.status(409).send({
          error: "VOTE_IN_PROGRESS",
          message: "Your team already has an active vote session",
          voteSessionId: existingVote.id,
        });
      }

      // ── Parse + verify HMAC token ──────────────────────
      // First, determine which resource this token belongs to by extracting payload
      const dotIdx = body.data.token.lastIndexOf(".");
      if (dotIdx === -1) {
        return reply.status(400).send({ error: "INVALID_TOKEN", message: "Malformed QR code" });
      }

      let payload: { resourceId: string; eventId: string; nonce: string; teamId?: string };
      try {
        payload = JSON.parse(
          Buffer.from(body.data.token.substring(0, dotIdx), "base64url").toString("utf8")
        );
      } catch {
        return reply.status(400).send({ error: "INVALID_TOKEN", message: "Malformed QR code" });
      }

      // Validate event match
      if (payload.eventId !== eventId) {
        return reply.status(400).send({
          error: "WRONG_EVENT",
          message: "This QR code is for a different event",
        });
      }

      // Fetch resource to get its HMAC secret
      const resource = await prisma.eventResource.findUnique({
        where: { id: payload.resourceId },
      });

      if (!resource || !resource.active) {
        return reply.status(404).send({ error: "Resource not found or inactive" });
      }

      if (!resource.hmacSecret) {
        return reply.status(500).send({ error: "Resource QR not properly configured" });
      }

      // Verify HMAC
      const verified = verifyQrToken(body.data.token, resource.hmacSecret);
      if (!verified) {
        return reply.status(400).send({
          error: "INVALID_TOKEN",
          message: "QR code signature is invalid",
        });
      }

      // Check quantity
      if (resource.quantityUsed >= resource.quantity) {
        return reply.status(400).send({
          error: "RESOURCE_DEPLETED",
          message: "This resource has been fully claimed",
        });
      }

      // Check if team already claimed this resource
      const alreadyClaimed = await prisma.eventTeamResource.findUnique({
        where: { teamId_resourceId: { teamId: team.id, resourceId: resource.id } },
      });
      if (alreadyClaimed) {
        return reply.status(400).send({
          error: "ALREADY_CLAIMED",
          message: "Your team has already claimed this resource",
        });
      }

      // ── Create Vote Session (Phase 1) ──────────────────────
      const voteExpiresAt = new Date(Date.now() + VOTE_WINDOW_MS);
      const session = await prisma.resourceScanVote.create({
        data: {
          teamId: team.id,
          resourceId: resource.id,
          eventId,
          initiatedBy: user.id,
          status: "PENDING",
          expiresAt: voteExpiresAt,
          votes: {
            create: team.members.map((member) => ({
              userId: member.participant.user.id,
              vote: "PENDING",
              votedAt: null,
            })),
          },
        },
        include: {
          votes: true,
          resource: true,
        },
      });

      return reply.send({
        resolved: false,
        outcome: "PENDING",
        voteSessionId: session.id,
        expiresAt: session.expiresAt,
        message: "Scan initiated! Please accept or reject the resource.",
      });
    }
  );

  // ── POST /api/events/:eventId/scan-votes/:sessionId/respond
  // Phase 2: Each member casts their vote
  app.post(
    "/scan-votes/:sessionId/respond",
    { preHandler: [requireAuth], config: { rateLimit: { max: 15, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { eventId, sessionId } = request.params as {
        eventId: string;
        sessionId: string;
      };
      const user = (request as any).user;

      const body = z
        .object({ vote: z.enum(["ACCEPTED", "DECLINED"]) })
        .safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: "vote must be ACCEPTED or DECLINED" });
      }

      await expireOldVotes();

      const session = await prisma.resourceScanVote.findUnique({
        where: { id: sessionId },
        include: {
          votes: true,
          resource: true,
        },
      });

      if (!session) {
        return reply.status(404).send({ error: "Vote session not found" });
      }

      if (session.eventId !== eventId) {
        return reply.status(400).send({ error: "Session does not belong to this event" });
      }

      if (session.status !== "PENDING") {
        return reply.status(400).send({
          error: "VOTE_CLOSED",
          message: `Vote is already ${session.status}`,
          finalStatus: session.status,
        });
      }

      // Find this user's vote entry
      const myEntry = session.votes.find((v) => v.userId === user.id);
      if (!myEntry) {
        return reply.status(403).send({ error: "You are not part of this vote session" });
      }

      if (myEntry.vote !== "PENDING" && body.data.vote !== "DECLINED") {
        return reply.status(400).send({ error: "You have already voted" });
      }

      // Cast vote
      await prisma.resourceScanVoteEntry.update({
        where: { id: myEntry.id },
        data: { vote: body.data.vote, votedAt: new Date() },
      });

      // ── Evaluate all votes ─────────────────────────────
      const updatedVotes = await prisma.resourceScanVoteEntry.findMany({
        where: { sessionId },
      });

      const anyDeclined = updatedVotes.some((v) => v.vote === "DECLINED");
      const allAccepted = updatedVotes.every((v) => v.vote === "ACCEPTED");

      if (anyDeclined) {
        // Set 30s cooldown and close session
        const declinedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { name: true },
        });

        await prisma.$transaction([
          prisma.resourceScanVote.update({
            where: { id: sessionId },
            data: { status: "DECLINED", resolvedAt: new Date() },
          }),
          prisma.teamScanCooldown.upsert({
            where: { teamId: session.teamId },
            create: {
              teamId: session.teamId,
              expiresAt: new Date(Date.now() + COOLDOWN_MS),
              reason: `${declinedUser?.name || "A team member"} declined the scan`,
            },
            update: {
              expiresAt: new Date(Date.now() + COOLDOWN_MS),
              reason: `${declinedUser?.name || "A team member"} declined the scan`,
            },
          }),
        ]);

        return reply.send({
          resolved: true,
          outcome: "DECLINED",
          cooldownSeconds: COOLDOWN_MS / 1000,
          cooldownExpiresAt: new Date(Date.now() + COOLDOWN_MS),
          message: "Vote declined — 30s team cooldown applied",
        });
      }

      if (allAccepted) {
        return resolveVoteSession(sessionId, session.teamId, session.resource, reply);
      }

      // Still waiting for more votes
      const remaining = updatedVotes.filter((v) => v.vote === "PENDING").length;
      return reply.send({
        resolved: false,
        outcome: "PENDING",
        pendingVotes: remaining,
        message: `Waiting for ${remaining} more team member(s)`,
      });
    }
  );

  // ── GET /api/events/:eventId/scan-votes/active
  // Phase 3 polling: Get the active vote session for the current user's team
  app.get(
    "/scan-votes/active",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const user = (request as any).user;

      await expireOldVotes();

      const teamData = await getTeamForUser(eventId, user.id);
      if (!teamData) {
        return reply.send({ activeSession: null, cooldown: null });
      }

      const { team } = teamData;

      // Check cooldown
      const cooldown = await checkCooldown(team.id);

      // Check active vote session
      const session = await prisma.resourceScanVote.findFirst({
        where: { teamId: team.id, status: "PENDING" },
        include: {
          votes: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
          resource: {
            select: {
              id: true, name: true, description: true, type: true,
              quantity: true, quantityUsed: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const myVote = session?.votes.find((v) => v.userId === user.id);

      return reply.send({
        activeSession: session
          ? {
              id: session.id,
              expiresAt: session.expiresAt,
              initiatedBy: session.initiatedBy,
              resource: session.resource,
              votes: session.votes,
              myVote: myVote?.vote || null,
              isInitiator: session.initiatedBy === user.id,
            }
          : null,
        cooldown: cooldown
          ? {
              expiresAt: cooldown.expiresAt,
              reason: cooldown.reason,
              secondsLeft: Math.ceil((cooldown.expiresAt.getTime() - Date.now()) / 1000),
            }
          : null,
      });
    }
  );
}

// ──────────────────────────────────────────────────────────
// Resolve a vote session (all accepted)
// ──────────────────────────────────────────────────────────
async function resolveVoteSession(
  sessionId: string,
  teamId: string,
  resource: { id: string; quantity: number; quantityUsed: number; [key: string]: any },
  reply: any
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check quantity again inside transaction (race-condition safe)
      const freshResource = await tx.eventResource.findUnique({
        where: { id: resource.id },
        select: { quantity: true, quantityUsed: true },
      });

      if (!freshResource || freshResource.quantityUsed >= freshResource.quantity) {
        throw new Error("RESOURCE_DEPLETED");
      }

      // Check if already claimed (race)
      const existing = await tx.eventTeamResource.findUnique({
        where: { teamId_resourceId: { teamId, resourceId: resource.id } },
      });
      if (existing) throw new Error("ALREADY_CLAIMED");

      // Increment quantityUsed
      await tx.eventResource.update({
        where: { id: resource.id },
        data: { quantityUsed: { increment: 1 } },
      });

      // Create team resource record
      const teamResource = await tx.eventTeamResource.create({
        data: { teamId, resourceId: resource.id },
        include: { resource: { select: { name: true, description: true, type: true } } },
      });

      // Close the vote session
      await tx.resourceScanVote.update({
        where: { id: sessionId },
        data: { status: "ACCEPTED", resolvedAt: new Date() },
      });

      return teamResource;
    });

    return reply.send({
      resolved: true,
      outcome: "ACCEPTED",
      resourceUnlocked: {
        id: result.resourceId,
        name: result.resource.name,
        description: result.resource.description,
        type: result.resource.type,
        unlockedAt: result.unlockedAt,
      },
      message: "All members accepted — resource claimed!",
    });
  } catch (err: any) {
    if (err.message === "RESOURCE_DEPLETED") {
      await prisma.resourceScanVote.update({
        where: { id: sessionId },
        data: { status: "DECLINED", resolvedAt: new Date() },
      });
      return reply.status(400).send({ error: "RESOURCE_DEPLETED", message: "Resource is out of stock" });
    }
    if (err.message === "ALREADY_CLAIMED") {
      return reply.status(400).send({ error: "ALREADY_CLAIMED", message: "Already claimed" });
    }
    throw err;
  }
}
