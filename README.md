# easing-scroll

[![npm version](https://img.shields.io/npm/v/easing-scroll.svg)](https://npmjs.org/package/easing-scroll)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/easing-scroll)](https://bundlephobia.com/package/easing-scroll)
[![license](https://img.shields.io/npm/l/easing-scroll.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org)

Programmatic smooth scrolling with custom easing, abort support, and promise-based completion tracking.

[Demo](https://easing-scroll-liard.vercel.app)

## Highlights

- **Zero dependencies** — ~570 bytes min+gzip
- **TypeScript-first** — written in TypeScript, ships type declarations
- **Dual package** — ESM and CJS builds
- **Customizable** — bring your own [easing function](https://easings.net)
- **Cancellable** — abort with [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- **Promise-based** — `await` completion or track partial progress
- **Universal** — works with any scrollable `Element`, or `window` for the page

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

const container = document.querySelector(".container")!;

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

Type: `Element | Window`

Any scrollable DOM element, or `window` to scroll the page itself. A `window` is
resolved to `document.scrollingElement`, so `top`/`left` behave exactly like
`scrollY`/`scrollX`. Windows from other realms (an iframe's `contentWindow`) work
too.

```ts
// Back to top
await easingScroll(window, { top: 0, duration: 400 });
```

#### `options`

| Option     | Type                    | Default    | Description                                                                  |
| ---------- | ----------------------- | ---------- | ---------------------------------------------------------------------------- |
| `top`      | `number`                | —          | Target vertical scroll position in pixels                                    |
| `left`     | `number`                | —          | Target horizontal scroll position in pixels                                  |
| `duration` | `number`                | `0`        | Animation duration in milliseconds                                           |
| `easing`   | `(t: number) => number` | `(t) => t` | [Easing function](https://easings.net) mapping progress (0–1) to eased value |
| `signal`   | `AbortSignal`           | —          | Signal to cancel the animation                                               |

Omitting `top` or `left` leaves that axis untouched for the whole animation, so
a horizontal scroll never disturbs the vertical position and vice versa.

#### Return value

Resolves with a `number` between `0` and `1` representing animation progress:

| Value       | Meaning                                                          |
| ----------- | ---------------------------------------------------------------- |
| `1`         | Animation completed fully                                        |
| `0 < x < 1` | Animation was aborted at _x_ progress                            |
| `0`         | Animation never started, or was aborted before the first frame   |

Progress is measured against elapsed time, not against the easing curve — an
animation aborted halfway resolves `0.5` regardless of the easing used.

The promise rejects in exactly one case: the `easing` function threw.

### Behavior

- **Instant scroll** — when `duration` is not a finite positive number (`0`, negative, `NaN`, `Infinity`), the element scrolls instantly and resolves `1`.
- **No-op** — when both `top` and `left` are omitted, resolves `1` immediately.
- **Clamping** — scroll values are clamped to the element's scrollable range. No visual flash occurs.
- **Already at target** — when the clamped target is within 1px of the current position, resolves `1` without animating.
- **Already-aborted signal** — resolves `0` without scrolling.
- **Easing input** — `easing` is called once per frame, always with a value within `0`–`1`.
- **SSR** — importing the package touches no browser API. Calling `easingScroll` needs a DOM, so keep the call inside an effect or event handler.

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

### RTL Containers

`top` and `left` are passed straight to the browser, so `left` uses whatever
convention the browser itself uses for `direction: rtl`. In current browsers the
scroll origin sits at the right edge and `left` runs from `0` down to
`-(scrollWidth - clientWidth)`:

```ts
const container = document.querySelector<HTMLElement>(".rtl-container")!;

// Scroll 200px towards the start (left) of the content
await easingScroll(container, { left: -200, duration: 400 });

// Back to the resting position at the right edge
await easingScroll(container, { left: 0, duration: 400 });
```

Out-of-range values are clamped, so a positive `left` in an RTL container simply
resolves at `0`. When the direction is not known ahead of time, offset the
current position instead — it is already in the right convention:

```ts
await easingScroll(container, {
  left: container.scrollLeft - 200,
  duration: 400,
});
```

Older WebKit reports RTL scroll offsets as positive and reversed. Reading
`scrollLeft` first, as above, covers that case too.

### Interrupting on User Input

The animation writes the scroll position on every frame, so it does not yield to
the user the way native smooth scrolling does. Abort it yourself if that matters:

```ts
const controller = new AbortController();
const stop = () => controller.abort();

element.addEventListener("wheel", stop, { once: true, passive: true });
element.addEventListener("touchstart", stop, { once: true, passive: true });

await easingScroll(element, {
  top: 1000,
  duration: 600,
  signal: controller.signal,
});
```

## Caveats

- **`scroll-behavior: smooth`** — clamping reads the scroll position back after
  writing it, and a target with `scroll-behavior: smooth` reports the old value
  while its own animation runs. The scroll then looks like a no-op and the
  promise resolves `1` without moving. Set `scroll-behavior: auto` on the target
  (or unset the property) before scrolling programmatically.
- **Concurrent calls** — two animations on the same target fight over its scroll
  position every frame. Cancel the previous one via its `signal` before starting
  the next.
- **`prefers-reduced-motion`** — not handled. Check it yourself and pass
  `duration: 0` for an instant scroll:
  ```ts
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  await easingScroll(element, { top: 500, duration: reduce ? 0 : 400 });
  ```
- **One extra `scroll` event** — clamping writes the target position and restores
  it within the same task. The final position is unchanged, but the target still
  emits a single `scroll` event. Worth knowing if you have infinite-scroll,
  sticky-header or scroll-depth listeners attached.
- **Overshoot easings** — curves that leave the `0`–`1` range (`easeOutBack`,
  elastic) are clipped by the scrollable range, so the overshoot is invisible at
  the very edges of the content.

## License

[MIT](LICENSE)
