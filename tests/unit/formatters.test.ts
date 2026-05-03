import { describe, expect, it } from "vitest"

import { formatDate } from "@/lib/format/date"
import { formatNumber } from "@/lib/format/number"
import { formatPhoneDisplay, formatPhoneE164, isValidPhone } from "@/lib/format/phone"
import { formatPrice } from "@/lib/format/price"

const THIN_SPACE = " "

describe("formatPrice", () => {
  it("ru: thin-space thousands + comma decimal + lowercase сом suffix", () => {
    expect(formatPrice(1250, "ru")).toBe(`1${THIN_SPACE}250${THIN_SPACE}сом`)
    expect(formatPrice(45, "ru")).toBe(`45${THIN_SPACE}сом`)
  })

  it("ky: identical formatting to ru", () => {
    expect(formatPrice(1250, "ky")).toBe(`1${THIN_SPACE}250${THIN_SPACE}сом`)
  })

  it("en: comma thousands + KGS suffix", () => {
    expect(formatPrice(1250, "en")).toBe("1,250 KGS")
    expect(formatPrice(45, "en")).toBe("45 KGS")
  })

  it("handles large amounts (>9 999) per DESIGN §5.4", () => {
    expect(formatPrice(12500, "ru")).toBe(`12${THIN_SPACE}500${THIN_SPACE}сом`)
    expect(formatPrice(12500, "en")).toBe("12,500 KGS")
  })

  it("string input is parsed", () => {
    expect(formatPrice("1250", "ru")).toBe(`1${THIN_SPACE}250${THIN_SPACE}сом`)
  })

  it("hides decimals for whole numbers by default; shows with showDecimals", () => {
    expect(formatPrice(45.5, "ru")).toBe(`45,5${THIN_SPACE}сом`)
    expect(formatPrice(45, "ru", { showDecimals: true })).toBe(`45,00${THIN_SPACE}сом`)
    expect(formatPrice(45, "en", { showDecimals: true })).toBe("45.00 KGS")
  })

  it("returns empty string on NaN / Infinity", () => {
    expect(formatPrice(Number.NaN, "ru")).toBe("")
    expect(formatPrice("not a number", "ru")).toBe("")
    expect(formatPrice(Number.POSITIVE_INFINITY, "ru")).toBe("")
  })

  it("zero is a valid price (0 сом is something a free promotion might show)", () => {
    expect(formatPrice(0, "ru")).toBe(`0${THIN_SPACE}сом`)
    expect(formatPrice(0, "en")).toBe("0 KGS")
  })
})

describe("formatDate", () => {
  const date = new Date(Date.UTC(2026, 4, 3)) // 2026-05-03

  it("ru: DD.MM.YYYY default", () => {
    expect(formatDate(date, "ru")).toBe("03.05.2026")
  })

  it("ky: identical to ru per D11 (date-fns has no ky locale)", () => {
    expect(formatDate(date, "ky")).toBe("03.05.2026")
  })

  it("en: DD/MM/YYYY default", () => {
    expect(formatDate(date, "en")).toBe("03/05/2026")
  })

  it("custom pattern overrides default", () => {
    expect(formatDate(date, "ru", "yyyy-MM-dd")).toBe("2026-05-03")
  })

  it("ISO-string input is parsed", () => {
    expect(formatDate("2026-05-03T00:00:00Z", "ru")).toBe("03.05.2026")
  })

  it("invalid date returns empty string", () => {
    expect(formatDate("not-a-date", "ru")).toBe("")
  })
})

describe("formatNumber", () => {
  it("ru: thin-space thousands", () => {
    expect(formatNumber(1250, "ru")).toBe(`1${THIN_SPACE}250`)
  })

  it("en: comma thousands", () => {
    expect(formatNumber(1250, "en")).toBe("1,250")
  })

  it("respects Intl.NumberFormatOptions (e.g. style: 'percent')", () => {
    expect(formatNumber(0.42, "en", { style: "percent" })).toBe("42%")
  })

  it("returns empty on NaN", () => {
    expect(formatNumber(Number.NaN, "ru")).toBe("")
  })
})

describe("formatPhoneE164", () => {
  it("normalizes a valid KG mobile to E.164", () => {
    expect(formatPhoneE164("+996 700 12 34 56")).toBe("+996700123456")
    expect(formatPhoneE164("0700 12 34 56")).toBe("+996700123456")
    expect(formatPhoneE164("996700123456")).toBe("+996700123456")
  })

  it("returns null for invalid input", () => {
    expect(formatPhoneE164("123")).toBeNull()
    expect(formatPhoneE164("not a phone")).toBeNull()
    expect(formatPhoneE164("")).toBeNull()
  })

  it("accepts other KG mobile prefixes (770, 550, 220, 778)", () => {
    expect(formatPhoneE164("+996 770 12 34 56")).toBe("+996770123456")
    expect(formatPhoneE164("+996 550 12 34 56")).toBe("+996550123456")
  })
})

describe("formatPhoneDisplay", () => {
  it("groups for display per DESIGN §13.3 / PRODUCT §16.5", () => {
    expect(formatPhoneDisplay("+996700123456")).toBe("+996 700 123 456")
  })

  it("returns the raw input when invalid (so the user sees what they typed)", () => {
    expect(formatPhoneDisplay("123")).toBe("123")
  })
})

describe("isValidPhone", () => {
  it("accepts any of the supported entry formats", () => {
    expect(isValidPhone("+996700123456")).toBe(true)
    expect(isValidPhone("+996 700 12 34 56")).toBe(true)
    expect(isValidPhone("0700 12 34 56")).toBe(true)
  })

  it("rejects clearly-invalid inputs", () => {
    expect(isValidPhone("")).toBe(false)
    expect(isValidPhone("123")).toBe(false)
    expect(isValidPhone("not-a-phone")).toBe(false)
  })
})
