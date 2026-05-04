import { expect, test } from "@playwright/test"

// Phase 12C smoke. Verifies the deployed container is up and healthy.
// `/api/health` is the same endpoint Coolify's healthcheck hits — if this
// returns non-200, Coolify's been lying about deployment success.

test("/api/health returns 200 with status ok", async ({ request }) => {
  const res = await request.get("/api/health")
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.status).toBe("ok")
  // version + git sha exposed when Phase 12E lands the change. Ignore for
  // now if absent (forward-compat assertion only).
  if (body.version) {
    expect(typeof body.version).toBe("string")
  }
})
