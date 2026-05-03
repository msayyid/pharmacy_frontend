import { z } from "zod"

// Client + server safe env. Next.js inlines `process.env.NEXT_PUBLIC_*` at
// build time as static strings, so reading each key explicitly is required —
// `process.env` itself is NOT a hydrated object in the browser bundle.
//
// FRONTEND_BLUEPRINT §22.2: every NEXT_PUBLIC_* the storefront consumes goes
// through this schema. Adding a new public env var = adding a field here +
// updating .env.example.

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["ru", "ky", "en"]).default("ru"),
  NEXT_PUBLIC_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
})

export type ClientEnv = z.infer<typeof ClientEnvSchema>

export const clientEnv: ClientEnv = ClientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
})
