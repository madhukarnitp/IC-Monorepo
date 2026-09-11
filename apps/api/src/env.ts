import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string({ error: "DATABASE_URL is required" }),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .transform((p) => p?.trim() || undefined),
  REDIS_DB: z.coerce.number().default(1), // BullMQ queues
  CACHE_REDIS_DB: z.coerce.number().default(2), // API cache (future)
  SOCKET_REDIS_DB: z.coerce.number().default(3), // Socket.io adapter (future)
  JWT_SECRET: z.string({ error: "JWT_SECRET is required" }).min(32),
  BETTER_AUTH_SECRET: z
    .string({ error: "BETTER_AUTH_SECRET is required" })
    .min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string({
    error: "GOOGLE_CLIENT_ID is required for admin Google sign-in",
  }),
  GOOGLE_CLIENT_SECRET: z.string({
    error: "GOOGLE_CLIENT_SECRET is required for admin Google sign-in",
  }),
  GOOGLE_ALLOWED_DOMAINS: z.string().default("nitp.ac.in"),
  CORS_ORIGIN: z
    .string()
    .transform((s) =>
      s
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  AISENSY_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string({
    error: "GEMINI_API_KEY is required for the chat feature",
  }),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  /* Contact form - SMTP (all optional; skips email if not configured) */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Incubation Center Website <smtpapi@incubationcenter.nitp.ac.in>"),
  CONTACT_EMAIL_TO: z.string().default("incubationcenter@nitp.ac.in"),
  /* Contact form - ERP lead push (all optional; skips ERP if not configured) */
  ERP_API_URL: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().url().optional()),
  ERP_API_KEY: z.string().optional(),
  /* Web app on-demand revalidation webhook (both optional; skips the call if
   * either is unset - the Redis cache invalidation above still runs either
   * way, only the web app's own Next.js ISR/fetch cache would stay stale) */
  WEB_REVALIDATE_URL: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().url().optional()),
  WEB_REVALIDATE_SECRET: z.string().optional(),
  /* S3 - careers file uploads (required - core to the careers feature) */
  AWS_ACCESS_KEY_ID: z.string({ error: "AWS_ACCESS_KEY_ID is required" }),
  AWS_SECRET_ACCESS_KEY: z.string({
    error: "AWS_SECRET_ACCESS_KEY is required",
  }),
  AWS_REGION: z.string({ error: "AWS_REGION is required" }),
  AWS_BUCKET_NAME: z.string({ error: "AWS_BUCKET_NAME is required" }),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
