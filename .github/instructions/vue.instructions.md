---
description: "Use when creating or modifying Vue single-file components. Covers component ownership, kebab-case nesting, compact script logic, and semantic TSDoc documentation."
name: "Vue Guidelines"
applyTo: "**/*.vue"
---
# Vue Guidelines

- Define exactly one Vue component per `.vue` file.
- Use PascalCase component filenames and kebab-case directories.
- Place direct child components owned by `ParentComponent.vue` in a sibling `parent-component/` directory. Nest each subsequent owned level in the kebab-case directory of its parent component.

```text
components/
  ParentComponent.vue
  parent-component/
    ChildComponent.vue
    child-component/
      GrandchildComponent.vue
```

- Keep `script` logic compact and direct. Inline a transformation, condition, or call when a helper would only wrap that single expression or has one call site.
- Do not introduce one-line wrapper functions. Extract behavior only when it has a meaningful domain name, is reused, owns non-trivial behavior, or makes the component's control flow clearer.
- Add a semantic TSDoc comment to every declaration you add or modify that has a contract or behavior: components, composables, props, emits, functions, computed state, watchers, exported types, and non-obvious local helpers or state.
- State intent, domain meaning, inputs or invariants, and externally visible effect in the TSDoc. Do not narrate syntax or repeat identifiers.
- Keep TSDoc concise, specific, and useful during review. Do not use empty comments such as "Toggles fullscreen".

```vue
<script lang="ts" setup>
  /**
   * Keeps the selected workspace area expanded until the user restores the layout.
   */
  const fullscreenArea = ref<WorkspaceArea | null>(null)
</script>
```
