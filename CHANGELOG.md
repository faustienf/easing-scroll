# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

_Nothing yet._

## 1.2.1 — 2026-08-16

Infrastructure only — the library itself is unchanged from 1.2.0.

### Build

- Publishing moved to GitHub Actions on tag push, authenticated with npm trusted
  publishing over OIDC instead of a long-lived token, so releases now carry a
  provenance statement. `npm version` no longer publishes from a developer
  machine, and `prepublishOnly` refuses to.

## 1.2.0 — 2026-08-14

### Added

- `window` is accepted as a scroll target and resolves to
  `document.scrollingElement`, so `top`/`left` line up with `scrollY`/`scrollX`.
  Windows from other realms (an iframe's `contentWindow`) are detected too.
- The promise now rejects when the `easing` function throws. Previously the throw
  escaped the frame callback and left the promise pending forever.

### Fixed

- Omitting `top` or `left` now really leaves that axis alone. Clamping used to
  overwrite the omitted value with the current scroll position, so a horizontal
  animation pinned the vertical position for its whole duration (and reverted any
  scrolling the user did meanwhile).
- `easing` is called once per frame instead of once per axis, and never with a
  value outside `0`–`1`. Overshoot and clamping curves no longer receive
  out-of-range input on the final frame.
- `duration: Infinity` scrolls instantly instead of starting an animation that
  never completes, leaving an unbounded `requestAnimationFrame` loop behind.
- `duration: NaN` scrolls instantly. It previously slipped past the
  `duration <= 0` check.
- `exports` resolved ESM type declarations for CJS consumers. The `types`
  condition sat above `require`, so it matched first and the nested
  `require.types` was never reached — `require("easing-scroll")` got
  `.d.ts` (ESM) types for a `.cjs` implementation. Types are now declared inside
  the `import` and `require` conditions instead.

### Changed

- The target type parameter was widened from `<E extends Element>` to
  `<E extends ScrollTarget>` (`Element | Window`). Existing call sites keep
  compiling, including those that pass an explicit type argument such as
  `easingScroll<HTMLDivElement>(el, …)`.

### Build

- Replaced tsup with [tsdown](https://tsdown.dev), which supports TypeScript 7;
  tsup's `rollup-plugin-dts` crashes on it. Published file names are unchanged.
- TypeScript upgraded to 7.0.
- `publint` and `are-the-types-wrong` now run on every build.
- The repository is a pnpm workspace. `example` is a member and depends on
  `easing-scroll` via `workspace:*`, so the demo consumes the built package
  instead of aliasing the library source — the same resolution a published
  consumer gets. Its `dev`, `build` and `check-types` scripts build the library
  first, so a fresh clone works without a manual step.
- The `pre-commit` hook now runs the test suite, and its `example` type check
  uses `tsc -b`; plain `tsc` matched zero files on a solution-style tsconfig, so
  that step had never checked anything.

### Documentation

- README covers RTL containers, `window` targets, interrupting on user input, and
  a Caveats section for `scroll-behavior: smooth`, concurrent calls,
  `prefers-reduced-motion`, the extra `scroll` event, and overshoot easings.

## 1.1.0 — 2026-08-14

Tagged but never published to npm: the publish failed on an expired token and the
version was bumped instead of the publish being retried. Its changes are the ones
listed under 1.2.0, which is identical in content.

## 1.0.5 — 2026-02-28

### Fixed

- Skip the animation when the clamped target already matches the current scroll
  position, instead of running the full duration without moving.
