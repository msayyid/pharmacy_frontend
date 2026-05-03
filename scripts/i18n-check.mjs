#!/usr/bin/env node
// pnpm i18n:check — assert every key exists in all three locale files
// (per Q-9 in MASTER_PLAN.md: all three locales fully populated at MVP).
//
// Exits 0 on parity, 1 on drift. CI runs this as a job; the discipline
// recipe is: any new key gets added to all three locales in the same
// commit. Backend-mirrored keys must match the backend's value verbatim
// (the dotted-flat shape in messages/<lang>.json mirrors the backend's
// app/i18n/<lang>.json key shape exactly so backend error codes pass
// through to t(`error.${code}`) without translation drift).

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = resolve(__dirname, "..", "messages")
const LOCALES = ["ru", "ky", "en"]

function loadKeys(locale) {
  const path = resolve(MESSAGES_DIR, `${locale}.json`)
  const raw = readFileSync(path, "utf-8")
  return new Set(Object.keys(JSON.parse(raw)))
}

function missingFrom(target, source) {
  const missing = []
  for (const key of source) {
    if (!target.has(key)) missing.push(key)
  }
  return missing.sort()
}

const sets = Object.fromEntries(LOCALES.map((l) => [l, loadKeys(l)]))
const allKeys = new Set()
for (const set of Object.values(sets)) {
  for (const key of set) allKeys.add(key)
}

let drift = false
for (const locale of LOCALES) {
  const missing = missingFrom(sets[locale], allKeys)
  if (missing.length > 0) {
    drift = true
    console.error(`\n[i18n:check] messages/${locale}.json is missing ${missing.length} key(s):`)
    for (const key of missing) console.error(`  - ${key}`)
  }
}

if (drift) {
  console.error("\nFix: add the missing keys to the locale file(s) above + commit together.")
  console.error(
    "Backend-mirrored keys (auth.*, cart.*, checkout.*, error.*, order.*, product.*, search.*)",
  )
  console.error(
    "must match the backend value verbatim. FE-only keys live under ui.* / brand.* and may be",
  )
  console.error("seeded for KY/EN with a pre-launch human-review backlog item.\n")
  process.exit(1)
}

const counts = LOCALES.map((l) => `${l}=${sets[l].size}`).join(", ")
console.log(
  `[i18n:check] ✓ All three locales have parity (${counts}; total unique = ${allKeys.size}).`,
)
process.exit(0)
