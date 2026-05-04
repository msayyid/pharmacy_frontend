#!/usr/bin/env node
// pnpm launch:check — automated grep gates for sacred-invariant compliance.
// Phase 12D. Six checks:
//
//   1. Brand discipline (literal "Nookat" only in allowed sources)
//   2. JSON-LD dangerouslySetInnerHTML scope (only lib/seo/jsonld.tsx)
//   3. Raw hex in component code (#xxxxxx in components/ + app/)
//   4. confirm() / alert() (sacred-invariant; use shadcn Dialog / AlertDialog)
//   5. PII pattern logging (console.log of phone/email/address shapes)
//   6. Sentry SDK is wired (instrumentation.ts + sentry.{server,edge}.config.ts)
//
// Each check returns ok | warn | fail.
// fail → exit 1. warn → reported but exit 0.
//
// Whitelists are tight on purpose; expand them deliberately, with a
// DECISION_LOG entry explaining why.

import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

let failures = 0
let warnings = 0

function check(label, runner) {
  process.stdout.write(`[launch:check] ${label} ... `)
  const result = runner()
  if (result.status === "ok") {
    process.stdout.write("✓\n")
  } else if (result.status === "warn") {
    process.stdout.write(`⚠ ${result.message ?? ""}\n`)
    warnings += 1
    if (result.detail) process.stdout.write(result.detail + "\n")
  } else {
    process.stdout.write(`✗ ${result.message ?? ""}\n`)
    failures += 1
    if (result.detail) process.stdout.write(result.detail + "\n")
  }
}

function grep(pattern, paths, opts = {}) {
  const flags = opts.extended ? "-rEn" : "-rn"
  const include = opts.include ? opts.include.map((p) => `--include='${p}'`).join(" ") : ""
  const exclude = (opts.exclude ?? []).map((p) => `--exclude-dir='${p}'`).join(" ")
  const cmd = `grep ${flags} ${include} ${exclude} '${pattern}' ${paths.join(" ")} 2>/dev/null || true`
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim()
  } catch {
    return ""
  }
}

// Helper: returns true if the rendered grep `line` (format
// "path:lineNo:content") is a comment-only line (`// ...`, ` * ...`,
// `/* ... */`). Comments are documentation, not runtime code; we don't
// want them flagged as brand-discipline violations.
function isCommentLine(line) {
  const content = line.split(":").slice(2).join(":")
  const trimmed = content.trim()
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  )
}

// ─── 1. Brand discipline ────────────────────────────────────────────────
// Literal "Nookat" / "Ноокат" are only allowed in:
//   - lib/brand.ts (the BRAND constant lives here)
//   - lib/seo/jsonld.tsx (PostalAddress city name — locale-conditional,
//     "Nookat"/"Ноокат" is the city, not the brand wordmark; using
//     BRAND.nameLocalized would conflate brand and city)
//   - messages/{ru,ky,en}.json (i18n values)
//   - public/brand/* (asset files)
//   - any *.md (docs reference the brand by name)
//   - tests (test fixtures may reference the brand)
//   - comment lines (filtered below)
check("brand discipline (no literal Nookat outside allowed sources)", () => {
  const raw = grep("Nookat", ["app/", "components/", "lib/", "i18n/"], {
    extended: true,
    include: ["*.ts", "*.tsx"],
  })
  const allowedFiles = new Set([
    "lib/brand.ts",
    "lib/seo/jsonld.tsx",
  ])
  const offenders = raw
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      // grep output: path:line:content
      const [filePath] = line.split(":")
      if (!filePath) return false
      // tests/ are allowed to reference the brand for fixtures
      if (filePath.startsWith("tests/")) return false
      if (allowedFiles.has(filePath)) return false
      // Comments are documentation, not runtime code.
      if (isCommentLine(line)) return false
      return true
    })
  if (offenders.length === 0) return { status: "ok" }
  return {
    status: "fail",
    message: `${offenders.length} offending lines`,
    detail: offenders.map((l) => `   ${l}`).join("\n"),
  }
})

// ─── 2. dangerouslySetInnerHTML scope ────────────────────────────────────
check("dangerouslySetInnerHTML scoped to lib/seo/jsonld.tsx", () => {
  const raw = grep("dangerouslySetInnerHTML", ["app/", "components/", "lib/"], {
    extended: true,
  })
  const offenders = raw
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      const [filePath] = line.split(":")
      return filePath !== "lib/seo/jsonld.tsx"
    })
  if (offenders.length === 0) return { status: "ok" }
  return {
    status: "fail",
    message: `${offenders.length} offending lines`,
    detail: offenders.map((l) => `   ${l}`).join("\n"),
  }
})

