import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/errors"
import { createBrowserApiClient } from "@/lib/api/client"
import * as refreshModule from "@/lib/auth/refresh"
import { useAuthStore } from "@/lib/auth/store"

// Helpers --------------------------------------------------------------

const BASE_URL = "http://test.local"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "echoed-id" },
  })
}

function problemDetailsResponse(code: string, status: number): Response {
  return new Response(JSON.stringify({ type: `about:blank#${code}`, status, code, title: "err" }), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "err-trace-id" },
  })
}

// Tests ----------------------------------------------------------------

describe("createBrowserApiClient", () => {
  beforeEach(() => {
    useAuthStore.getState().clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().clear()
  })

  it("attaches Authorization: Bearer <token> when access token is set", async () => {
    useAuthStore.getState().setAccessToken("token-abc")
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        jsonResponse({ ok: true }),
    )
    const client = createBrowserApiClient({ baseUrl: BASE_URL, fetch: fetchMock })

    await client.GET("/api/v1/me" as never)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const sent = fetchMock.mock.calls[0]?.[0] as Request
    expect(sent.headers.get("authorization")).toBe("Bearer token-abc")
  })

  it("does NOT attach Authorization on /api/v1/auth/* endpoints", async () => {
    useAuthStore.getState().setAccessToken("token-abc")
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        jsonResponse({ sent: true }),
    )
    const client = createBrowserApiClient({ baseUrl: BASE_URL, fetch: fetchMock })

    await client.POST(
      "/api/v1/auth/otp/request" as never,
      {
        body: { phone: "+996700123456" },
      } as never,
    )

    const sent = fetchMock.mock.calls[0]?.[0] as Request
    expect(sent.headers.get("authorization")).toBeNull()
  })

  it("stamps a UUID X-Request-ID header on every call", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        jsonResponse({ ok: true }),
    )
    const client = createBrowserApiClient({ baseUrl: BASE_URL, fetch: fetchMock })

    await client.GET("/api/v1/categories" as never)

    const sent = fetchMock.mock.calls[0]?.[0] as Request
    const requestId = sent.headers.get("x-request-id")
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it("throws ApiError on non-2xx with the parsed code/status/requestId", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        problemDetailsResponse("category_not_found", 404),
    )
    const client = createBrowserApiClient({ baseUrl: BASE_URL, fetch: fetchMock })

    await expect(
      client.GET(
        "/api/v1/categories/{slug}" as never,
        {
          params: { path: { slug: "missing" } },
        } as never,
      ),
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "category_not_found",
      status: 404,
      requestId: "err-trace-id",
    })
  })

  it("attempts refresh on 401 (Phase 3 stub returns null → throws ApiError)", async () => {
    const refreshSpy = vi.spyOn(refreshModule, "refreshAccessToken").mockResolvedValue(null)
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        problemDetailsResponse("invalid_token", 401),
    )
    const client = createBrowserApiClient({ baseUrl: BASE_URL, fetch: fetchMock })

    await expect(client.GET("/api/v1/me" as never)).rejects.toBeInstanceOf(ApiError)

    expect(refreshSpy).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1) // no retry because refresh returned null
  })

  it("does NOT attempt refresh on 401 from /api/v1/auth/* (would loop)", async () => {
    const refreshSpy = vi.spyOn(refreshModule, "refreshAccessToken").mockResolvedValue(null)
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        problemDetailsResponse("not_found_or_expired", 401),
    )
    const client = createBrowserApiClient({ baseUrl: BASE_URL, fetch: fetchMock })

    await expect(
      client.POST(
        "/api/v1/auth/otp/verify" as never,
        {
          body: { phone: "+996700123456", code: "1234" },
        } as never,
      ),
    ).rejects.toBeInstanceOf(ApiError)

    expect(refreshSpy).not.toHaveBeenCalled()
  })

  it("retries with the new token when refresh returns a fresh access token (Phase 5 readiness)", async () => {
    vi.spyOn(refreshModule, "refreshAccessToken").mockResolvedValue("fresh-token")
    const fetchMock = vi
      .fn(
        async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
          jsonResponse({ id: "user-1" }),
      )
      .mockResolvedValueOnce(problemDetailsResponse("invalid_token", 401))
      .mockResolvedValueOnce(jsonResponse({ id: "user-1" }))
    const client = createBrowserApiClient({ baseUrl: BASE_URL, fetch: fetchMock })

    const result = await client.GET("/api/v1/me" as never)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const retryRequest = fetchMock.mock.calls[1]?.[0] as Request
    expect(retryRequest.headers.get("authorization")).toBe("Bearer fresh-token")
    expect((result as { data?: unknown }).data).toEqual({ id: "user-1" })
  })
})
