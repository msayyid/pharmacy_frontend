// Public barrel for the API package — safe to import from server OR client.
//
// Intentionally does NOT re-export `createServerApiClient` (server-only) or
// `apiClient` (client-only). Consumers must import those from the explicit
// paths so Next.js can enforce the server/client boundary correctly:
//
//   import { createServerApiClient } from "@/lib/api/server"  // RSC, route handlers
//   import { apiClient }              from "@/lib/api/client"  // client components

export { ApiError, parseApiError } from "./errors"
export type { ProblemDetails, ProblemDetailsError } from "./errors"
export type * from "./types"
