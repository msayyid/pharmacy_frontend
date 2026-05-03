export const BRAND = {
  name: "Nookat",
  nameLocalized: {
    ru: "Ноокат",
    ky: "Ноокат",
    en: "Nookat",
  },
  tagline: {
    ru: "Аптека, которой доверяют",
    ky: "Ишеничтүү аптека",
    en: "The pharmacy people trust",
  },
  domain: "nookat.kg",
  supportPhone: "+996 XXX XX XX XX",
  licenseNumber: "№XXXXX",
  address: {
    ru: "г. Ноокат, Ошская область, Кыргызстан",
    ky: "Ноокат шаары, Ош облусу, Кыргызстан",
    en: "Nookat, Osh region, Kyrgyzstan",
  },
} as const

export type BrandConfig = typeof BRAND
export type BrandLocale = keyof typeof BRAND.nameLocalized
