import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { _resetInFlightForTesting, refreshAccessToken } from "@/lib/auth/refresh"
import { useAuthStore } from "@/lib/auth/store"

const originalFetch = globalThis.fetch

describe("refreshAccessToken", () => {
  beforeEach(() => {
    _resetInFlightForTesting()
    useAuthStore.getState().clear()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
    _resetInFlightForTesting()
    useAuthStore.getState().clear()
  })

  it("on 200 response: stores tokens via setTokens and returns the access token", async () => {
    const fetchMock = vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ access_token: "fresh-access", expires_in: 900 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    )
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const token = await refreshAccessToken()
    expect(token).toBe("fresh-access")
    expect(useAuthStore.getState().accessToken).toBe("fresh-access")
    expect(useAuthStore.getState().tokenExpiresAt).toBeGreaterThan(Date.now())
  })

  it("on 401 response: clears the auth store and returns null", async () => {
    const fetchMock = vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ error: "refresh_failed" }), { status: 401 }),
    )
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    useAuthStore.getState().setTokens("old-access", 900)

    const token = await refreshAccessToken()
    expect(token).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it("on network failure: clears the auth store and returns null (no throw)", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down")
    })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    useAuthStore.getState().setTokens("old-access", 900)

    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it("single-flight: 5 concurrent calls share ONE network round-trip", async () => {
    const fetchMock = vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ access_token: "shared-access", expires_in: 900 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    )
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const results = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results).toEqual([
      "shared-access",
      "shared-access",
      "shared-access",
      "shared-access",
      "shared-access",
    ])
  })

  it("after a refresh completes, a new call kicks off a new round-trip", async () => {
    let callCount = 0
    const fetchMock = vi.fn(async (): Promise<Response> => {
      callCount += 1
      return new Response(JSON.stringify({ access_token: `token-${callCount}`, expires_in: 900 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const first = await refreshAccessToken()
    const second = await refreshAccessToken()
    expect(first).toBe("token-1")
    expect(second).toBe("token-2")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("posts to /api/auth/refresh-tokens with credentials: same-origin", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        new Response(JSON.stringify({ access_token: "x", expires_in: 900 }), { status: 200 }),
    )
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    await refreshAccessToken()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    expect(call).toBeDefined()
    const [url, init] = call!
    expect(url).toBe("/api/auth/refresh-tokens")
    expect(init?.method).toBe("POST")
    expect(init?.credentials).toBe("same-origin")
  })
})
