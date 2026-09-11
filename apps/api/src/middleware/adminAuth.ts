import type { FastifyRequest, FastifyReply } from "fastify";
import { roleService } from "../rbac";

/**
 * Middleware that requires the authenticated user to have an ADMIN role.
 * Must be used AFTER requireAuth (which sets request.user).
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;

  if (!user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  // Use the centralized RBAC service
  const roles = await roleService.getUserRoles(user.id);

  const isAdmin = roles.some((role) => {
    const norm = (role.name || "").toUpperCase().replace(/\s+/g, "_");
    return ["ADMIN", "SUPER_ADMIN", "EVENT_ADMIN"].includes(norm);
  });

  if (!isAdmin) {
    return reply.status(403).send({ error: "Forbidden: Admin access required" });
  }
}
