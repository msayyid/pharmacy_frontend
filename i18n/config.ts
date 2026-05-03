// Three-locale config for next-intl. RU is the canonical default per
// PRODUCT_BLUEPRINT §16.1; backend's app/core/i18n.py also defaults to "ru".
// Locale URL strategy is prefix-all (`/ru/...`, `/ky/...`, `/en/...`) per
// FRONTEND_CLAUDE_CODE_PROMPTS §4.3 (D1 in the Phase 4 plan).

export const locales = ["ru", "ky", "en"] as const
export const defaultLocale = "ru" as const

export type Locale = (typeof locales)[number]
