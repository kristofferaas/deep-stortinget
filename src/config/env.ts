import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  CONVEX_DEPLOYMENT: z.string(),
  WORKOS_REDIRECT_URI: z.url(),
  WORKOS_API_KEY: z.string(),
  WORKOS_CLIENT_ID: z.string(),
  WORKOS_COOKIE_PASSWORD: z.string().min(32),
});

const clientEnvSchema = z.object({
  VITE_CONVEX_URL: z.url(),
  VITE_CONVEX_SITE_URL: z.url(),
});

// Validate server environment
export const serverEnv = serverEnvSchema.parse(process.env);

// Validate client environment
export const clientEnv = clientEnvSchema.parse(import.meta.env);
