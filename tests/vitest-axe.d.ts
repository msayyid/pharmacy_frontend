// Phase 11E — vitest-axe ships an `Assertion` augmentation under the
// legacy `namespace Vi`, which doesn't merge with vitest 4's own
// `Assertion` interface (the matcher works at runtime via expect.extend
// in tests/setup.ts but TypeScript can't see it). We re-augment under
// the modern `vitest` module so `expect(...).toHaveNoViolations()` is
// type-checked.
import "vitest"

interface AxeAssertion {
  toHaveNoViolations(): void
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<_T = unknown> extends AxeAssertion {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeAssertion {}
}
