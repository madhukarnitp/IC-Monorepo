import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import { env } from "./env";
import { registerRoutes } from "./routes";

export function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
    trustProxy: true,
  });

  app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.NODE_ENV !== "production") {
        return cb(null, true);
      }
      const allowed = Array.isArray(env.CORS_ORIGIN)
        ? env.CORS_ORIGIN
        : String(env.CORS_ORIGIN || "").split(",").map((s: string) => s.trim());
      cb(null, allowed.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  });

  app.register(fastifyCookie);

  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: "auth_token", signed: false },
  });

  app.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  // Global registration only - `global: false` means no route is limited
  // unless it opts in via `{ config: { rateLimit: {...} } }`.
  app.register(fastifyRateLimit, { global: false });

  // Global Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    // Standard fastify-handled errors (e.g., validation, rate limit)
    if (error?.statusCode) {
      return reply.status(error.statusCode).send(error);
    }
    
    // Log unexpected exceptions
    app.log.error(error);
    
    // Obfuscate stack trace and normalize JSON response
    return reply.status(500).send({ 
      error: "Internal Server Error" 
    });
  });

  registerRoutes(app);

  return app;
}
