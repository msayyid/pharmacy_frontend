import { test, expect } from "@playwright/test"

// Catalog browse flow E2E — tagged @requires-backend so it's filtered out
// of the default CI run. Drives the J-01 partial: homepage → categories
// index → category detail → empty-state for in-stock filter.
//
// Requires backend up + catalog seeded:
//   cd ../pharmacy_backend && make docker-up && make migrate
//   uv run python -c "import app.domain.identity.models; import asyncio; \
//     from dev.fixtures.catalog.seed import main; asyncio.run(main())"
//   make dev 2>&1 | tee /tmp/backend.log
// Run locally:
//   pnpm e2e --grep @requires-backend tests/e2e/catalog-flow.spec.ts

test.describe("catalog browse", () => {
  test(
    "homepage renders chrome + featured categories from real backend data",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru")
      await expect(page.locator("header")).toBeVisible()
      await expect(page.locator("footer")).toBeVisible()
      // Hero CTA points at /categories per Phase 6 plan Q1.
      const cta = page.getByRole("link", { name: /Найти лекарства/ })
      await expect(cta).toBeVisible()
      await expect(cta).toHaveAttribute("href", "/ru/categories")
      // At least one symptom tile renders against seeded data.
      await expect(
        page.locator('[data-slot="home-symptoms"] a[href*="/symptoms/"]').first(),
      ).toBeVisible()
    },
  )

  test(
    "homepage hero CTA navigates to categories index",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru")
      await page.getByRole("link", { name: /Найти лекарства/ }).click()
      await expect(page).toHaveURL(/\/ru\/categories\b/)
      await expect(page.getByRole("heading", { level: 1, name: /Категории/ })).toBeVisible()
    },
  )

  test(
    "categories index links into a category detail page",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/categories")
      const firstCategoryLink = page.locator('[data-slot="category-tree"] a').first()
      await expect(firstCategoryLink).toBeVisible()
      await firstCategoryLink.click()
      // Category detail renders breadcrumb + h1 + products count.
      await expect(page.locator('[data-slot="breadcrumb"]')).toBeVisible()
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    },
  )

  test(
    "category detail with no in-stock products renders the empty-state path",
    { tag: "@requires-backend" },
    async ({ page }) => {
      // pain-relief is seeded with 3 products, all is_in_stock=false at the
      // current inventory state. With in_stock_only=true (Phase 6 plan D6
      // default), the list is empty and EmptyState renders.
      await page.goto("/ru/categories/pain-relief")
      await expect(page.getByRole("heading", { level: 1, name: /Обезболивающие/ })).toBeVisible()
      await expect(page.getByText(/В этой категории пока нет товаров/)).toBeVisible()
    },
  )

  test(
    "ky locale renders Kyrgyz-localized category name (R-D verification)",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ky/categories/pain-relief")
      // The ky translation in the seed JSON is "Оорутууну басаңдаткыч".
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/Оорутууну басаңдаткыч/)
    },
  )
})
