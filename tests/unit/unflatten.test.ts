import { describe, expect, it } from "vitest"

import { unflattenMessages } from "@/i18n/unflatten"

describe("unflattenMessages", () => {
  it("converts a single flat-dotted key into nested objects", () => {
    expect(unflattenMessages({ "auth.otp.title": "Введите номер" })).toEqual({
      auth: { otp: { title: "Введите номер" } },
    })
  })

  it("merges multiple keys sharing a namespace", () => {
    expect(
      unflattenMessages({
        "auth.otp.title": "T",
        "auth.otp.send_button": "S",
        "error.generic": "E",
      }),
    ).toEqual({
      auth: { otp: { title: "T", send_button: "S" } },
      error: { generic: "E" },
    })
  })

  it("preserves single-segment keys at the root", () => {
    expect(unflattenMessages({ greeting: "hi", farewell: "bye" })).toEqual({
      greeting: "hi",
      farewell: "bye",
    })
  })

  it("throws when a string key collides with a namespace", () => {
    expect(() => unflattenMessages({ auth: "x", "auth.otp.title": "y" })).toThrow(/collide/)
  })

  it("throws when a namespace collides with an existing string leaf", () => {
    expect(() => unflattenMessages({ "auth.otp": "x", "auth.otp.title": "y" })).toThrow(/collide/)
  })

  it("returns an empty object for an empty input", () => {
    expect(unflattenMessages({})).toEqual({})
  })

  it("handles a deeply nested key", () => {
    expect(unflattenMessages({ "a.b.c.d.e": "deep" })).toEqual({
      a: { b: { c: { d: { e: "deep" } } } },
    })
  })
})
