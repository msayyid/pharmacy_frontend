/** @type {import("prettier").Config} */
module.exports = {
  plugins: ["prettier-plugin-tailwindcss"],
  printWidth: 100,
  semi: false,
  singleQuote: false,
  trailingComma: "all",
  tailwindFunctions: ["cn", "clsx", "cva"],
}
