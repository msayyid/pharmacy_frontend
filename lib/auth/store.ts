import { create } from "zustand"

import type { UserMe } from "@/lib/api/types"

// Auth store — minimal surface, server-component-safe (no `"use client"`).
//
// Hooks (`useAuthStore()`) consume it from client components only. Imperative
// reads (`useAuthStore.getState().accessToken`) work everywhere — the API
// client uses this pattern in `lib/api/client.ts`.
//
// TODO: Phase 5 — wire OTP-verify + refresh-tokens flow:
//   1. Hydrate `accessToken` + `currentUser` on mount via the
//      `/api/auth/refresh-tokens` route handler that reads the HttpOnly
//      `nookat_refresh` cookie and rotates the pair.
//   2. Persist nothing here (refresh stays in HttpOnly cookie; access token
//      lives in memory only — see CLAUDE.md sacred invariant 7).
//   3. On logout: call `clear()` plus `/api/auth/clear-tokens` to drop the
//      HttpOnly cookie at our origin.

interface AuthState {
  accessToken: string | null
  currentUser: UserMe | null
  setAccessToken: (token: string | null) => void
  setCurrentUser: (user: UserMe | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  currentUser: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setCurrentUser: (user) => set({ currentUser: user }),
  clear: () => set({ accessToken: null, currentUser: null }),
}))
