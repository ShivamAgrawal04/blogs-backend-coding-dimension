import { z } from "zod";
import { resolveDbProvider } from "@/database/provider";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DB_PROVIDER: z.enum(["postgres", "mongodb"]).default("postgres"),
  DATABASE_URL: z.string().default(""),
  MONGODB_URI: z.string().default(""),
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
  PCLOUD_CLIENT_ID: z.string().optional().default(""),
  PCLOUD_CLIENT_SECRET: z.string().optional().default(""),
  PCLOUD_ACCESS_TOKEN: z.string().optional().default(""),
  PCLOUD_API_HOST: z.string().optional().default("api.pcloud.com"),
  PCLOUD_REDIRECT_URI: z
    .string()
    .optional()
    .default("http://localhost:3001/api/uploads/pcloud/callback"),
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

  const hasPostgres = Boolean(parsed.data.DATABASE_URL.trim());
  const hasMongo = Boolean(parsed.data.MONGODB_URI.trim());
  if (!hasPostgres && !hasMongo) {
    console.error("Set at least one of DATABASE_URL or MONGODB_URI");
    process.exit(1);
  }

  // Prefer settings file / DB_PROVIDER, but fall back if that URI is missing
  const preferred = resolveDbProvider();
  if (preferred === "postgres" && !hasPostgres && hasMongo) {
    console.warn(
      `Preferred provider is postgres but DATABASE_URL is empty — starting with mongodb available for admin switch.`,
    );
  }
  if (preferred === "mongodb" && !hasMongo && hasPostgres) {
    console.warn(
      `Preferred provider is mongodb but MONGODB_URI is empty — starting with postgres available for admin switch.`,
    );
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
