<p align="center">
  <img src="https://raw.githubusercontent.com/faustienf/easing-scroll/main/assets/header.png" width="80%">
</p>

[![npm-version](https://img.shields.io/npm/v/easing-scroll.svg)](https://npmjs.org/package/easing-scroll)

# easing-scroll

♿️ Smooth scrolling.

## Install

```sh
npm install easing-scroll
```

## Features

- 📦 Zero dependencies
- 📈 Customize [easing function](https://easings.net)
- 🚫 Cancel scrolling ([AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal))
- 🔄 Awaiting animation end
- ☸️ Supports vertical and horizontal scroll

## Usage

```ts
import { easingScroll } from "easing-scroll";

const controller = new AbortController();
// cancel scroll
// controller.abort(); ❌

const progress = await easingScroll({
  target: document.querySelector(".container"),
  left: 0, // px
  top: 300, // px
  duration: 400, // ms
  signal: controller.signal,
  // 👀 https://easings.net/#easeOutCubic
  easing: (x) => 1 - Math.pow(1 - x, 3),
});

if (progress === 1) {
  console.log("Finished");
} else {
  console.log("Canceled");
}
```
