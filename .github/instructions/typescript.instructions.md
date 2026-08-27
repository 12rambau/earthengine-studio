---
description: "Use when creating or modifying TypeScript or TSX code. Enforces compact, reviewable TypeScript with semantic TSDoc documentation."
name: "TypeScript Guidelines"
applyTo: "**/*.{ts,tsx}"
---
# TypeScript Guidelines

- Keep implementation compact and direct. Inline a transformation, condition, or call when a named helper would only wrap that one expression or has one call site.
- Do not introduce one-line wrapper functions. Extract a function only when it has a meaningful domain name, owns non-trivial behavior, is reused, or makes the surrounding control flow clearer.
- Prefer existing types, utilities, and module boundaries to new abstractions.
- Add a semantic TSDoc comment to every declaration you add or modify that has a contract or behavior: functions, methods, classes, interfaces, type aliases, exported constants, composables, and non-obvious local helpers or state.
- State intent, domain meaning, inputs or invariants, and externally visible effect in the TSDoc. Do not narrate syntax or repeat identifiers.
- Keep TSDoc concise, specific, and useful during review. Do not use empty comments such as "Gets the sidebar width".

```ts
/**
 * Builds the grid tracks that preserve the editor's remaining horizontal space.
 */
function getWorkspaceGridLayout (preferences: LayoutPreferences) {
  // ...
}
```
