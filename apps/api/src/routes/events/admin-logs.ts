import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/adminAuth";
import { prisma } from "@repo/database";

export async function adminLogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireAdmin);

  // ── GET /api/events/admin/:eventId/logs & /admin/logs ──────
  const handleGetLogs = async (request: any, reply: any) => {
    const { eventId } = request.params as { eventId: string };
    const { teamId, from, to, page = "1", limit = "50" } =
      request.query as {
        teamId?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    // Resolve votes (resource claims)
    const votesWhere: any = {
      eventId,
      status: "ACCEPTED",
      ...(teamId && { teamId }),
      ...(from || to
        ? {
            resolvedAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [votes, total] = await Promise.all([
      prisma.resourceScanVote.findMany({
        where: votesWhere,
        include: {
          team: { select: { id: true, name: true } },
          resource: { select: { id: true, name: true, type: true } },
          votes: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { resolvedAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.resourceScanVote.count({ where: votesWhere }),
    ]);

    const logs = votes.map((v) => {
      const initiator = v.votes.find((ve) => ve.userId === v.initiatedBy);
      return {
        id: v.id,
        type: "RESOURCE_CLAIM",
        teamId: v.teamId,
        teamName: v.team.name,
        resourceId: v.resourceId,
        resourceName: v.resource.name,
        resourceType: v.resource.type,
        initiatedBy: initiator?.user?.name || v.initiatedBy,
        resolvedAt: v.resolvedAt,
        members: v.votes.map((ve) => ({
          userId: ve.userId,
          name: ve.user.name,
          vote: ve.vote,
        })),
      };
    });

    return reply.send({
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  };

  // ── GET /api/events/:eventId/admin/logs/team/:teamId ────
  // Team-specific log with full history (declined + accepted)
  app.get("/:eventId/admin/logs/team/:teamId", async (request, reply) => {
    const { eventId, teamId } = request.params as {
      eventId: string;
      teamId: string;
    };

    const votes = await prisma.resourceScanVote.findMany({
      where: { eventId, teamId },
      include: {
        resource: { select: { id: true, name: true, type: true } },
        votes: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const team = await prisma.eventTeam.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            participant: {
              include: { user: { select: { id: true, name: true, email: true, image: true } } },
            },
          },
        },
        resources: {
          include: { resource: { select: { name: true, type: true } } },
        },
      },
    });

    return reply.send({
      team: {
        id: team?.id,
        name: team?.name,
        totalPoints: team?.totalPoints,
        members: team?.members.map((m) => m.participant.user),
        claimedResources: team?.resources.map((r) => ({
          name: r.resource.name,
          type: r.resource.type,
          unlockedAt: r.unlockedAt,
        })),
      },
      scanHistory: votes.map((v) => ({
        id: v.id,
        resourceName: v.resource.name,
        status: v.status,
        initiatedBy: v.initiatedBy,
        createdAt: v.createdAt,
        resolvedAt: v.resolvedAt,
        memberVotes: v.votes.map((ve) => ({
          name: ve.user.name,
          vote: ve.vote,
        })),
      })),
    });
  });

  app.get("/:eventId/admin/logs", handleGetLogs);
  app.get("/:eventId/logs", handleGetLogs);

  // ── GET /api/events/admin/:eventId/overview ─────────────
  // Dashboard stats: total teams, scans, resources claimed, leaderboard
  const handleGetOverview = async (request: any, reply: any) => {
    const { eventId } = request.params as { eventId: string };

    const [totalTeams, totalResources, totalClaims, topTeams, recentClaims, resourceStats] =
      await Promise.all([
        prisma.eventTeam.count({ where: { eventId } }),
        prisma.eventResource.count({ where: { eventId } }),
        prisma.eventTeamResource.count({ where: { team: { eventId } } }),
        prisma.eventTeam.findMany({
          where: { eventId },
          orderBy: { totalPoints: "desc" },
          take: 10,
          select: { id: true, name: true, totalPoints: true },
        }),
        prisma.resourceScanVote.findMany({
          where: { eventId, status: "ACCEPTED" },
          orderBy: { resolvedAt: "desc" },
          take: 10,
          include: {
            team: { select: { name: true } },
            resource: { select: { name: true } },
          },
        }),
        prisma.eventResource.findMany({
          where: { eventId },
          select: {
            id: true, name: true, quantity: true, quantityUsed: true, active: true,
            _count: { select: { teamResources: true } },
          },
        }),
      ]);

    return reply.send({
      stats: {
        totalTeams,
        totalResources,
        totalClaims,
        claimRate: totalResources > 0 ? Math.round((totalClaims / totalResources) * 100) : 0,
      },
      leaderboard: topTeams,
      recentActivity: recentClaims.map((v) => ({
        teamName: v.team.name,
        resourceName: v.resource.name,
        claimedAt: v.resolvedAt,
      })),
      resourceStats: resourceStats.map((r) => ({
        ...r,
        remaining: Math.max(0, r.quantity - r.quantityUsed),
        claimCount: r._count.teamResources,
      })),
    });
  };

  app.get("/:eventId/admin/overview", handleGetOverview);
  app.get("/:eventId/overview", handleGetOverview);
}
