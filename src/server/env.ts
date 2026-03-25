import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL obrigatoria para executar o sistema com PostgreSQL."),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET obrigatoria e deve ter pelo menos 16 caracteres."),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  PLATFORM_ADMIN_EMAILS: z.string().optional(),
  APP_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  ATTACHMENTS_ROOT_DIR: z.string().optional(),
  INTERNAL_CRON_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
  PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS,
  APP_URL: process.env.APP_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  ATTACHMENTS_ROOT_DIR: process.env.ATTACHMENTS_ROOT_DIR,
  INTERNAL_CRON_SECRET: process.env.INTERNAL_CRON_SECRET,
});
