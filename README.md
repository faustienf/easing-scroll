<p align="center">
  <img src="https://raw.githubusercontent.com/faustienf/easing-scroll/main/assets/header.png" width="80%">
</p>

# easing-scroll

[![npm-version](https://img.shields.io/npm/v/easing-scroll.svg)](https://npmjs.org/package/easing-scroll)

♿️ Smooth scrolling.

## Install

```sh
npm install easing-scroll
```

## Features

- 📦 Zero dependencies
- 📈 Customize [easing function](https://easings.net)
- 🚫 Abort scrolling ([AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal))
- 🔄 Waiting for animation to end
- ☸️ Supports vertical and horizontal scroll

## Usage

```ts
import { easingScroll } from "easing-scroll";

const controller = new AbortController();
// Abort scrolling
// controller.abort(); ❌

const target = document.querySelector(".container");

const progress = await easingScroll(target, {
  left: 0, // px
  top: 300, // px
  duration: 400, // ms
  signal: controller.signal,
  // 👀 https://easings.net/#easeOutCubic
  easing: (x) => 1 - Math.pow(1 - x, 3),
});

if (progress === 1) {
  console.log("Completed");
} else {
  console.log("Aborted");
}
```

### Animation

Linear function `(t) => t` is used by default. Pass [easing](https://easings.net), if you want to change easing function.
`duration` is animation duration in milliseconds.

```ts
easingScroll(target, {
  duration: 400, // ms
  // 👀 https://easings.net/#easeOutCubic
  easing: (x) => 1 - Math.pow(1 - x, 3),
});
```

### Abort scrolling

Pass `signal` ([AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)),
if you want to abort scrolling.

```ts
const controller = new AbortController();
setTimeout(() => {
  controller.abort();
}, 100);

const progress = await easingScroll(target, {
  ...,
  signal: controller.signal,
});

if (progress !== 1) {
  console.log('Scrolling has been aborted.');
}
```

`progress` is a number from 0 to 1.

`1` - Scrolling is completed 100%.

`<1` - Scrolling has been aborted and completed X%.

```ts
const progress = await easingScroll(target, {
  ...,
});

if (progress !== 1) {
  console.log('Scrolling has been aborted.');
} else {
  console.log('Completed.');
}
```
