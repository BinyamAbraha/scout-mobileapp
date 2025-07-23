## Implementation Best Practices

### 0 — Purpose

These rules ensure maintainability, safety, and developer velocity for Scout (React Native/Expo app).
**MUST** rules are enforced by CI; **SHOULD** rules are strongly recommended.

---

### 1 — Before Coding

- **BP-1 (MUST)** Ask the user clarifying questions.
- **BP-2 (SHOULD)** Draft and confirm an approach for complex work.
- **BP-3 (SHOULD)** If ≥ 2 approaches exist, list clear pros and cons.

---

### 2 — While Coding

- **C-1 (MUST)** Follow TDD: scaffold stub -> write failing test -> implement.
- **C-2 (MUST)** Name functions with existing domain vocabulary for consistency.
- **C-3 (SHOULD NOT)** Introduce classes when small testable functions suffice.
- **C-4 (SHOULD)** Prefer simple, composable, testable functions.
- **C-5 (MUST)** Prefer branded `type`s for IDs
  ```ts
  type VenueId = Brand<string, "VenueId">; // ✅ Good
  type VenueId = string; // ❌ Bad
  ```
- **C-6 (MUST)** Use `import type { … }` for type-only imports.
- **C-7 (SHOULD NOT)** Add comments except for critical caveats; rely on self‑explanatory code.
- **C-8 (SHOULD)** Default to `type`; use `interface` only when more readable or interface merging is required.
- **C-9 (SHOULD NOT)** Extract a new function unless it will be reused elsewhere, is the only way to unit-test otherwise untestable logic, or drastically improves readability of an opaque block.
- **C-10 (MUST)** Use absolute imports with `@/` prefix for src files.
- **C-11 (SHOULD)** Prefer functional components with hooks over class components.

---

### 3 — React Native Specific

- **RN-1 (MUST)** Use `StyleSheet.create()` for component styles.
- **RN-2 (SHOULD)** Prefer NativeWind/Tailwind classes over inline styles when possible.
- **RN-3 (MUST)** Handle platform differences with `Platform.OS` when needed.
- **RN-4 (SHOULD)** Use `useMemo` and `useCallback` for expensive computations and functions passed to children.
- **RN-5 (MUST)** Type navigation props with proper param lists from `@/types/index.ts`.
- **RN-6 (SHOULD)** Use `SafeAreaView` or `useSafeAreaInsets` for screen components.
- **RN-7 (MUST)** Handle loading and error states in all async operations.

---

### 4 — Testing

- **T-1 (MUST)** For a simple function, colocate unit tests in `*.test.ts` in same directory as source file.
- **T-2 (MUST)** For components, create tests in `__tests__/` directory or colocate as `*.test.tsx`.
- **T-3 (MUST)** ALWAYS separate pure-logic unit tests from component integration tests.
- **T-4 (SHOULD)** Prefer React Native Testing Library for component tests.
- **T-5 (SHOULD)** Unit-test complex algorithms and business logic thoroughly.
- **T-6 (SHOULD)** Test the entire structure in one assertion if possible

  ```ts
  expect(result).toEqual([value]); // Good

  expect(result).toHaveLength(1); // Bad
  expect(result[0]).toBe(value); // Bad
  ```

- **T-7 (MUST)** Mock external services (Supabase, weather API) in tests.
- **T-8 (SHOULD)** Test component behavior, not implementation details.

---

### 5 — Database (Supabase)

- **D-1 (MUST)** Type Supabase queries using generated types from `supabase gen types`.
- **D-2 (SHOULD)** Handle Supabase errors gracefully and return typed `ApiResponse<T>` objects.
- **D-3 (MUST)** Use RLS (Row Level Security) policies for all database operations.
- **D-4 (SHOULD)** Create reusable query functions in `src/services/` rather than inline queries.
- **D-5 (MUST)** Handle offline scenarios and sync conflicts appropriately.

---

### 6 — Code Organization

- **O-1 (MUST)** Place reusable components in `src/components/` with clear subdirectories.
- **O-2 (MUST)** Keep screen components in `src/screens/`.
- **O-3 (MUST)** Place custom hooks in `src/hooks/`.
- **O-4 (MUST)** Keep service functions in `src/services/`.
- **O-5 (SHOULD)** Group related types in `src/types/index.ts`.
- **O-6 (SHOULD)** Keep utility functions in `src/utils/`.

---

### 7 — Tooling Gates

- **G-1 (MUST)** `npx prettier --check .` passes.
- **G-2 (MUST)** `npx tsc --noEmit` passes (type checking).
- **G-3 (MUST)** `npx eslint . --ext .ts,.tsx` passes (when ESLint is configured).
- **G-4 (MUST)** `npm test` passes (when tests are configured).
- **G-5 (SHOULD)** `expo build` completes without errors.

---

## Writing Functions Best Practices

When evaluating whether a function you implemented is good or not, use this checklist:

1. Can you read the function and HONESTLY easily follow what it's doing? If yes, then stop here.
2. Does the function have very high cyclomatic complexity? (number of independent paths, or, in a lot of cases, number of nesting if if-else as a proxy). If it does, then it's probably sketchy.
3. Are there any common data structures and algorithms that would make this function much easier to follow and more robust? Parsers, trees, stacks / queues, etc.
4. Are there any unused parameters in the function?
5. Are there any unnecessary type casts that can be moved to function arguments?
6. Is the function easily testable without mocking core features (e.g. Supabase queries, external APIs, etc.)? If not, can this function be tested as part of an integration test?
7. Does it have any hidden untested dependencies or any values that can be factored out into the arguments instead? Only care about non-trivial dependencies that can actually change or affect the function.
8. Brainstorm 3 better function names and see if the current name is the best, consistent with rest of codebase.

