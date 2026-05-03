// Unflatten a flat-dotted i18n JSON into a nested object.
//
// Per Phase 4 D2 our messages files (messages/<locale>.json) are stored as
// flat dotted keys mirroring the backend's app/i18n/<lang>.json shape. This
// makes diffs trivial and lets a backend error code ("rate_limited") pass
// straight into t("error.rate_limited") with no path translation.
//
// next-intl 4.x, however, treats `.` in t(key) as a path separator and
// navigates the messages object accordingly: t("auth.otp.title") looks up
// messages.auth.otp.title, NOT messages["auth.otp.title"]. So we keep the
// flat JSON for backend parity and convert it once at load time.

export type NestedMessages = {
  [key: string]: string | NestedMessages
}

export function unflattenMessages(flat: Record<string, string>): NestedMessages {
  const out: NestedMessages = {}

  for (const [key, value] of Object.entries(flat)) {
    const segments = key.split(".")
    let cursor: NestedMessages = out

    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i]!
      const existing = cursor[segment]
      if (existing === undefined) {
        const next: NestedMessages = {}
        cursor[segment] = next
        cursor = next
      } else if (typeof existing === "string") {
        // A flat key collides with a nested path (e.g. both "auth" and
        // "auth.otp.title" exist). Throw — this is a bug in the JSON, not
        // something we should silently paper over.
        throw new Error(
          `unflattenMessages: key "${key}" collides with existing string at "${segments.slice(0, i + 1).join(".")}"`,
        )
      } else {
        cursor = existing
      }
    }

    const leaf = segments[segments.length - 1]!
    if (typeof cursor[leaf] === "object") {
      throw new Error(`unflattenMessages: key "${key}" collides with existing namespace`)
    }
    cursor[leaf] = value
  }

  return out
}
