import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/component/**/*.test.{ts,tsx}"],
    css: false,
    // Inject env defaults BEFORE module imports run so Zod validation in
    // lib/env/{server,client}.ts doesn't crash the test runner. CI has no
    // .env.local, neither does a fresh local checkout — these defaults give
    // the schema enough to parse without leaking real secrets into tests.
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NEXT_PUBLIC_DEFAULT_LOCALE: "ru",
      NEXT_PUBLIC_ENV: "test",
      API_URL: "http://localhost:8000",
      NODE_ENV: "test",
    },
  },
})