IMPORTANT: you SHOULD NOT refactor out a separate function unless there is a compelling need, such as:

- the refactored function is used in more than one place
- the refactored function is easily unit testable while the original function is not AND you can't test it any other way
- the original function is extremely hard to follow and you resort to putting comments everywhere just to explain it

## Writing Tests Best Practices

When evaluating whether a test you've implemented is good or not, use this checklist:

1. SHOULD parameterize inputs; never embed unexplained literals such as 42 or "foo" directly in the test.
2. SHOULD NOT add a test unless it can fail for a real defect. Trivial asserts (e.g., expect(2).toBe(2)) are forbidden.
3. SHOULD ensure the test description states exactly what the final expect verifies. If the wording and assert don't align, rename or rewrite.
4. SHOULD compare results to independent, pre-computed expectations or to properties of the domain, never to the function's output re-used as the oracle.
5. SHOULD follow the same lint, type-safety, and style rules as prod code (prettier, ESLint, strict types).
6. SHOULD express invariants or axioms (e.g., commutativity, idempotence, round-trip) rather than single hard-coded cases whenever practical. Use `@testing-library/jest-dom` matchers for React Native components.
7. Unit tests for a function should be grouped under `describe(functionName, () => ...`.
8. Use `expect.any(...)` when testing for parameters that can be anything (e.g. variable ids).
9. ALWAYS use strong assertions over weaker ones e.g. `expect(x).toEqual(1)` instead of `expect(x).toBeGreaterThanOrEqual(1)`.
10. SHOULD test edge cases, realistic input, unexpected input, and value boundaries.
11. SHOULD NOT test conditions that are caught by the type checker.
12. For React Native components, test user interactions and accessibility.

## Code Organization

- `src/components/` - Reusable UI components organized by feature/type
  - `src/components/ui/` - Basic UI components (buttons, inputs, etc.)
  - `src/components/venue/` - Venue-specific components
  - `src/components/mood/` - Mood-related components
  - `src/components/search/` - Search functionality components
  - `src/components/modals/` - Modal components
- `src/screens/` - Screen components for navigation
- `src/hooks/` - Custom React hooks
- `src/services/` - External service integrations (Supabase, weather API)
- `src/utils/` - Utility functions and helpers
- `src/types/` - TypeScript type definitions
- `src/navigation/` - Navigation configuration

## Remember Shortcuts

Remember the following shortcuts which the user may invoke at any time.

### QNEW

When I type "qnew", this means:

```
Understand all BEST PRACTICES listed in CLAUDE.md.
Your code SHOULD ALWAYS follow these best practices.
```

### QPLAN

When I type "qplan", this means:

```
Analyze similar parts of the codebase and determine whether your plan:
- is consistent with rest of codebase
- introduces minimal changes
- reuses existing code
- follows React Native/Expo conventions
```

## QCODE

When I type "qcode", this means:

```
Implement your plan and make sure your new tests pass.
Always run tests to make sure you didn't break anything else.
Always run `npx prettier --write .` on the newly created files to ensure standard formatting.
Always run `npx tsc --noEmit` to make sure type checking passes.
```

### QCHECK

When I type "qcheck", this means:

```
You are a SKEPTICAL senior software engineer.
Perform this analysis for every MAJOR code change you introduced (skip minor changes):

1. CLAUDE.md checklist Writing Functions Best Practices.
2. CLAUDE.md checklist Writing Tests Best Practices.
3. CLAUDE.md checklist Implementation Best Practices.
4. React Native specific best practices.
```

### QCHECKF

When I type "qcheckf", this means:

```
You are a SKEPTICAL senior software engineer.
Perform this analysis for every MAJOR function you added or edited (skip minor changes):

1. CLAUDE.md checklist Writing Functions Best Practices.
```

### QCHECKT

When I type "qcheckt", this means:

```
You are a SKEPTICAL senior software engineer.
Perform this analysis for every MAJOR test you added or edited (skip minor changes):

1. CLAUDE.md checklist Writing Tests Best Practices.
```

### QUX

When I type "qux", this means:

```
Imagine you are a human UX tester of the feature you implemented.
Output a comprehensive list of scenarios you would test, sorted by highest priority.
Focus on mobile UX patterns, accessibility, and cross-platform considerations.
```

### QGIT

When I type "qgit", this means:

```
Add all changes to staging, create a commit, and push to remote.

Follow this checklist for writing your commit message:
- SHOULD use Conventional Commits format: https://www.conventionalcommits.org/en/v1.0.0
- SHOULD NOT refer to Claude or Anthropic in the commit message.
- SHOULD structure commit message as follows:
<type>[optional scope]: <description>
[optional body]
[optional footer(s)]
- commit SHOULD contain the following structural elements to communicate intent:
fix: a commit of the type fix patches a bug in your codebase (this correlates with PATCH in Semantic Versioning).
feat: a commit of the type feat introduces a new feature to the codebase (this correlates with MINOR in Semantic Versioning).
BREAKING CHANGE: a commit that has a footer BREAKING CHANGE:, or appends a ! after the type/scope, introduces a breaking API change (correlating with MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of any type.
types other than fix: and feat: are allowed, for example @commitlint/config-conventional (based on the Angular convention) recommends build:, chore:, ci:, docs:, style:, refactor:, perf:, test:, and others.
footers other than BREAKING CHANGE: <description> may be provided and follow a convention similar to git trailer format.
```
