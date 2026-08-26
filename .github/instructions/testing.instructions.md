---
description: "Use when adding or modifying Vue components, TypeScript functions, composables, stores, or application behavior. Requires unit and component test coverage."
applyTo:
  - "src/**/*.ts"
  - "src/**/*.vue"
---
# Testing Requirements

- Add or update a unit test in `tests/unit/` for every changed function, composable, store, or other isolated behavior.
- Add or update a component test in `tests/components/` for every changed Vue component and its user-visible behavior.
- When a feature changes both logic and UI, cover it with both unit and component tests.
- Run `npm test` before completing the change. Linting, type-checking, and building do not replace automated tests.