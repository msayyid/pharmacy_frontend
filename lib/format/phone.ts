import { parsePhoneNumberFromString } from "libphonenumber-js"

// Phone helpers shared by the auth OTP flow + the address forms (Phase 5+)
// and the BRAND.supportPhone display in PhoneCallButton.
//
// Per CLAUDE.md > Domain reality checks > Phone number format:
//   Display: "+996 700 12 34 56" (E.164 grouped)
//   Storage: "+996700123456" (E.164)
//   Default region for parsing: "KG" — matches the backend's `phonenumbers`
//   default per pharmacy_backend/app/core/security.py.

export function formatPhoneE164(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "KG")
  return parsed?.isValid() ? parsed.format("E.164") : null
}

export function formatPhoneDisplay(input: string): string {
  const parsed = parsePhoneNumberFromString(input, "KG")
  return parsed?.isValid() ? parsed.formatInternational() : input
}

export function isValidPhone(input: string): boolean {
  const parsed = parsePhoneNumberFromString(input, "KG")
  return parsed?.isValid() ?? false
}
