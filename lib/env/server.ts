import "server-only"

import { z } from "zod"

// Server-only env. The `import "server-only"` directive at the top makes Next.js
// fail the build if this module is ever imported into a client component
// (rather than failing silently with an empty `process.env.API_URL` in the
// browser bundle).
//
// FRONTEND_BLUEPRINT §22.2: NEXT_PUBLIC_* is browser-safe; everything else
// stays server-side. Zod parses on import so a missing required value crashes
// app startup rather than producing a silent runtime null.

const ServerEnvSchema = z.object({
  API_URL: z.string().url(),
  SENTRY_DSN: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

export type ServerEnv = z.infer<typeof ServerEnvSchema>

export const serverEnv: ServerEnv = ServerEnvSchema.parse({
  API_URL: process.env.API_URL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  NODE_ENV: process.env.NODE_ENV,
})
