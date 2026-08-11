import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  OAUTH_CALLBACK_URL: z.string().default("http://localhost:3001/api/auth"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  validatedEnv = parsed.data;
  return validatedEnv;
}

export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error("Environment not initialized. Call validateEnv() first.");
  }
  return validatedEnv;
}
