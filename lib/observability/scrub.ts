// PII scrubber for Sentry beforeSend / breadcrumb data. Phase 11D.
//
// Sacred-invariant #8: no PII logged client-side. Sentry's default scrubbers
// catch a few patterns (credit cards, IPs) but our PII surface is shaped
// differently — we care about phone, email, and address fields. The
// approach is field-name-based: any object key matching a known-PII regex
// has its value replaced with `[redacted]` recursively.
//
// We deliberately do NOT regex-scan string values for "anything that
// looks like a phone number" — that would corrupt order numbers (PH-…),
// SKUs, and other legitimate identifiers. The contract is:
//
//   - Producer side: `trace()` and `log()` callers pass typed objects.
//     PII goes in fields named `phone`, `email`, `address`, `recipient`,
//     etc. Those field names are caught here.
//   - Consumer side: this scrubber runs at the Sentry boundary so even
//     if a future consumer accidentally puts a phone in a non-canonical
//     field, the most common shapes still get filtered.

const PII_FIELD_REGEX =
  /^(phone|email|address|recipient|recipient_phone|recipient_name|customer_notes|delivery_address|line1|street|apartment|firstname|lastname|first_name|last_name|password|token|access_token|refresh_token)$/i

const REDACTED = "[redacted]"

export function scrubPii<T>(value: T): T {
  return scrubValue(value, new WeakSet()) as T
}

function scrubValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== "object") return value
  if (seen.has(value as object)) return value
  seen.add(value as object)

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, seen))
  }

  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (PII_FIELD_REGEX.test(key)) {
      out[key] = REDACTED
    } else {
      out[key] = scrubValue(obj[key], seen)
    }
  }
  return out
}
