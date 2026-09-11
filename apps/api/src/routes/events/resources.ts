import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/adminAuth";
import { prisma } from "@repo/database";
import { randomBytes, createHmac } from "crypto";
import type { Prisma } from "@repo/database";

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/** Generate a secure HMAC secret for a resource */
function generateHmacSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Build a signed QR token for a single resource:
 *   payload = base64url({ resourceId, eventId, nonce, v: 2 })
 *   signature = HMAC-SHA256(hmacSecret, payload)
 *   token = payload + "." + signature
 *
 * Each resource has a SINGLE secure QR code that any team can scan.
 */
export function buildResourceQrToken(params: {
  resourceId: string;
  eventId: string;
  hmacSecret: string;
}): string {
  const nonce = randomBytes(8).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({
      resourceId: params.resourceId,
      eventId: params.eventId,
      nonce,
      v: 2,
    })
  ).toString("base64url");

  const sig = createHmac("sha256", params.hmacSecret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${sig}`;
}

/**
 * Verify a QR token and return the decoded payload if valid, else null.
 * Supports both v2 single-resource tokens and legacy v1 tokens.
 */
export function verifyQrToken(
  token: string,
  hmacSecret: string
): { resourceId: string; eventId: string; nonce: string; teamId?: string } | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;

    const payload = token.substring(0, dotIdx);
    const sig = token.substring(dotIdx + 1);

    const expectedSig = createHmac("sha256", hmacSecret)
      .update(payload)
      .digest("base64url");

    // Constant-time comparison
    if (sig.length !== expectedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (diff !== 0) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return decoded;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// Validation Schemas
// ──────────────────────────────────────────────────────────

const createResourceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  content: z.record(z.string(), z.unknown()).optional(),
  quantity: z.number().int().min(1).default(1),
});

const updateResourceSchema = createResourceSchema.partial();

// ──────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────

export async function eventResourceRoutes(app: FastifyInstance) {
  // All routes here require auth + admin
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireAdmin);

  // ── GET /api/events/:eventId/resources ─────────────────
  app.get("/:eventId/resources", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };

    const resources = await prisma.eventResource.findMany({
      where: { eventId },
      include: {
        _count: { select: { teamResources: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Never expose the hmacSecret to the client
    const safe = resources.map(({ hmacSecret, ...r }) => r);
    return reply.send({ resources: safe });
  });

  // ── POST /api/events/:eventId/resources ────────────────
  app.post("/:eventId/resources", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const body = createResourceSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const hmacSecret = generateHmacSecret();

    const resource = await prisma.eventResource.create({
      data: {
        eventId,
        name: body.data.name,
        description: body.data.description,
        type: body.data.type,
        content: (body.data.content || {}) as Prisma.InputJsonValue,
        quantity: body.data.quantity,
        hmacSecret,
      },
    });

    const { hmacSecret: _, ...safeResource } = resource;
    return reply.status(201).send({ resource: safeResource });
  });

  // ── PUT /api/events/:eventId/resources/:resourceId ─────
  app.put("/:eventId/resources/:resourceId", async (request, reply) => {
    const { eventId, resourceId } = request.params as { eventId: string; resourceId: string };
    const body = updateResourceSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const resource = await prisma.eventResource.update({
      where: { id: resourceId },
      data: {
        ...(body.data.name && { name: body.data.name }),
        ...(body.data.description !== undefined && { description: body.data.description }),
        ...(body.data.type && { type: body.data.type }),
        ...(body.data.content !== undefined && { content: body.data.content as Prisma.InputJsonValue }),
        ...(body.data.quantity !== undefined && { quantity: body.data.quantity }),
      },
    });

    const { hmacSecret: _, ...safeResource } = resource;
    return reply.send({ resource: safeResource });
  });

  // ── DELETE /api/events/:eventId/resources/:resourceId ──
  app.delete("/:eventId/resources/:resourceId", async (request, reply) => {
    const { resourceId } = request.params as { eventId: string; resourceId: string };

    await prisma.eventResource.update({
      where: { id: resourceId },
      data: { active: false },
    });

    return reply.send({ success: true });
  });

  // ── POST /api/events/:eventId/resources/bulk-excel ──────
  // Accepts multipart Excel file; parses rows as resources; creates all + generates QRs
  app.post("/:eventId/resources/bulk-excel", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };

    // Dynamically import xlsx to avoid loading it unless needed
    const xlsx = await import("xlsx");

    const data = await (request as any).file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    let rows: any[];
    try {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0]!;
      const sheet = workbook.Sheets[sheetName]!;
      rows = xlsx.utils.sheet_to_json(sheet);
    } catch {
      return reply.status(400).send({ error: "Invalid Excel file" });
    }

    if (!rows.length) {
      return reply.status(400).send({ error: "Excel file is empty" });
    }

    const createdResources = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row.name || row.resourceName || "").trim();
      const type = String(row.type || "ITEM").trim();
      const quantity = parseInt(String(row.quantity || "1"), 10) || 1;
      const description = row.description ? String(row.description).trim() : undefined;

      if (!name) {
        errors.push({ row: i + 2, error: "name/resourceName is required" });
        continue;
      }

      try {
        const hmacSecret = generateHmacSecret();
        const resource = await prisma.eventResource.create({
          data: { eventId, name, type, description, quantity, hmacSecret },
        });
        const { hmacSecret: _s, ...safe } = resource;
        createdResources.push(safe);
      } catch (err: any) {
        errors.push({ row: i + 2, name, error: err.message });
      }
    }

    return reply.send({
      success: true,
      created: createdResources.length,
      resources: createdResources,
      errors,
    });
  });

  // ── POST /api/events/:eventId/resources/:resourceId/generate-qr ──
  // Generate the single secure QR token for this resource (shared across all teams)
  app.post("/:eventId/resources/:resourceId/generate-qr", async (request, reply) => {
    const { eventId, resourceId } = request.params as { eventId: string; resourceId: string };

    const resource = await prisma.eventResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return reply.status(404).send({ error: "Resource not found" });
    }

    let hmacSecretValue = resource.hmacSecret;
    if (!hmacSecretValue) {
      hmacSecretValue = generateHmacSecret();
      await prisma.eventResource.update({
        where: { id: resourceId },
        data: { hmacSecret: hmacSecretValue },
      });
    }

    const rawToken = buildResourceQrToken({
      resourceId: resource.id,
      eventId,
      hmacSecret: hmacSecretValue,
    });

    const qrEntry = {
      resourceId: resource.id,
      resourceName: resource.name,
      type: resource.type,
      quantity: resource.quantity,
      remaining: Math.max(0, resource.quantity - resource.quantityUsed),
      token: rawToken,
    };

    return reply.send({
      success: true,
      resourceName: resource.name,
      qr: qrEntry,
      tokens: [qrEntry],
      warning:
        "This single secure QR code is shared across all teams. HMAC-signed and tamper-proof.",
    });
  });

  // ── POST /api/events/:eventId/resources/generate-qrs-all ──
  // Generate 1 single secure QR token for EACH resource in the event
  app.post("/:eventId/resources/generate-qrs-all", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };

    const resources = await prisma.eventResource.findMany({
      where: { eventId, active: true },
    });

    if (resources.length === 0) {
      return reply.status(400).send({
        error: "Ensure you have resources created first.",
      });
    }

    const tokens = [];

    for (const resource of resources) {
      let hmacSecretValue = resource.hmacSecret;
      if (!hmacSecretValue) {
        hmacSecretValue = generateHmacSecret();
        await prisma.eventResource.update({
          where: { id: resource.id },
          data: { hmacSecret: hmacSecretValue },
        });
      }

      const rawToken = buildResourceQrToken({
        resourceId: resource.id,
        eventId,
        hmacSecret: hmacSecretValue,
      });

      tokens.push({
        resourceId: resource.id,
        resourceName: resource.name,
        type: resource.type,
        quantity: resource.quantity,
        remaining: Math.max(0, resource.quantity - resource.quantityUsed),
        token: rawToken,
      });
    }

    return reply.send({
      success: true,
      count: tokens.length,
      tokens,
    });
  });

  // ── GET /api/events/:eventId/resources/stats ────────────
  app.get("/:eventId/resources/stats", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };

    const resources = await prisma.eventResource.findMany({
      where: { eventId },
      include: {
        teamResources: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    const stats = resources.map(({ hmacSecret, teamResources, ...r }) => ({
      ...r,
      claimedBy: teamResources.map((tr) => ({
        teamId: tr.teamId,
        teamName: tr.team.name,
        unlockedAt: tr.unlockedAt,
      })),
      remaining: Math.max(0, r.quantity - r.quantityUsed),
    }));

    return reply.send({ stats });
  });
}
