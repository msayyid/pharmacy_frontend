import { z } from "zod"

import { isValidPhone } from "@/lib/format/phone"

// Zod schemas for the OTP flow. Error messages are i18n KEYS (not literals)
// per CLAUDE.md hard prohibition #3: never hardcode user-visible strings.
// The form layer maps the key to a translated string via `t(message)`.

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, { message: "error.phone_required" })
    .refine(isValidPhone, { message: "error.invalid_phone" }),
})

export const codeSchema = z.object({
  code: z
    .string()
    .min(6, { message: "error.code_required" })
    .max(6, { message: "error.code_required" })
    .regex(/^\d{6}$/, { message: "error.code_required" }),
})

export type PhoneFormValues = z.infer<typeof phoneSchema>
export type CodeFormValues = z.infer<typeof codeSchema>
