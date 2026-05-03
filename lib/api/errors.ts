// FE-side mirror of the backend's RFC 7807 ProblemDetails contract.
//
// Backend (verified at app/api/errors.py) emits:
//   {
//     "type": "about:blank#<code>",
//     "title": "...",
//     "status": <int>,
//     "code": "<machine-readable>",
//     "detail": "...",
//     "context": {...},   // optional, per error
//     "errors": [...],    // present on 422 RequestValidationError only
//   }
//
// And echoes the request's `X-Request-ID` header on every response (set by the
// outermost RequestIdMiddleware in app/main.py). We capture it here so error
// surfaces can render `[<code>]` + offer support a stable trace identifier.
//
// PER PHASE 3 SCOPE: `code` stays a plain string. We do NOT enumerate the 70+
// codes catalogued in MASTER_PLAN.md §2.6 as a TypeScript union here.
// Phase 4 maps `error.${code}` → translated strings via i18n; Phase 3 just
// preserves the field opaquely.

export interface ProblemDetailsError {
  loc: ReadonlyArray<string | number>
  msg: string
  type: string
  ctx?: Record<string, string>
}

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
  context?: Record<string, unknown>
  errors?: ProblemDetailsError[]
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly context: Record<string, unknown>
  readonly requestId: string | undefined
  readonly errors: ProblemDetailsError[] | undefined

  constructor(init: {
    code: string
    status: number
    context?: Record<string, unknown>
    requestId?: string | undefined
    errors?: ProblemDetailsError[] | undefined
  }) {
    super(`[${init.status}] ${init.code}`)
    this.name = "ApiError"
    this.code = init.code
    this.status = init.status
    this.context = init.context ?? {}
    this.requestId = init.requestId
    this.errors = init.errors
  }
}

/**
 * Parses a non-2xx Response into an `ApiError`. Resilient to:
 *   - non-JSON bodies (5xx HTML pages, network proxy errors)
 *   - empty bodies (204 / 502 / 504 with no payload)
 *   - JSON without ProblemDetails fields (returns `unknown_error` + status)
 * Always preserves the HTTP status and the `X-Request-ID` echo header for
 * trace correlation, even if the body parse fails.
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  let body: ProblemDetails | null = null

  try {
    const text = await response.text()
    if (text.length > 0) {
      body = JSON.parse(text) as ProblemDetails
    }
  } catch {
    // Non-JSON or malformed JSON body — leave `body` as null and fall back
    // to status-based fields below.
  }

  const requestId = response.headers.get("x-request-id") ?? undefined

  return new ApiError({
    code: body?.code ?? "unknown_error",
    status: typeof body?.status === "number" ? body.status : response.status,
    context: body?.context ?? {},
    requestId,
    errors: body?.errors,
  })
}
