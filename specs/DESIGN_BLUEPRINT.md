# Nookat — Design Blueprint

> **Purpose.** The visual and interaction specification for Nookat's web frontends. Defines design tokens (color, type, spacing, motion), component patterns, photography strategy, and the brand voice. This document is what makes the difference between "a pharmacy website" and "a pharmacy website you'd trust your mother to use."
>
> **Companion docs.** Lives alongside `FRONTEND_BLUEPRINT.md` (architecture, code, data) and `FRONTEND_CLAUDE_CODE_PROMPTS.md` (phased build prompts). When the two disagree: **design wins on visual & interaction behaviour, frontend wins on implementation**.
>
> **Brand.** Nookat (Ноокат) — pharmacy based in Nookat, Osh region, Kyrgyzstan.
>
> **Author voice.** Senior product designer who has built health products and respects the weight that "is this medicine real and safe?" carries with a customer.

---

## Table of Contents

1. [Brand foundation](#1-brand-foundation)
2. [Design principles](#2-design-principles)
3. [Visual reference: who we look like](#3-visual-reference-who-we-look-like)
4. [Color system](#4-color-system)
5. [Typography](#5-typography)
6. [Spacing, layout, and grid](#6-spacing-layout-and-grid)
7. [Iconography](#7-iconography)
8. [Photography & imagery](#8-photography--imagery)
9. [Elevation, borders, and surfaces](#9-elevation-borders-and-surfaces)
10. [Motion and microinteractions](#10-motion-and-microinteractions)
11. [Component library](#11-component-library)
12. [Page-level patterns](#12-page-level-patterns)
13. [Forms, inputs, and validation](#13-forms-inputs-and-validation)
14. [Empty, loading, and error states](#14-empty-loading-and-error-states)
15. [Trust signals and microcopy](#15-trust-signals-and-microcopy)
16. [Accessibility](#16-accessibility)
17. [Voice and tone](#17-voice-and-tone)
18. [Localization specifics (RU / KY / EN)](#18-localization-specifics-ru--ky--en)
19. [Admin design language](#19-admin-design-language)
20. [Brand-rename protocol](#20-brand-rename-protocol)
21. [Conventions checklist](#21-conventions-checklist)

---

## 1. Brand foundation

### 1.1 Who Nookat is

Nookat is a pharmacy in **Nookat, Osh region** — small-town Kyrgyzstan, far from the Bishkek polish. The brand isn't a flashy startup. It's the local pharmacy your aunt has trusted for years, now with a website. That's the source of authority we lean on.

This shapes every visual decision:

- **Calm, not loud.** A loud pharmacy looks like a kiosk. We're closer to a clinic.
- **Warm, not corporate.** International chains feel imported. Our customers want to feel known.
- **Modern, not stark.** Older customers (Aizhana, Gulnara from PRODUCT §4) need clear text and obvious next steps. Younger ones (Bekzat) want it to feel current.
- **Locally rooted, not gimmicky.** Subtle nods to place — never costume Kyrgyz visual culture.

### 1.2 Brand expression in three words

**Calm. Clear. Cared-for.**

Every screen and component should be checkable against these. If a screen feels noisy, it isn't calm. If a label could be simpler, it isn't clear. If the empty state shrugs at the user, it isn't cared-for.

### 1.3 Brand name treatment

In Russian/Kyrgyz interfaces, the wordmark reads **Ноокат**. In English, **Nookat**. Both spellings are valid; never mix scripts in a single token (don't write "Nоокат"). The language of the surrounding UI determines which form is used.

In all caps the wordmark reads **NOOKAT** / **НООКАТ** with even letterspacing — but caps appear sparingly (only in the logotype itself, never in body copy headings).

> **One name, one constant.** The brand name lives in exactly one place in code: `lib/brand.ts`. Every header, footer, email signature, and meta tag pulls from there. See §20 for the full rename protocol.

### 1.4 Tagline (Russian primary)

> **«Аптека, которой доверяют»** — "The pharmacy people trust."

Short, calm, confident without bragging. Used in hero treatments and email signatures, not on every page. KY: «Ишеничтүү аптека». EN: "The pharmacy people trust."

### 1.5 Logo

For development we use a **placeholder wordmark** generated as part of Phase 0. The real logo arrives later and swaps with one file change.

Placeholder spec:

- Wordmark "Nookat" in DM Serif Display Regular, slight tracking
- Mark: a tilted pill (capsule) silhouette in primary blue, sized 0.85× of cap height, sitting to the left of the wordmark with a 0.5× cap-height gap
- Two locked variants:
  - `logo-horizontal.svg` — mark + wordmark inline (header default)
  - `logo-mark.svg` — mark only (favicons, mobile nav, app icons)
- Two color treatments:
  - `logo-primary.svg` — primary blue on transparent
  - `logo-mono.svg` — single-color, ink (for backgrounds and prints)

Spacing rule: clear-space around the logo equal to the cap height of the wordmark on every side. Never compress, recolor outside the palette, or place on busy photography.

---

## 2. Design principles

These are the rulers we hold every screen up against.

### 2.1 Stock truth shows on every product

If a thing is in stock, say so plainly. If it isn't, say that plainly too — and immediately offer alternatives. We never hide stock, never use the word "limited," and never fake urgency. (PRODUCT §3.3: no "only 2 left" UX.)

### 2.2 The next step is always obvious

Every screen has one primary action. Secondary actions exist but defer visually. The customer should never wonder "what now?"

### 2.3 Mobile is not a smaller desktop

Layouts are designed phone-first. The header, search, cart, and primary CTA are reachable with one thumb on a 6-inch screen. Desktop is an enhancement of the mobile layout, not the other way around.

### 2.4 Real data, never lorem

Every component preview, every empty state placeholder, every demo screen uses real Bishkek-shaped data: real Cyrillic medicine names, real KG addresses, real `+996` phone numbers, real `сом` prices. Lorem ipsum hides bugs that real data exposes (Cyrillic kerning, length, ngram search behaviour).

### 2.5 Native components first

Use the platform's native primitives — system date pickers, native `<select>` on mobile, native `confirm()` for irreversible destructive actions where a custom dialog is overkill. Custom only when native genuinely can't do it.

### 2.6 Loading states are first-class

A skeleton without a real data path is a bug. Every shimmer / spinner / skeleton must be wired to actual data and tested in slow-network mode (3G throttle in DevTools).

### 2.7 Trust is built in microcopy

Customers don't read terms. They read button labels, error messages, and the line under the price. Get those right and the rest follows.

### 2.8 The pharmacist's white coat — digitally

The visual equivalents of professionalism in a real pharmacy: clear lighting (negative space), legible signage (typography), a calm voice (color saturation kept low), real products on shelves (real product photography where possible), and the pharmacist visible (customer support phone always one tap away).

---

## 3. Visual reference: who we look like

Nookat draws from three reference families:

### 3.1 Pharmacy clarity — Boots, NHS, Apoteket

What we take: generous whitespace, calm sans-serif, single primary color (blue), product-first card layouts, clear stock and dosage labels.

What we leave: state-bureaucratic feel (NHS is too cold for a small-town pharmacy), brand-led "Boots" red accents (we're not a chain).

### 3.2 Modern medical UX — One Medical, Hims, Eucerin

What we take: warmer-than-clinical photography direction, friendly transactional copy ("Your order is on its way"), generous type sizes for accessibility, soft rounded corners that don't feel sterile.

What we leave: telemedicine vibe — we are explicitly not selling consultations. No friendly stock photos of "doctors at laptops."

### 3.3 E-commerce conversion — Wildberries, Ozon, Amazon Pharmacy

What we take: dense product grids, prominent search, fast filters, sticky bottom CTAs on mobile, quick-buy patterns, clear delivery timing on cards.

What we leave: visual noise (countdowns, badges, marketing chrome). We adopt the *structure* of e-commerce, not the *theatre*.

### 3.4 What we deliberately don't look like

- **Russian pharmacy aggregators (Apteka.ru, Eapteka)** — they're functional but visually cluttered with promo banners, manufacturer ads, and dense info layouts. Customers respect them but don't love them. We aim for "the calm one in the search results."
- **Generic startup pharmacies (Truepill, Medly)** — too tech-bro, too much gradient, too few real pharmacists in the brand.
- **Wellness brands (Goop, Heyday)** — we sell paracetamol, not crystals. Aspirational wellness photography is wrong for us.

---

## 4. Color system

### 4.1 Philosophy

The color system is **single-hue dominant with restrained accents**. Medical blue carries 90% of the visual weight; everything else is functional (success, warning, danger) or informational (warm neutrals for surfaces). Saturated colors mean something specific is happening. Calm color means the system is at rest.

### 4.2 Primary palette — Medical Blue

A blue that reads as "medicine" in CIS markets, slightly desaturated to feel current, slightly warm to avoid the institutional NHS cold.

| Token | Hex | Usage |
|---|---|---|
| `--brand-50` | `#EEF5FB` | Lightest tint — section background washes, hover backgrounds |
| `--brand-100` | `#D6E7F4` | Selected state subtle backgrounds, badges background |
| `--brand-200` | `#A6C8E5` | Decorative dividers, disabled-on-tint outlines |
| `--brand-300` | `#74A8D5` | Iconography on tinted surfaces |
| `--brand-400` | `#3F87C2` | Secondary buttons, link hover |
| `--brand-500` | `#1A6FB0` | **Primary brand color** — primary buttons, links, focused inputs |
| `--brand-600` | `#155E97` | Primary button hover, active links |
| `--brand-700` | `#114E7E` | Pressed states, large headings on tints |
| `--brand-800` | `#0D3D63` | Logotype on light backgrounds, dense data |
| `--brand-900` | `#0A2D49` | Highest-contrast text on white (rarely; use ink-900 instead) |

`--brand-500 = #1A6FB0`. Contrast ratio against `--surface-base #FFFFFF` is **5.07:1** — passes WCAG AA for normal text, AAA for large text.

### 4.3 Neutral palette — Warm Ink

Warm neutrals (yellow/brown undertone, never pure gray). Pure gray reads as "browser default," which our brand is not.

| Token | Hex | Usage |
|---|---|---|
| `--ink-950` | `#0F1115` | Highest emphasis text (rarely needed) |
| `--ink-900` | `#1A1D22` | Body text (default `<p>`) |
| `--ink-800` | `#2B3038` | Headings on white |
| `--ink-700` | `#404650` | Secondary headings |
| `--ink-600` | `#586068` | Secondary text, captions |
| `--ink-500` | `#7B8189` | Tertiary text, helper text |
| `--ink-400` | `#9DA3AA` | Disabled text, placeholder |
| `--ink-300` | `#C4C8CD` | Borders, dividers |
| `--ink-200` | `#E1E4E7` | Light dividers, table-row dividers |
| `--ink-100` | `#EFF1F3` | Surface raised, subtle backgrounds |
| `--ink-50`  | `#F7F8F9` | App background tint, cards on canvas |

### 4.4 Surface palette — Warm Whites

Pure white (`#FFFFFF`) is reserved for cards on tinted backgrounds. The default canvas is a 1% warmer white that reduces eye strain over long browsing sessions.

| Token | Hex | Usage |
|---|---|---|
| `--surface-base` | `#FAFBFC` | App canvas — html background |
| `--surface-card` | `#FFFFFF` | Cards, modals, raised surfaces on canvas |
| `--surface-sunken` | `#F2F4F6` | Sunken inputs, code blocks, sub-card emphasis |
| `--surface-tint` | `#F4F8FB` | Section backgrounds (very subtle blue tint) |

### 4.5 Semantic palette — Functional

Used only for the meaning they encode. Don't repurpose `--success-500` as a decorative green.

| Token | Hex | Usage |
|---|---|---|
| `--success-500` | `#2E7D54` | "In stock", "Delivered", confirmations. Forest green, not lime. |
| `--success-100` | `#E0F0E7` | Success backgrounds, badges |
| `--warning-500` | `#B97A12` | "Expires soon", "Limited delivery area" — amber, not yellow. |
| `--warning-100` | `#FBF1DC` | Warning backgrounds |
| `--danger-500` | `#B73448` | "Out of stock", "Cancelled", destructive confirms. Red with a hint of warmth, not crimson. |
| `--danger-100` | `#FBE5E8` | Danger backgrounds, error fields |
| `--info-500` | `#1A6FB0` | Same as `--brand-500`. We never have a separate "info blue" — info is the brand. |

### 4.6 Special semantic tokens

These exist because the pharmacy domain has specific meanings that need to be visible at a glance. Defined as tokens, not raw hex, so an admin theming tweak applies everywhere.

| Token | Hex | Usage |
|---|---|---|
| `--stock-in` | `#2E7D54` | "In stock" pip on cards. Same as `--success-500` but renamed for searchability. |
| `--stock-out` | `#B73448` | "Out of stock" pip and disabled CTA tint. |
| `--rx-flag` | `#7B5BAB` | (Future) prescription required — soft purple to be distinct from warning. |
| `--cold-chain` | `#0E7C8C` | (Phase 2) refrigerated item flag — teal-cyan. |

### 4.7 What we never do with color

- Never use raw hex in components. Always tokens.
- Never introduce a new brand color without updating this document.
- Never use saturated red except in `--danger-500` cases.
- Never apply gradient fills to type or icons (decorative gradients on hero washes are OK in moderation).
- Never use color as the only signal — always pair with an icon, label, or text. (Color blindness, screen glare, light mode contrast.)

### 4.8 Dark mode

Not in MVP. The PRODUCT spec doesn't list it; inverting a pharmacy's clinical-blue palette tastefully takes work that pays off later. We design tokens such that a dark-mode pass is straightforward: every color has a token and we never reach for `#fff` directly.

If/when dark mode lands: `--surface-base` becomes `#0F1216`, `--ink` scale inverts, brand stays the same hue but shifts toward `--brand-300/400` for contrast.

---

## 5. Typography

### 5.1 Typeface choices

**Display & Headings: Inter** — variable, designed for screens, excellent Cyrillic support, free, works at every weight from 400–800. The most boring, defensible choice — and the right one. Pharmacy customers shouldn't notice the typeface; they should notice the medicine.

**Body: Inter** — same family. One typeface family across the system. (Reasoning: a small pharmacy doesn't need a serif/sans contrast that requires two licenses to render properly. Inter at 400 reads like body, at 600 reads like a heading.)

**Monospace (data): JetBrains Mono** — for SKUs, batch numbers, expiry dates, order numbers (`PH-2026-000123`), and admin tabular data. Excellent Cyrillic and digit clarity at small sizes.

**Numerals**: use Inter's `tnum` (tabular numerals) feature for prices, totals, quantities, and any aligned numeric display. This is critical for `1 250 сом` aligning under `12 500 сом` in cart totals.

### 5.2 Type scale (mobile-first; desktop in parens)

A modular scale based on a 1.200 ratio (minor third), rounded to whole pixels for crisp rendering. Mobile sizes; desktop scales 1–2 steps higher for headings only.

| Token | Size (mobile / desktop) | Line-height | Weight | Usage |
|---|---|---|---|---|
| `--text-display` | 32 / 48 | 1.1 | 600 | Hero on home/landing only |
| `--text-h1` | 28 / 36 | 1.15 | 600 | Page titles |
| `--text-h2` | 24 / 28 | 1.2 | 600 | Section headings |
| `--text-h3` | 20 / 22 | 1.3 | 600 | Card headings, subsections |
| `--text-h4` | 18 / 18 | 1.35 | 600 | Component headings, accordion titles |
| `--text-body-lg` | 17 / 17 | 1.5 | 400 | Long-form description text (prefer this on PDP) |
| `--text-body` | 15 / 16 | 1.5 | 400 | Default body |
| `--text-body-sm` | 14 / 14 | 1.45 | 400 | Compact areas, secondary text |
| `--text-caption` | 13 / 13 | 1.4 | 400 | Captions, helper text, footnotes |
| `--text-micro` | 12 / 12 | 1.35 | 500 | Badges, pill labels, micro-callouts |
| `--text-mono` | inherits | 1.45 | 500 | Mono use cases (SKU, batch, order #) |

### 5.3 Cyrillic-specific rules

- **Inter handles Cyrillic well**, including the special letters Ё, Ъ, Й. Verify no font-fallback to Times in DevTools.
- **Letter-spacing**: Cyrillic uppercase looks tight with default tracking. Use `letter-spacing: 0.02em` on Cyrillic uppercase headings (rare; mostly for the logotype).
- **Hyphenation**: `hyphens: auto` with `lang="ru"` works in modern browsers but conservative — only enable on long-form prose (PDP description, blog if it ever exists).
- **Text wrap**: prefer `text-wrap: balance` on `<h1>` and `<h2>` for visually tighter ragged edges in Cyrillic. (Supported in modern Chrome/Safari/Firefox 2024+.)

### 5.4 Numerals and prices

Prices are the most-read content on every product card. Treatment:

- Always tabular figures (`font-variant-numeric: tabular-nums`).
- Whole `сом` by default; show 2-decimal only when the value isn't whole (rare; KGS doesn't have a smaller unit in practice).
- Russian/Kyrgyz UI uses `сом` lowercase with a thin space before: `1 250 сом`. English UI uses `KGS` after: `1,250 KGS`.
- Compare-at price (struck-through original) sits **before** the new price, in `--ink-500`, with the new price in `--ink-900` and the same size. Never use red strikethrough.

### 5.5 What we never do with type

- Never use display fonts for body text.
- Never go below 13px for any text the customer needs to read (pharmacy customers skew older).
- Never rely on weight alone for hierarchy across two languages — always pair with size.
- Never use ALL CAPS for body content. Only logotype and micro-badges.
- Never use italic for emphasis in Cyrillic — use weight. Italic Cyrillic is awkward in most fonts and reads as poorly-printed.
- Never use placeholder fonts like Comic Sans, Papyrus, or anything decorative. Pharmacy is serious.

---

## 6. Spacing, layout, and grid

### 6.1 Spacing scale

Based on a **4px base unit**, with the most-used values at 8, 12, 16, 24, 32, 48. We name by use, not by size, because designers think in roles ("space between cards") not in pixels.

| Token | Value | Common use |
|---|---|---|
| `--space-0` | 0 | — |
| `--space-px` | 1px | Hairline borders only |
| `--space-1` | 4 | Tight icon-text gaps |
| `--space-2` | 8 | Inline element spacing |
| `--space-3` | 12 | Compact internal padding |
| `--space-4` | 16 | Default internal padding (cards, buttons) |
| `--space-5` | 20 | Comfortable internal padding |
| `--space-6` | 24 | Block separation, card-to-card |
| `--space-8` | 32 | Section internal spacing |
| `--space-10` | 40 | Generous block separation |
| `--space-12` | 48 | Section outer spacing (between major regions) |
| `--space-16` | 64 | Hero spacing |
| `--space-20` | 80 | Page-section breathing room (desktop) |

### 6.2 Container widths and breakpoints

Mobile-first with 4 breakpoints. Typed as Tailwind defaults so we get the ecosystem benefit.

| Breakpoint | Width | Container max-width | Use |
|---|---|---|---|
| `xs` | < 640 | 100% | Phone (Aizhana, Bekzat) |
| `sm` | 640+ | 640 | Larger phones, small tablets portrait |
| `md` | 768+ | 720 | Tablets, small admin views |
| `lg` | 1024+ | 960 | Desktop, admin primary |
| `xl` | 1280+ | 1200 | Wide desktop |
| `2xl` | 1536+ | 1320 | Cinema only — admin reports might benefit |

Customer storefront targets `lg` as the design lead width. Admin targets `xl` (admins use desktop browsers).

### 6.3 Grid

- **Mobile (< 640):** single-column. Card lists are 1-up; product grids are 2-up only on small phones with portrait orientation.
- **Tablet (640–1024):** 2-up product grids; sidebar filters collapse into a sheet.
- **Desktop (1024+):** 4-up product grids; persistent left-rail filters on category pages.

### 6.4 Vertical rhythm

Section spacing follows a 48 / 64 / 80 progression on desktop. Mobile compresses to 32 / 40 / 48. Don't crowd; pharmacy customers benefit from "room to breathe."

---

## 7. Iconography

### 7.1 Library

**Lucide** (the modern fork of Feather). Stroke-based, geometric, ~1500 icons, covers everything we need (`Pill`, `HeartPulse`, `Stethoscope`, `Truck`, `Phone`, `Search`, etc.). Free, MIT licensed, works in React out of the box.

### 7.2 Icon rules

- Default size: **20×20 px** (`--icon-md`). Smaller in dense data (16), larger in empty states or hero treatments (24, 32).
- Stroke width: **1.75** (Lucide default 2 is slightly heavy; 1.75 reads more refined and matches our type weight).
- Color inherits from text color (`currentColor`). Never colored decoratively.
- Always paired with a label OR an `aria-label`. An icon-only button without `aria-label` is a bug.

### 7.3 Pharmacy-specific icons

These appear in many places; standardize to one icon each so the visual language is consistent:

| Concept | Lucide icon | Notes |
|---|---|---|
| Stock available | `CheckCircle2` | Filled circle with check |
| Stock unavailable | `XCircle` | |
| Cart | `ShoppingBag` | Not `ShoppingCart` — bag is more pharmacy-shaped |
| Search | `Search` | |
| User account | `User` | Avoid `UserCircle` |
| Address | `MapPin` | |
| Delivery | `Truck` | |
| Pickup | `Store` | (Pickup is a primary path for Nookat — make sure this icon is recognizable) |
| Pharmacy / brand mark | Custom pill SVG | (See §1.5) |
| Phone (call us) | `Phone` | |
| Symptom: headache | `HeadCircuit` (or custom) | |
| Symptom: cold | `Thermometer` | |
| Symptom: cough | `Wind` | |
| Active ingredient | `FlaskConical` | |
| Manufacturer | `Building2` | |
| Branch | `MapPinned` | |
| Order placed | `Package` | |
| Order delivered | `PackageCheck` | |
| Cancelled | `PackageX` | |

### 7.4 Custom icon: the Nookat pill mark

The brand mark itself is a custom SVG — a tilted capsule (pill) silhouette, asymmetric (one half slightly longer than the other to feel hand-drawn rather than corporate). Sized 1× of cap height in the wordmark; 24px standalone in mobile nav.

---

## 8. Photography & imagery

### 8.1 Strategy (Path C from kickoff)

**Three image categories, three sourcing strategies:**

1. **Hero / category / editorial imagery** — typography-led with abstract medical motifs, no licensed photography needed for MVP. Think: a soft brand-blue gradient wash, a pill-mark watermark, large type. We can ship without a photo shoot.
2. **Product card thumbnails and product detail images** — real product photography preferred. Manufacturer media kits where available; a clean studio-shot template for products without manufacturer images. Empty state for products with no image (see §14).
3. **Trust-signal imagery** — one storefront photo of the actual Nookat pharmacy in the footer / About page (a real thing humans built). Recruited from the owner; doesn't have to be perfect.

### 8.2 Hero treatments

Three approved hero patterns, used contextually:

**Pattern A — Type-led** (homepage hero, category landing)
- Big type (`--text-display`), 1–2 lines max
- Subhead in `--ink-600`
- Primary CTA in primary blue
- Background: `--surface-tint` washing into `--surface-base` from top-left to bottom-right
- Decorative pill-mark at 60% opacity in the bottom-right, sized large but quiet
- No photography

**Pattern B — Product-led** (homepage feature blocks, "Cold and flu" category card)
- A single hero product photo, square crop, on `--surface-card`
- Type beside (desktop) or below (mobile)
- Subtle drop shadow on the product (no halo, no glow)

**Pattern C — Trust-led** (About page, footer)
- The actual pharmacy storefront photo, soft duotone treatment in brand blue
- Caption identifying the location ("Nookat, Osh region")
- Used sparingly — once per session, not repeatedly

### 8.3 Product photography spec

For products we shoot ourselves or process from manufacturer kits:

- Square crop, 1:1 aspect (consistent grids matter more than artistic crops here)
- Pure white background OR `--surface-base` with subtle natural shadow
- No lifestyle context (a person holding the box) on the product card — those are reserved for landing pages
- Multiple variants per product allowed: front, back, blister, in-context. First image is always front-of-box.
- Image variants per BACKEND `process_image_upload`: 200×200 thumbnail, 600×600 medium, 1200×1200 large, all WebP

### 8.4 Empty state for "no image"

When a product has no image (will happen during catalog build):

- A square `--surface-tint` block with the pill-mark centered at 30% opacity
- Alt text in the resolved language: "Изображение скоро появится" / "Сүрөт жакында жетет" / "Image coming soon"
- Never a broken-image icon. Never a silhouette. Never "?" placeholders.

### 8.5 What we never use

- Stock photos of doctors, white-coated models, clipboards, stethoscopes posed on tables — these scream "fake medical site"
- Clichéd "smiling pharmacist behind counter" stock — feels insincere
- Generic abstract medical illustrations (DNA helices, microscopes) — irrelevant to OTC retail
- AI-generated medicine product shots — they almost always render plausible-but-wrong text on packaging, which is dangerous in pharmacy

---

## 9. Elevation, borders, and surfaces

### 9.1 Elevation

We use elevation conservatively. Most pharmacy UI sits on the canvas with subtle borders, not floating cards.

| Token | Definition | Use |
|---|---|---|
| `--elev-0` | none | Default — most cards use a 1px border, not a shadow |
| `--elev-1` | `0 1px 2px rgba(15, 17, 21, 0.04), 0 1px 1px rgba(15, 17, 21, 0.03)` | Subtle raise — sticky headers when scrolled |
| `--elev-2` | `0 4px 8px rgba(15, 17, 21, 0.06), 0 1px 2px rgba(15, 17, 21, 0.04)` | Hover state on interactive cards |
| `--elev-3` | `0 12px 24px rgba(15, 17, 21, 0.08), 0 2px 4px rgba(15, 17, 21, 0.04)` | Modals, popovers, dropdown menus |
| `--elev-4` | `0 24px 48px rgba(15, 17, 21, 0.12), 0 4px 8px rgba(15, 17, 21, 0.06)` | Sheet/drawer over content |

### 9.2 Borders

Default border: `1px solid var(--ink-200)`. We use borders far more than shadows for clarity at small sizes and crispness on Retina screens.

### 9.3 Border radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6 | Inputs, small chips, badges |
| `--radius-md` | 10 | Cards, buttons (default) |
| `--radius-lg` | 14 | Modals, sheets, large surfaces |
| `--radius-xl` | 20 | Hero blocks, statement cards |
| `--radius-pill` | 9999 | Pills, chips, status indicators |
| `--radius-circle` | 50% | Avatars, icon-only round buttons |

Soft enough to feel modern, not so soft it reads as "kid's app."

---

## 10. Motion and microinteractions

### 10.1 Philosophy

Motion communicates causality (this happened *because of* that) and provides feedback (your tap was received). Decorative motion is forbidden — pharmacy customers are often stressed when they visit. Don't add anxiety with bouncing, pulsing, or attention-seeking animation.

### 10.2 Duration tokens

| Token | Duration | Use |
|---|---|---|
| `--duration-instant` | 80ms | Hovers, focus, tap feedback |
| `--duration-quick` | 160ms | Small state changes, toggle switches |
| `--duration-base` | 240ms | Cards, modal fade, page transitions |
| `--duration-slow` | 360ms | Sheet/drawer slides, hero washes |
| `--duration-deliberate` | 500ms | Success confirmations only (the one moment we *want* the user to notice) |

### 10.3 Easing

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);   /* default — most things */
--ease-emphasized: cubic-bezier(0.3, 0, 0, 1); /* sheets, drawers */
--ease-decelerate: cubic-bezier(0, 0, 0, 1);   /* enter from off-screen */
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1); /* exit off-screen */
```

### 10.4 Motion patterns

- **Buttons & cards on hover:** background tint shifts (no scale, no shadow change). Duration `--duration-quick`.
- **Page transitions:** none on App Router — RSC handles this. Loading skeletons on data fetch.
- **Modals:** fade in + scale 0.96 → 1.00, duration `--duration-base`.
- **Sheets / drawers:** translate from edge, duration `--duration-slow`, easing `--ease-emphasized`.
- **Toasts:** slide up + fade, dwell 4s, exit fade. Auto-stack.
- **Form errors:** fade in, no shake. (Shake is anxiety theatre.)
- **Add-to-cart confirmation:** brief flash of `--success-100` on the cart icon + cart badge increment, duration `--duration-deliberate`. The one place we want the user to *see* something happen.

### 10.5 Reduced motion

Always respect `prefers-reduced-motion: reduce`. Replace transitions with instant state changes; replace fades with opacity 0/1 cuts. Use a single utility (`useReducedMotion()` hook) and apply consistently — every motion spec above has a reduced-motion variant baked into the component.

---

## 11. Component library

### 11.1 Source

**shadcn/ui** primitives, customized to our tokens. We **own** the components (they're copied into our codebase, not imported as a black-box library). All Radix primitives underneath = solid accessibility defaults.

For each shadcn component, we maintain a Nookat-themed version under `components/ui/`. Token swaps replace shadcn's default Tailwind tokens with our brand tokens.

### 11.2 Core components and where they live

| Component | shadcn primitive | Customization |
|---|---|---|
| `Button` | button | Variants: `primary`, `secondary`, `ghost`, `destructive`, `link`. Sizes: `sm`, `md` (default), `lg`. Loading state with spinner; disabled state always visually distinct. |
| `Input`, `Textarea` | input, textarea | Always paired with `Label`. Support left/right adornments (icon, currency suffix). Error state in `--danger-500` border + helper. |
| `Select` | select | On mobile (<640): falls back to native `<select>` for accessibility. On desktop: Radix popover. |
| `Card` | — (custom) | `default` (border, no shadow), `raised` (border + `--elev-1`). Padding tokens consistent. |
| `Badge` | badge | Variants: `default`, `success` (in stock), `warning` (expiring), `danger` (out of stock), `info` (informational). |
| `Dialog` | dialog | Modal, focus-trapped. Mobile: full-screen sheet variant. |
| `Sheet` | sheet | Side drawer; right-side default. Used for: filters (mobile), cart drawer (desktop), admin batch detail. |
| `Dropdown` | dropdown-menu | Contextual menu. Used in: order actions, admin row actions. |
| `Tabs` | tabs | PDP detail sections (description, dosage, side effects). Always horizontally scrollable on mobile. |
| `Toast` | toast (sonner) | Top-right on desktop, top-center on mobile. Use sparingly — only for confirmations and errors. |
| `Tooltip` | tooltip | Pointer-only; replaced by inline help text on touch devices. |
| `Avatar` | avatar | Customer initials in a circle for account header. |
| `Skeleton` | skeleton | For card loading states. Always wired to real data path. |
| `Pagination` | pagination | Number-style on desktop, prev/next on mobile. |
| `Breadcrumb` | breadcrumb | Used on category and product pages. Schema.org BreadcrumbList JSON-LD attached. |
| `Accordion` | accordion | PDP collapsible sections (mobile only — desktop shows tabs). |
| `RadioGroup` | radio-group | Delivery method, payment method on checkout. |
| `Checkbox` | checkbox | Filters, "save address," etc. |
| `Switch` | switch | Settings toggles. |
| `Command` | command (cmdk) | Search command palette (admin) and storefront search-suggest dropdown. |

### 11.3 Pharmacy-specific composed components

Beyond shadcn primitives, we build a small set of **pharmacy-shaped components**:

| Component | What it is | Where it lives |
|---|---|---|
| `ProductCard` | The 1×1 product surface. Image, name, dosage, price (with compare-at), in-stock pip, `Add to cart` button. Variants: `compact` (search suggest), `default` (grid), `wide` (cart line). | `components/product/ProductCard.tsx` |
| `StockPip` | The colored dot + label that says in-stock or out-of-stock. Used on cards and PDP. | `components/product/StockPip.tsx` |
| `PriceTag` | Price with optional compare-at and `сом`/`KGS` localized suffix. Tabular nums always. | `components/product/PriceTag.tsx` |
| `DeliveryBadge` | "Delivery in ~2 hours" / "Pickup available" — green pill with truck/store icon. | `components/product/DeliveryBadge.tsx` |
| `ActiveIngredientChip` | Tappable chip showing ingredient + dose. Tap → filters by that ingredient. | `components/product/ActiveIngredientChip.tsx` |
| `SymptomTile` | Square tile for the symptom grid: icon, name, count of products. | `components/symptom/SymptomTile.tsx` |
| `OrderStatusTimeline` | Vertical timeline of order states with timestamps. | `components/order/OrderStatusTimeline.tsx` |
| `AddressCard` | Saved address with default badge, edit / delete actions. Used in account and checkout. | `components/address/AddressCard.tsx` |
| `EmptyState` | Standardized empty state: icon, title, body, optional CTA. Used 20+ places. | `components/feedback/EmptyState.tsx` |
| `ErrorState` | Standardized error state with code, title, body, retry. | `components/feedback/ErrorState.tsx` |
| `TrustStrip` | Footer/landing strip: "Real pharmacy in Nookat", "Licensed pharmacist on staff", "Same-day delivery in Bishkek", with phone CTA. | `components/marketing/TrustStrip.tsx` |
| `PhoneCallButton` | Tap-to-call sticky CTA for support. | `components/support/PhoneCallButton.tsx` |
| `LangSwitcher` | RU / KY / EN compact switch in header and footer. | `components/i18n/LangSwitcher.tsx` |

### 11.4 Component behaviour rules

- **Every interactive component has a focus ring.** Default ring: `2px solid var(--brand-500)` with `2px` offset. Never `outline: none` without a replacement.
- **Disabled state has both reduced opacity AND `cursor: not-allowed`.** Never just one.
- **Loading buttons disable themselves and replace label with spinner + "Загрузка…"** — text matches the resolved language.
- **Icon-only buttons have visible 44×44 px hit area** even if the icon is 20×20. Mobile thumb minimum.
- **Every form field has a visible label.** Placeholder is not a label. Floating labels are fine if they animate; "label inside" patterns must persist when the input has content.

---

## 12. Page-level patterns

### 12.1 Header (storefront, mobile)

- Sticky top bar, height 56px, `--surface-card` with `--elev-1` when scrolled past 0
- Left: hamburger (small), Nookat mark
- Center/Right: search icon (taps to open full-screen search overlay)
- Right edge: cart icon with badge

### 12.2 Header (storefront, desktop)

- Sticky top bar, height 72px
- Left: Nookat horizontal logo
- Center: search input (always visible, takes ~480px of width)
- Right: language switcher (compact), account icon, cart icon with badge
- Below header on category pages: breadcrumb bar

### 12.3 Footer

- Three-column desktop / stacked mobile
- Column 1: Nookat info — pharmacy address (Nookat, Osh region, real address), phone, working hours
- Column 2: Customer support — phone tap-to-call, FAQ (post-MVP), contact form (post-MVP)
- Column 3: Legal — Terms, Privacy, Delivery, Returns
- Bottom strip: language switcher, copyright, "Лицензия аптеки №…" with the real license number

### 12.4 Homepage (storefront)

Sections, top to bottom:

1. **Hero** — type-led (Pattern A), tagline + primary CTA "Найти лекарства"
2. **Search bar** — large, prominent (the second discoverable surface after hero)
3. **Symptom grid** — 8–12 symptom tiles in a responsive grid; the "browse by need" entry point (Bekzat's path)
4. **Featured categories** — 4–6 category cards (cold & flu, pain relief, vitamins, baby, GI)
5. **"Why Nookat" trust strip** — 3 pillars with icons (real pharmacy, same-day delivery, fresh stock)
6. **Footer**

### 12.5 Category page

- Breadcrumb
- Category name + description
- Filter rail (desktop) / filter button (mobile, opens sheet)
- Sort dropdown
- Product grid (4-up desktop, 2-up tablet, 1-up phone)
- Pagination (cursor-based eventually; MVP page-numbered)

### 12.6 Product detail page (PDP)

The most important page in the funnel after homepage. Layout:

**Above the fold (mobile):**
- Image carousel (square crop)
- Product name
- Manufacturer + country (small, `--ink-600`)
- Price + compare-at + `сом`
- Stock pip + delivery badge
- Primary CTA: `Добавить в корзину` (out-of-stock state shows alternatives block instead)
- Secondary CTA: "Buy now" (skips cart) — Phase 2; MVP only "Add to cart"

**Below the fold:**
- Tabs (desktop) / accordion (mobile):
  - Composition (active ingredients)
  - Indications ("for what")
  - Usage instructions
  - Side effects
  - Contraindications
  - Storage
- Active ingredients chip row
- Substitutes block ("С тем же действующим веществом" — same active ingredient, ≤4 alternatives)
- Trust strip

### 12.7 Cart page

- Line items: thumbnail, name, dosage, price (with compare-at), quantity stepper, line total, remove
- Out-of-stock items pinned to top with red banner
- Price-changed items with diff: old → new, with confirm button
- Sticky bottom totals card on mobile
- Primary CTA: `Оформить заказ` (Place order)
- Empty state when no items (see §14)

### 12.8 Checkout (single-page)

Single-screen, no multi-step wizard:
1. Delivery section: pick saved address OR enter new (inline). Toggle pickup / delivery.
2. Payment section: COD radio (default checked), card-online radio, others (mbank/elsom/odengi/balance_kg/bank_transfer per backend).
3. Notes (optional collapsible)
4. Sticky review block: items summary, totals, "Place order" button
5. Idempotency-Key header generated client-side per submission attempt

### 12.9 Order confirmation page

- Big check icon (`--success-500`)
- Heading: "Заказ {order_no} принят"
- Order summary: items, address, payment method, totals
- Status timeline: placeholder, will populate as updates arrive
- Phone CTA: "Вопросы? Позвоните нам"
- Secondary: "Posmotret' moi zakazy" → /me/orders

### 12.10 Account pages

- Tabs: Profile / Addresses / Orders
- Profile: name, email (optional), language preference, phone (read-only — change flow is post-MVP)
- Addresses: list with default badge, add/edit/delete
- Orders: paginated list, click to detail

### 12.11 Order detail page

- Order number + status pill at top
- Status timeline (vertical, dated)
- Items list (line items snapshot, never mutates)
- Delivery address (snapshot)
- Payment summary (totals, method, status)
- Actions: Cancel (if status allows), Reorder (always)
- Phone CTA for support

### 12.12 Search results page

- Query echoed at top
- Synonyms-used surface (small chip row) so the user knows we also searched for "грипп" when they typed "простуда"
- Filter rail (same as category)
- Results grid OR empty state with popular searches

---

## 13. Forms, inputs, and validation

### 13.1 Validation strategy

- **Client-side first** with Zod schemas; errors shown inline below field on blur or submit
- **Server-side authoritative** — backend errors trump client. Map backend `code` → translated message via i18n keys.
- **Don't validate while typing.** Validate on blur (or on form submit). Aggressive in-progress validation feels accusatory.

### 13.2 Field components

Every input has: label, optional helper text, error slot, required indicator.

### 13.3 Phone input

Critical pattern. Customers enter `+996 700 12 34 56` or `0700 12 34 56` or `996700123456`. The component:

- Defaults to `+996` country code (KG) prefilled and locked
- Accepts paste of any of the formats above
- Normalizes on blur to display: `+996 700 12 34 56` (E.164 grouped)
- Stores as E.164 (`+996700123456`)
- Inline-validates via the same `phonenumbers` rules the backend uses (we run the same validation client-side via `libphonenumber-js`)

### 13.4 Address input

Per PRODUCT §16.3, addresses are free-text + landmark, not structured. Component:

- City (default "Bishkek", but Nookat orders should default "Nookat" — derive from branch or user history)
- Address line (single multi-line text input, examples in placeholder)
- Landmark ("ориентир") — separate field, optional but encouraged with hint copy
- Optional fine-grained: apartment, floor, entrance, intercom code
- Phone for recipient (defaults to user's, editable)

### 13.5 OTP input

Six 1-digit inputs with auto-advance. Paste-aware (paste "123456" fills all six). Resend countdown (60s) below. Loading state on the verify button after fill.

### 13.6 Quantity stepper

Cart line, also product-add. Increment/decrement buttons + numeric input. Disable decrement at 1 (delete is separate action). Disable increment at `max_per_order` with helper text.

### 13.7 Inline errors

Below the field: `--text-caption`, `--danger-500`, with icon (`AlertCircle`). Server errors are translated via i18n key from backend `code`.

### 13.8 What we never do

- Never use `placeholder` as the only label.
- Never auto-submit on blur or autofill.
- Never use red `*` as the only required indicator — pair with text or `aria-required`.
- Never use generic "Invalid input" — always specific ("Phone must start with +996").
- Never disable the submit button by default — let the user attempt submit and surface errors. (Disabled buttons confuse users into thinking the page is broken.)

---

## 14. Empty, loading, and error states

### 14.1 Empty states

Every list has an empty state. Format:

- Centered icon (24–32 px) in `--ink-300`
- Title in `--text-h3`, `--ink-800`
- Body in `--text-body`, `--ink-600`
- Optional CTA in primary

Examples:

| Surface | Title | Body | CTA |
|---|---|---|---|
| Empty cart | Ваша корзина пуста | Найдите нужные лекарства и средства | Перейти к покупкам |
| No orders yet | Здесь появятся ваши заказы | Сделайте первый заказ — это просто | На главную |
| No saved addresses | Адреса не сохранены | Сохраните адрес, чтобы быстрее оформлять заказы | Добавить адрес |
| Search no results | Ничего не найдено по запросу «{q}» | Попробуйте: парацетамол, от температуры, витамин С | — |

(All these strings use i18n keys from PRODUCT §21.)

### 14.2 Loading states

- **Page-level** — skeleton screens that match the final layout. Card shapes, text-line shapes, all in `--ink-100` with a subtle shimmer (250ms cycle). Reduced-motion: static `--ink-100` boxes with no animation.
- **Component-level** — inline spinner (16–20 px) where the data lives. Buttons get a spinner replacing the label.
- **Search suggest** — debounced 250ms; while in flight, show "Ищем…" in the suggest dropdown header.

### 14.3 Error states

Three classes of error, three treatments:

**Inline (form fields, single-action failures):** the field's error slot, red text, icon.

**Block-level (a section failed to load):** `ErrorState` component — icon, title ("Не удалось загрузить"), body ("Проверьте подключение и попробуйте снова"), retry button. Color: `--ink-600` text, `--ink-300` icon. Not red — block errors are not crisis.

**Page-level (the whole route failed):** Next.js `error.tsx` boundary. Same `ErrorState` component but full-screen-ish. Includes "Назад на главную" and the customer support phone CTA.

### 14.4 Toast guidelines

- Use only for **confirmations** and **errors that don't fit inline**.
- Never use toasts for important state changes the user must act on (use Dialog or page-level component).
- Toast text is short (≤ 60 chars).
- Auto-dismiss after 4s; close button (×) for screen readers.
- Multiple toasts stack vertically (newest on top).

### 14.5 Network-failure states

Specific copy for the most-common cases (matches PRODUCT §21 keys):

- `error.network`: «Проблема с подключением. Попробуйте ещё раз.» — with retry
- `error.generic`: «Что-то пошло не так. Попробуйте позже или позвоните нам.» — with phone CTA

---

## 15. Trust signals and microcopy

This is the section where most pharmacy websites lose customers. Trust is built in inches.

### 15.1 Visible-on-every-page trust signals

- **Customer support phone** — top-right of header on desktop, prominent in mobile drawer, in footer, on every transactional confirmation. Tap-to-call (`tel:` link).
- **License number** — footer, plain text. "Лицензия аптеки №[real license number]".
- **Real pharmacy address** — footer, with link to Google Maps if convenient.
- **Pharmacist name** — About page mentions the licensed pharmacist by name. Phase 2: a photo. Phase 3: video introduction.

### 15.2 Product-page trust signals

- **In stock badge** with explicit "В наличии у нас" / "В наличии" — not just "available," but "with us, here, now"
- **Delivery time estimate** — concrete: "Доставка ~2 часа" not "Fast delivery"
- **"From licensed distributors" badge** — under the price section. Literal, not exaggerated.
- **Best before** (when applicable) — for batches with < 60 days expiry: "Срок годности: до DD.MM.YYYY" in `--ink-600`. Not hidden.

### 15.3 Microcopy that builds trust

| Surface | Bad | Good |
|---|---|---|
| Out of stock | Currently unavailable | Сейчас нет в наличии. Похожие препараты ниже — |
| Delivery | Fast shipping | Доставка в Бишкеке за ~2 часа |
| Cancel order | Are you sure? | Отменить заказ {order_no}? Деньги вернутся в течение 3-5 дней (для оплат картой). |
| OTP not received | Code not received | Не получили код? Проверьте сигнал или [позвоните нам]. |
| 5xx error | Server error 500 | Что-то пошло не так у нас. Мы уже знаем. Попробуйте через минуту или позвоните нам. |

### 15.4 Microcopy that destroys trust

Never write:

- "Hurry, only N left!" (we don't show stock counts; PRODUCT §3.3)
- "Best price guaranteed!" (price war framing; we compete on stock truth)
- "Lowest prices!" (same)
- "100% authentic!" (the moment you have to claim authenticity, it sounds doubtful)
- "Customer #1 choice!" (nobody believes this)
- Excessive exclamation marks anywhere

### 15.5 The "person on the other end" rule

Every error and edge case offers the path to a human. Customer support phone is one tap away. Not buried in a /help page. Not behind a chat widget. **A phone number.** Aizhana, Gulnara, and Bekzat all reach for the phone when something feels wrong; we make it easy.

---

## 16. Accessibility

### 16.1 Standard

**WCAG 2.1 AA** as the bar for MVP, with specific AAA targets where the audience justifies it (older customers, slow connections).

### 16.2 Hard requirements

- All text passes contrast 4.5:1 (3:1 for large text > 18pt or 14pt bold)
- Focus rings on every interactive element
- Tab order matches visual reading order
- Dynamic Type / `rem`-based sizing — pinch-zoom and OS text scaling work
- Touch targets minimum 44×44 px on mobile
- All images have meaningful `alt` text (or `alt=""` if decorative)
- All forms have `<label>` associated to inputs
- All buttons and links have visible labels (icon-only requires `aria-label`)
- Modals trap focus; Esc closes
- Live regions for toasts (`aria-live="polite"`) and form errors (`aria-live="assertive"` only when validation fails on submit)
- Color is never the only signal — pair with icons or labels (color blindness)
- Reduced motion respected globally
- Keyboard operability for every flow — including PDP image carousel, filter sheet, modal overlays

### 16.3 Screen reader specifics

- Test in VoiceOver (iOS Safari) and NVDA (Windows Firefox/Chrome) at minimum
- Heading hierarchy is clean (one `h1` per page, no skipped levels)
- Landmark regions: `header`, `main`, `aside`, `footer`, `nav` — used semantically
- Search input has `role="searchbox"` and `aria-label`
- Loading state: replace skeleton with `aria-busy="true"` on the parent

### 16.4 Localized accessibility

- `lang` attribute set on `<html>` and switched when user changes language
- Phone number announcements work in RU and KY screen readers (test "+996" pronunciation)
- Date format readouts work per locale
- Cyrillic-specific: ensure `lang="ru"` so SR uses Russian voice

### 16.5 Performance as accessibility

- LCP ≤ 2.5s on 3G (older customers on village connections)
- TTI ≤ 3.5s on mid-range Android (the median Bishkek/Nookat device)
- Total JS budget ≤ 180 KB gzipped per route on customer storefront (admin can be larger)

---

## 17. Voice and tone

### 17.1 Voice personality

Voice is **calm, plain, respectful**. Address customers as **«вы»** (formal you) in RU and equivalent in KY. Speak like a pharmacist, not a marketer.

### 17.2 Tone modes

| Mode | When | Example (RU) |
|---|---|---|
| Calm | Default | Доставим за 2 часа. |
| Reassuring | After an error or worry | Не волнуйтесь — мы перезвоним и подтвердим. |
| Direct | Critical action needed | Отменить заказ? Это нельзя отменить. |
| Warm | Confirmations | Заказ принят. Спасибо! |

### 17.3 What we always do

- Use «вы» (formal you) and proper conjugation
- Keep sentences short — 12 words is a good ceiling
- Lead with the most important information
- Use specific numbers ("за 2 часа") not vague modifiers ("быстро")
- Capitalize Russian/Kyrgyz sentence-case (only first letter of sentence; proper nouns)

### 17.4 What we never do

- Use «ты» (informal you)
- Use ALL CAPS for emphasis
- Use bold for emphasis in copy (use weight only in headings)
- Use marketing words: «лучший», «самый», «эксклюзивно», «уникальное предложение»
- Use medical jargon when a plain word works
- Apologize excessively (one «Извините» is enough)
- Make recommendations on what medicine to take ("for headache, take paracetamol") — that's prescription, not navigation. We show what's available; the customer chooses or asks the pharmacist.

### 17.5 Specific copy choices

- The pharmacy says **«у нас»** ("with us") — emphasizes that we are the actual pharmacy fulfilling, not a marketplace.
- Order numbers prefixed `PH-` are read in copy as "номер заказа PH-2026-000123."
- Currency is `сом` lowercase in body, KGS in English UI, never both.
- We never address the customer by name in transactional copy ("Hello, Aizhana!") — feels uncanny on transactional surfaces. Save that for the optional first-line of receipt emails.

---

## 18. Localization specifics (RU / KY / EN)

### 18.1 The three language strategy

- **RU is mandatory** — every key resolves
- **KY is encouraged** — falls back to RU if missing (server-side via `t()` helper, which is mirrored client-side via next-intl)
- **EN is optional** — small audience; falls back to RU

### 18.2 Visual differences across locales

| Concept | RU | KY | EN |
|---|---|---|---|
| Currency suffix | сом | сом | KGS |
| Decimal separator | comma | comma | period |
| Thousand separator | thin space | thin space | comma |
| Date format | DD.MM.YYYY | DD.MM.YYYY | DD/MM/YYYY (or YYYY-MM-DD in admin) |
| Phone display | +996 700 12 34 56 | +996 700 12 34 56 | +996 700 12 34 56 |
| First letter capitalization | Sentence case | Sentence case | Title case in headings only |
| Cart | Корзина | Себет | Cart |
| Currency unit | сом | сом | KGS |

### 18.3 Text expansion

Translations to KY are typically **15–25% longer** than RU. EN is typically **10–20% shorter** than RU. Design with this in mind:

- Buttons should fit "Подтвердить заказ" (RU) AND "Буйрутманы тастыктоо" (KY) without clipping
- Headings should leave 20% slack on the right
- Test all critical screens in all three languages before declaring complete

### 18.4 Language switcher

- Header (compact): RU / KY / EN single-letter pills (Р / К / E might be too cute; use the language codes)
- Footer (verbose): full names «Русский» / «Кыргызча» / «English»
- Persisted to user profile if logged in; otherwise to a cookie
- Switching mid-session preserves the current page

### 18.5 Cyrillic-specific UI tweaks

- `text-wrap: balance` on `<h1>`/`<h2>` (Cyrillic ragged edges look uglier without)
- Letter-spacing slightly looser on Cyrillic uppercase (rare; mostly logotype)
- No font-fallback to Times — Inter must be loaded with Cyrillic subset before render

### 18.6 Copy ownership

We **never** translate copy on the fly with an AI service. All RU/KY/EN copy ships through the i18n JSON files curated by humans (initially: us; eventually: a local pharmacist reviewing KY). The JSON files match the backend's `app/i18n/*.json` shape so the same keys mean the same thing on both sides of the wire.

---

## 19. Admin design language

### 19.1 Tone shift

Admin is **dense, fast, keyboard-first**. The customer storefront is calm; admin is utility. Different visual register, same brand foundation.

What stays:
- Color palette (admin uses the same brand blue as primary action color)
- Typography (Inter; `--text-mono` used heavily for SKUs, batch numbers, order #s)
- Component primitives (shadcn buttons, dialogs, sheets all reused)
- Tokens for spacing and radius

What changes:
- Higher information density: smaller paddings, more rows per screen
- Tables, not cards, are the default layout for lists
- Always-visible filters on the left rail
- Keyboard shortcuts (`/` to focus search, `j/k` to navigate rows, `Enter` to open detail)
- Dense data uses `--text-body-sm` (14 px) by default
- More usage of `--surface-sunken` for table headers and filter bars

### 19.2 Admin pages

| Page | Key components |
|---|---|
| Login | Email + password + optional TOTP |
| Dashboard (post-MVP) | KPI cards, today's orders, low-stock alerts |
| Orders queue | Filterable table; bulk actions; row actions |
| Order detail / picking | Two-column layout: items + customer info; transition buttons sticky bottom |
| Catalog: products | Searchable table; inline edit for prices/active toggles; click to detail |
| Catalog: categories / ingredients / symptoms / manufacturers | Simpler tables; modal create/edit |
| Inventory: receive batch | Form with barcode scan placeholder, expiry date picker (DD.MM.YYYY), supplier select |
| Inventory: batches | Table with FEFO-aware sort default; near-expiry filter |
| Reports | Date range + branch + format (CSV) — sales report, top products |
| Audit | Searchable log with diff viewer |

### 19.3 Admin-specific component additions

- `DataTable` — sortable, filterable, paginated, with row-action menu and bulk-action bar (TanStack Table v8 underneath)
- `DiffViewer` — JSON before/after side-by-side for audit log
- `BatchPicker` — receive-batch form with date validation (the 7-day hard block must surface visibly)
- `OrderActionStrip` — sticky bottom bar on order detail with the next-step transition button

### 19.4 Admin-specific microcopy

Admin can be terser. Pharmacists are using this 50× a day; full sentences in every label is friction.

| Customer copy | Admin copy |
|---|---|
| Подтвердить заказ | Подтвердить |
| Адрес доставки | Адрес |
| Срок годности | Годен до |
| Действующее вещество | МНН |

(MНН = международное непатентованное наименование, the Russian standard term active-ingredient lists use.)

---

## 20. Brand-rename protocol

> "Can we change the brand name later?" — yes. Here's how, in detail, so future-us isn't surprised.

### 20.1 Single-source-of-truth tokens

The brand name lives in **exactly one place per surface**:

| Surface | Source | Rename action |
|---|---|---|
| Code (TypeScript) | `lib/brand.ts` exporting `BRAND` constant | One file edit |
| All language JSON | `messages/<lang>.json` keys `brand.name`, `brand.tagline` | Three file edits |
| Logo SVG | `public/brand/logo-*.svg` (4 files) | Replace SVGs |
| Favicons / PWA icons | `public/icons/*` | Generate from new logo |
| HTML metadata | `app/layout.tsx` reads from `BRAND` | Already covered |
| Email templates (post-MVP) | `lib/email/templates/*` reads from `BRAND` | Already covered |

That's **4–5 files edited** for a complete rename. Anything else referencing the brand name is a bug — surface it.

### 20.2 What does NOT need renaming

- The actual API URL `api.nookat.kg` (DNS / deployment concern; not a frontend code change)
- Database table names (backend stays untouched on a frontend rename)
- The `pharmacy_cart_session` cookie (it's a cookie name, not user-visible — leave it for backend compatibility)
- `BRAND` constant references in comments and docstrings — fine, they update at next read

### 20.3 Hard rule for AI code generation

Claude Code must **never** hardcode "Nookat" anywhere in component or page code. Always reach for `BRAND.name` via the import. Anything literal is a violation of this protocol and gets caught at code review.

We add this to the frontend's `CLAUDE.md` rules so it can't be forgotten.

---

## 21. Conventions checklist

Before declaring any visual / interaction work complete:

### 21.1 Tokens
- [ ] No raw hex values in component code (`Color('#1A6FB0')` is forbidden — use `var(--brand-500)` or the Tailwind token alias)
- [ ] No raw font sizes (`font-size: 16px` is forbidden — use `text-body` or the appropriate scale token)
- [ ] No raw spacing (`padding: 24px` is forbidden — use `p-6` or `var(--space-6)`)
- [ ] No raw border radius (`border-radius: 10px` is forbidden — use `rounded-md` or `var(--radius-md)`)

### 21.2 Components
- [ ] Every interactive element has a focus ring
- [ ] Every icon-only button has `aria-label`
- [ ] Every form field has a `<label>` (visible or `aria-label`)
- [ ] Every empty state uses `EmptyState` or `ErrorState` (not bespoke)
- [ ] Every loading state is wired to a real data path (no orphaned skeletons)
- [ ] Disabled states have both visual treatment AND `cursor: not-allowed`
- [ ] Icon sizes use `--icon-sm/md/lg` tokens, not raw px

### 21.3 Microcopy
- [ ] No hardcoded user-visible strings (always via i18n key)
- [ ] No marketing language ("лучший", "самый", «100% original»)
- [ ] No "only N left" scarcity UX
- [ ] No medical-advice phrasing ("for headache, take X")
- [ ] Customer support phone CTA visible / one tap away
- [ ] Order numbers always prefixed `PH-` and shown in `--text-mono`

### 21.4 Color
- [ ] Color is never the only signal (always paired with icon or text)
- [ ] No new brand color introduced without updating this document
- [ ] No saturated red except in `--danger-500` cases
- [ ] No gradient on type or icons (washes only)

### 21.5 Photography
- [ ] No stock photos of fake doctors / clipboards / stethoscopes
- [ ] No AI-generated medicine packaging
- [ ] No "smiling pharmacist" stock images
- [ ] Empty-image placeholders use the brand pill-mark, not broken-image icons

### 21.6 Localization
- [ ] All copy in `messages/<lang>.json` (not hardcoded)
- [ ] RU exists for every key
- [ ] KY tested at least visually on key screens (search, cart, checkout, order)
- [ ] Currency suffix matches locale (`сом` in RU/KY, `KGS` in EN)
- [ ] Date format matches locale
- [ ] Phone format `+996 NNN NN NN NN` everywhere

### 21.7 Accessibility
- [ ] Contrast 4.5:1 on body text, 3:1 on large text
- [ ] Keyboard reachable from tab-0 to last interactive element in reading order
- [ ] Dynamic Type / OS scaling works
- [ ] Reduced motion respected
- [ ] Touch targets ≥ 44×44 on mobile
- [ ] Tested in VoiceOver (iOS) and NVDA (Windows)

### 21.8 Brand
- [ ] No literal "Nookat" in code (always via `BRAND.name`)
- [ ] Logo files in `public/brand/` are the single source
- [ ] Favicons and PWA icons regenerated on logo change

---

*Document version 1.0 — Nookat design blueprint. Companion to `FRONTEND_BLUEPRINT.md` and `FRONTEND_CLAUDE_CODE_PROMPTS.md`.*