// ─── 3. Raw hex colors in components ─────────────────────────────────────
// We use design tokens. Raw hex in components is a token leak. CSS files
// (globals.css) and SVG fixtures are exempt. Allow `#fff` / `#000` /
// `#XXXXXX` only in: tests, lib/seo/jsonld.tsx (URLs in JSON-LD), 8-digit
// alpha-hex `#xxxxxxxx` (Tailwind 4 alpha syntax).
check("no raw hex in component code (DESIGN §21.1 token discipline)", () => {
  const raw = grep("#[0-9a-fA-F]{6}", ["app/", "components/"], {
    extended: true,
    include: ["*.tsx", "*.ts"],
    exclude: ["__snapshots__"],
  })
  const offenders = raw
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      const [filePath] = line.split(":")
      if (!filePath) return false
      // Tests legitimately use hex literals as fixtures.
      if (filePath.startsWith("tests/")) return false
      // global-error.tsx is an intentional exception (no provider context;
      // bare-HTML fallback uses inline styles to avoid Tailwind dependency).
      if (filePath === "app/global-error.tsx") return false
      // Filter out URLs (https://github.com/something#abc123 isn't a hex
      // color). The pattern matches if # is preceded by space/=/quote
      // and not by an alphanum.
      const content = line.split(":").slice(2).join(":")
      // Heuristic: skip lines where the # is in a URL or comment-link.
      if (/https?:\/\/[^\s]*#[0-9a-fA-F]{6}/.test(content)) return false
      return true
    })
  if (offenders.length === 0) return { status: "ok" }
  return {
    status: "fail",
    message: `${offenders.length} offending lines`,
    detail: offenders.map((l) => `   ${l}`).join("\n"),
  }
})

// ─── 4. No confirm() / alert() ────────────────────────────────────────────
check("no native confirm() / alert() (use shadcn Dialog / AlertDialog)", () => {
  const raw = grep("\\b(window\\.)?(confirm|alert)\\(", ["app/", "components/", "lib/"], {
    extended: true,
    include: ["*.tsx", "*.ts"],
  })
  const offenders = raw
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      // `aria-alert` and "alert" in CSS class names / strings are OK.
      // The grep pattern requires `(` after, so `alert(` is what we catch.
      const [filePath] = line.split(":")
      if (!filePath) return false
      if (filePath.startsWith("tests/")) return false
      // Comments are documentation, not runtime code.
      if (isCommentLine(line)) return false
      const content = line.split(":").slice(2).join(":")
      // Allow `<Alert />` JSX and string literals containing "alert".
      if (/<\s*Alert/.test(content)) return false
      return true
    })
  if (offenders.length === 0) return { status: "ok" }
  return {
    status: "fail",
    message: `${offenders.length} offending lines`,
    detail: offenders.map((l) => `   ${l}`).join("\n"),
  }
})

// ─── 5. PII pattern logging ──────────────────────────────────────────────
// Heuristic: console.log/warn/error with explicit phone/email/address keys.
// Misses: indirect logging via a variable. Catches: most accidental
// console.log({ phone, email }) shapes.
check("no console.log of PII fields (sacred-invariant #8)", () => {
  const raw = grep(
    "console\\.(log|warn|error|info|debug).*\\b(phone|email|address|recipient_phone)\\b",
    ["app/", "components/", "lib/"],
    { extended: true, include: ["*.tsx", "*.ts"] },
  )
  const offenders = raw
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      const [filePath] = line.split(":")
      if (!filePath) return false
      if (filePath.startsWith("tests/")) return false
      // lib/observability/scrub.ts intentionally references these field
      // names in its regex.
      if (filePath === "lib/observability/scrub.ts") return false
      return true
    })
  if (offenders.length === 0) return { status: "ok" }
  return {
    status: "fail",
    message: `${offenders.length} offending lines`,
    detail: offenders.map((l) => `   ${l}`).join("\n"),
  }
})

// ─── 6. Sentry wiring exists ──────────────────────────────────────────────
check("Sentry SDK config files are present", () => {
  const required = [
    "instrumentation.ts",
    "instrumentation-client.ts",
    "sentry.server.config.ts",
    "sentry.edge.config.ts",
  ]
  const missing = required.filter((f) => !existsSync(resolve(ROOT, f)))
  if (missing.length === 0) return { status: "ok" }
  return {
    status: "fail",
    message: `missing files: ${missing.join(", ")}`,
  }
})

console.log("")
if (failures > 0) {
  console.error(`[launch:check] ✗ ${failures} failure(s), ${warnings} warning(s)`)
  process.exit(1)
}
console.log(`[launch:check] ✓ all gates green${warnings > 0 ? ` (${warnings} warning(s))` : ""}`)
