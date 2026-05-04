# Runbook — Incidents

> Playbooks for site-down, OTP-not-arriving, place-order failing,
> and other production fires. Phase 12 deliverable.

## Severity levels

| Level  | Definition                               | Response time        |
| ------ | ---------------------------------------- | -------------------- |
| **P0** | Site offline / data loss / PII leak      | 15 min, page on-call |
| **P1** | Core J-01 broken (cannot place an order) | 1 hour               |
| **P2** | One feature degraded; workaround exists  | 4 hours              |
| **P3** | Cosmetic / non-blocking                  | Next business day    |

## P0 — Site offline (5xx for everyone)

1. **Verify it's actually down.** `curl -sI https://nookat.kg/api/health`. If you get a TLS error, suspect Caddy/Coolify; if you get 502/503, suspect the Node container.
2. **Coolify dashboard** → most recent deployment. Healthcheck red? Container restarting?
3. **If container is crashing:** Coolify logs panel → look for the exception. Usually one of:
   - `ZodError` on env import → missing env var (see `docs/runbooks/deploy.md > Build env mismatch`).
   - `ECONNREFUSED` to backend → backend is down. Switch to backend's incident runbook.
   - OOM kill → bump container memory limit; investigate after the fire is out.
4. **Rollback** to the previous green deployment (`docs/runbooks/deploy.md > Rollback`).
5. **Once stable**, post-mortem:
   - Root cause
   - Why CI didn't catch it
   - Add a regression test
   - Update this runbook if the playbook needs improvement

## P0 — PII leak (Sentry event contains phone/email/address)

1. Sentry → discard the affected event(s). Settings → Project → Data scrubbing → discard rule.
2. Identify the consumer that bypassed `scrubPii`. Search the codebase for the field name.
3. Add the field name to `lib/observability/scrub.ts`'s `PII_FIELD_REGEX`.
4. Write a unit test in `tests/unit/scrub.test.ts` that fails if the field surfaces unscrubbed.
5. Deploy the fix.
6. Post-mortem: was the field name an obvious one we missed, or a non-obvious one (e.g., a snake_case backend field)? Update the regex generously; false positives there are harmless.

## P1 — OTP code not arriving

1. **Reproducer:** request OTP on `/ru/auth/otp` with a known number. Wait 30s.
2. **Backend log:** `tail -n 50 /tmp/backend.log | grep -E 'sms_enqueued|sms_sent'`.
   - `sms_enqueued` only → ARQ worker not running. Restart backend's `arq-worker` container.
   - `sms_sent` with provider error → check backend's Q13 (Nikita SMS) status. If Nikita is down, fall back to dev-mode `PHARMACY_BACKEND_SMS_PROVIDER=fake` only after legal sign-off (we do NOT silently send no SMS in production).
3. **Customer-side path:** confirm the customer's phone is in our format (`+996…`). Mistyped numbers are the most common false-positive — `+996 700 12 34 56` is the canonical shape (DESIGN §18.x). FE strips and re-validates via `libphonenumber-js`.
4. **Rate limit:** backend rate-limits per-phone (5/hour). The FE shows `t("auth.otp.too_many")` when this trips. Check `auth.rate_limited` in the FE log breadcrumbs.

## P1 — `POST /checkout/place` returns 5xx

1. **Idempotency-key first.** The FE mints one UUID per submission attempt. Confirm via Sentry → look for `category: "checkout.idempotency"` breadcrumb. The same UUID resent on retry is correct behaviour (Phase 9 D5+).
2. **Backend correlation.** Grab `X-Request-ID` from the FE error → search backend Sentry. If backend has the same error, switch to backend's runbook.
3. **`409 checkout_conflict`** is NOT a 5xx. It's a structured success surface — `<ConflictBanner />` renders inline with `Edit cart` CTA. If customers report seeing a generic error page instead, the conflict-resolution flow regressed; check `lib/checkout/mutations.ts`'s error branching.
4. **`409 idempotency_conflict`** with the same UUID means the backend deduplication accepted our retry. The FE's `consumeAutoRetry()` returns `null` after the first auto-retry (one-retry-max rule). If we see a runaway loop in production, that's a critical regression — rollback immediately.

## P1 — Cart-merge loses guest items after OTP login

