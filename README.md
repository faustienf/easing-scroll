# easing-scroll

[![npm version](https://img.shields.io/npm/v/easing-scroll.svg)](https://npmjs.org/package/easing-scroll)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/easing-scroll)](https://bundlephobia.com/package/easing-scroll)
[![license](https://img.shields.io/npm/l/easing-scroll.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org)

Programmatic smooth scrolling with custom easing, abort support, and promise-based completion tracking.

[Demo](https://easing-scroll.vercel.app)

## Highlights

- **Zero dependencies** — ~450 bytes min+gzip
- **TypeScript-first** — written in TypeScript, ships type declarations
- **Dual package** — ESM and CJS builds
- **Customizable** — bring your own [easing function](https://easings.net)
- **Cancellable** — abort with [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- **Promise-based** — `await` completion or track partial progress
- **Universal** — works with any scrollable `Element`

## Install

```sh
npm install easing-scroll
```

```sh
pnpm add easing-scroll
```

## Quick Start

```ts
import { easingScroll } from "easing-scroll";

const container = document.querySelector(".container");

await easingScroll(container, {
  top: 300,
  duration: 400,
  easing: (x) => 1 - Math.pow(1 - x, 3), // easeOutCubic
});
```

## API

### `easingScroll(target, options): Promise<number>`

Smoothly scrolls `target` to the given position.

#### `target`

Type: `Element`

Any scrollable DOM element.

#### `options`

| Option     | Type                    | Default    | Description                                                                  |
| ---------- | ----------------------- | ---------- | ---------------------------------------------------------------------------- |
| `top`      | `number`                | —          | Target vertical scroll position in pixels                                    |
| `left`     | `number`                | —          | Target horizontal scroll position in pixels                                  |
| `duration` | `number`                | `0`        | Animation duration in milliseconds                                           |
| `easing`   | `(t: number) => number` | `(t) => t` | [Easing function](https://easings.net) mapping progress (0–1) to eased value |
| `signal`   | `AbortSignal`           | —          | Signal to cancel the animation                                               |

#### Return value

Resolves with a `number` between `0` and `1` representing animation progress:

| Value       | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| `1`         | Animation completed fully                            |
| `0 < x < 1` | Animation was aborted at _x_ progress                |
| `0`         | Animation never started (signal was already aborted) |

### Behavior

- **Instant scroll** — when `duration` is `0` or negative, the element scrolls instantly and resolves `1`.
- **No-op** — when both `top` and `left` are omitted, resolves `1` immediately.
- **Clamping** — scroll values are clamped to the element's scrollable range. No visual flash occurs.
- **Already-aborted signal** — resolves `0` without scrolling.

## Examples

### Custom Easing

The default easing is linear `(t) => t`. Pass any function from [easings.net](https://easings.net):

```ts
await easingScroll(element, {
  top: 500,
  duration: 600,
  // https://easings.net/#easeOutCubic
  easing: (x) => 1 - Math.pow(1 - x, 3),
});
```

### Abort Scrolling

Use an `AbortController` to cancel an in-flight animation:

```ts
const controller = new AbortController();

setTimeout(() => controller.abort(), 100);

const progress = await easingScroll(element, {
  top: 1000,
  duration: 400,
  signal: controller.signal,
});

if (progress < 1) {
  console.log(`Aborted at ${Math.round(progress * 100)}%`);
}
```

### React Hook

A reusable hook that cancels the previous scroll when dependencies change or the component unmounts:

```tsx
import { useEffect, RefObject } from "react";
import { easingScroll } from "easing-scroll";

function useEasingScroll(ref: RefObject<HTMLElement | null>, top: number) {
  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const controller = new AbortController();

    easingScroll(target, {
      top,
      duration: 400,
      signal: controller.signal,
      easing: (x) => 1 - Math.pow(1 - x, 3),
    });

    return () => controller.abort();
  }, [top]);
}
```

## License

[MIT](LICENSE)
