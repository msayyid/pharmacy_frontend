import { create } from "zustand"

import type { UserMe } from "@/lib/api/types"

// Auth store — minimal surface, server-component-safe (no `"use client"`).
//
// Hooks (`useAuthStore()`) consume it from client components only. Imperative
// reads (`useAuthStore.getState().accessToken`) work everywhere — the API
// client uses this pattern in `lib/api/client.ts`.
//
// Phase 5 fills in the OTP-verify + refresh-tokens flow:
//   1. OTP-verify success → POST /api/auth/set-tokens (HttpOnly cookie at
//      our origin) → useAuthStore.setTokens(accessToken, expiresIn).
//   2. 401 → lib/auth/refresh.ts single-flight → setTokens again with the
//      rotated pair.
//   3. Logout → POST /api/auth/logout → clear().

interface AuthState {
  accessToken: string | null
  /** Unix milliseconds. null when not set via setTokens (e.g., the legacy
   *  setAccessToken alias or an explicit clear). Phase 11 may use this for
   *  pre-emptive refresh ~60s before expiry. */
  tokenExpiresAt: number | null
  currentUser: UserMe | null

  /** Canonical Phase-5 setter. Stores the access token in memory and records
   *  its expiry for future pre-emptive-refresh logic. */
  setTokens: (accessToken: string, expiresInSeconds: number) => void
  /** Phase-3 alias kept for backward compatibility with existing call sites
   *  (api-client tests, ad-hoc setters). Sets `tokenExpiresAt` to null since
   *  we don't have an expiry. Prefer `setTokens` in new code. */
  setAccessToken: (token: string | null) => void
  setCurrentUser: (user: UserMe | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  tokenExpiresAt: null,
  currentUser: null,

  setTokens: (accessToken, expiresInSeconds) =>
    set({
      accessToken,
      tokenExpiresAt: Date.now() + expiresInSeconds * 1000,
    }),
  setAccessToken: (token) => set({ accessToken: token, tokenExpiresAt: null }),
  setCurrentUser: (user) => set({ currentUser: user }),
  clear: () => set({ accessToken: null, tokenExpiresAt: null, currentUser: null }),
}))
