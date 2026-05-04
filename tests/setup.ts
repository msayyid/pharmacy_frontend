import "@testing-library/jest-dom/vitest"
import { expect } from "vitest"
import * as axeMatchers from "vitest-axe/matchers"
import "vitest-axe/extend-expect"

// Phase 11E: vitest-axe ships an empty extend-expect.js shim in its dist
// (entrypoint regression in 0.1.0). Wire the matcher manually so component
// tests can do `expect(await axe(container)).toHaveNoViolations()`.
expect.extend(axeMatchers)