1. Reproduce in dev: add an item as guest → OTP-verify → check `/cart`.
2. Check `lib/cart/merge.ts` and the OTP-verify success handler (`app/[locale]/auth/otp/page.tsx`). The locked sequence is:
   ```
   verify OTP → snapshot guest cart (fresh GET /cart)
              → set tokens
              → mergeGuestCartIntoUser
              → invalidateQueries(cartQueryKey)
              → router.replace(returnUrl)
   ```
   Step 4 invalidate before step 5 redirect (Phase 8 D12 R-C echo). If a refactor reorders these, customers see an empty-cart flash.
3. **Long-term fix:** OQ-16 requests a `POST /api/v1/cart/merge` backend endpoint. Until then, the FE's sequential re-add is best-effort and loses price snapshots (which is consistent with backend revalidation behaviour).

## P2 — Locale switch breaks current page

1. The locale switcher (`components/i18n/LangSwitcher.tsx`) does a path-swap regex (`pathname.replace(/^\/[a-z]{2}/, ...)`). Routes that include locale-only segments (`/ru/orders/PH-2026-12345`) should swap cleanly to `/en/orders/PH-2026-12345`.
2. If it lands on a 404, the new locale's path doesn't exist — usually a missing translation chain (e.g., a category slug that's only in `ru` seed data). Confirm with `curl -I https://nookat.kg/en/categories/<slug>`.
3. **Workaround:** the catalog catch-and-empty contract degrades to `EmptyState` rather than 500. So this is a soft failure that's still better than a crash.

## P2 — PDP shows OOS but category page shows in-stock (OQ-24)

This is a **known backend bug** tracked as OQ-24 in `OPEN_QUESTIONS.md`. Backend's `GET /api/v1/products/{slug}` reads `is_in_stock=false` even when the category endpoint reports the same product as in-stock for the same branch. Different code paths in `app/domain/catalog/storefront.py`.

**Customer impact:** browses category → sees in-stock → clicks PDP → sees OOS → leaves. Conversion-killer.

**Pre-launch action:** backend audit + fix required before public launch (`BUILD_PROGRESS.md > Pre-launch checklist > Backend blockers`). The FE has the regression marker in `tests/e2e/cart-flow.spec.ts` line 105 (`expect(cta).toBeDisabled()` on PDP). Flip when backend ships the fix.

## P2 — Sentry has no recent events but site looks fine

Either:

- DSN is unset (no-op contract).
- Sample rate is filtering everything (`tracesSampleRate: 0.1` is normal).
- Network issue between Coolify VPS and Sentry's ingest endpoint.

Check `curl -sI https://o*.ingest.sentry.io/api/<project>/store/` from the VPS. If unreachable, add the Sentry hostname to the VPS firewall outbound allow-list.

## P3 — A11y regression flagged by axe e2e

The Phase 11E e2e a11y suite hard-fails on `impact === "critical"`. If the gate goes red:

1. Read the test output for the violation node + helpUrl.
2. Fix the markup. Critical violations are usually missing `aria-label`, `<button>` without label, focus-trap missing, etc.
3. Don't downgrade the gate — the bar is the bar.

Serious-tier (color-contrast, `<dl>` structure on /about) is tracked as `BUILD_PROGRESS.md > Backlog > A11y polish` for the pre-launch human pass.

## Communication during an incident

1. **In Slack/Telegram (incident channel):** post the URL of the incident, current status, and ETA in the first 5 min.
2. **Update every 15 min** until resolved.
3. **After resolved:** post the post-mortem link within 24h.
4. **Status page** (when one exists): set to "Investigating" → "Identified" → "Monitoring" → "Resolved."

For now (pre-launch), there's no public status page. The internal team uses GitHub Issues with the `incident` label.

## Post-mortem template

```
# Incident: <YYYY-MM-DD> <one-line summary>

## What happened
What customers saw, when it started, when it was fixed.

## Root cause
The actual bug. Link to the commit / Sentry issue.

## Why CI didn't catch it
What test we lacked. The fix usually adds a regression test.

## Impact
Number of affected users, requests, or just "<10 customers in the X-min window."

## Timeline
- HH:MM — first signal
- HH:MM — paged
- HH:MM — root cause identified
- HH:MM — fix deployed
- HH:MM — verified resolved

## Follow-ups
- [ ] Add regression test (link)
- [ ] Update runbook (link)
- [ ] Backend ask if relevant (link)
```

Store post-mortems under `docs/incidents/YYYY-MM-DD-<slug>.md`.
