// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  onTestFinished,
} from "vitest";
import { easingScroll } from "./easing-scroll";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type ScrollBox = {
  scrollHeight?: number;
  scrollWidth?: number;
  clientHeight?: number;
  clientWidth?: number;
  /**
   * `rtl` flips the horizontal range to `[-max, 0]`, matching how current
   * browsers report `scrollLeft` in RTL containers.
   */
  direction?: "ltr" | "rtl";
};

/**
 * Make an element behave like a scrollable box: fixed dimensions, and
 * `scrollTop`/`scrollLeft` clamped to the valid range the way a browser does.
 *
 * jsdom performs no layout, so every scroll test needs this. The original
 * property descriptors are restored when the test ends, which matters for nodes
 * shared between tests such as `document.documentElement`.
 */
const makeScrollable = <T extends Element>(el: T, box: ScrollBox = {}): T => {
  const {
    scrollHeight = 2000,
    scrollWidth = 2000,
    clientHeight = 500,
    clientWidth = 500,
    direction = "ltr",
  } = box;

  const maxTop = Math.max(0, scrollHeight - clientHeight);
  const maxLeft = Math.max(0, scrollWidth - clientWidth);
  const leftRange: [min: number, max: number] =
    direction === "rtl" ? [-maxLeft, 0] : [0, maxLeft];

  let top = 0;
  let left = 0;

  const originals = new Map<string, PropertyDescriptor | undefined>();
  const define = (key: string, descriptor: PropertyDescriptor) => {
    originals.set(key, Object.getOwnPropertyDescriptor(el, key));
    Object.defineProperty(el, key, { ...descriptor, configurable: true });
  };

  define("scrollHeight", { get: () => scrollHeight });
  define("scrollWidth", { get: () => scrollWidth });
  define("clientHeight", { get: () => clientHeight });
  define("clientWidth", { get: () => clientWidth });
  define("scrollTop", {
    get: () => top,
    set: (value: number) => {
      top = clamp(value, 0, maxTop);
    },
  });
  define("scrollLeft", {
    get: () => left,
    set: (value: number) => {
      left = clamp(value, ...leftRange);
    },
  });

  onTestFinished(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(el, key, descriptor);
      else Reflect.deleteProperty(el, key);
    }
  });

  return el;
};

/** A throwaway scrollable element. */
const createMockElement = (box?: ScrollBox) =>
  makeScrollable(document.createElement("div"), box);

/** An iframe window — a different realm from the test's own `window`. */
const createFrameWindow = (): Window => {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  onTestFinished(() => iframe.remove());
  return iframe.contentWindow!;
};

/** The element that carries a window's scroll position. */
const scrollerOf = (win: Window): Element =>
  win.document.scrollingElement ?? win.document.documentElement;

/** Run queued animation frames for `ms` of fake time, then flush microtasks. */
const runFrames = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await vi.advanceTimersByTimeAsync(0);
};

/** Spy on `requestAnimationFrame`, restored when the test ends. */
const spyOnFrames = () => {
  const spy = vi.spyOn(globalThis, "requestAnimationFrame");
  onTestFinished(() => spy.mockRestore());
  return spy;
};

/**
 * Record every value written to a scroll axis, in order. Wraps the accessor
 * installed by `makeScrollable`, so clamping still applies.
 */
const trackWrites = (el: Element, axis: "scrollTop" | "scrollLeft") => {
  const writes: number[] = [];
  const { get, set } = Object.getOwnPropertyDescriptor(el, axis)!;

  Object.defineProperty(el, axis, {
    get,
    set(value: number) {
      set!.call(el, value);
      writes.push(get!.call(el) as number);
    },
    configurable: true,
  });

  return writes;
};

const throwingEasing = () => {
  throw new Error("boom from easing");
};

describe("easingScroll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("instant scroll", () => {
    it("when duration is 0", async () => {
      const el = createMockElement();

      expect(await easingScroll(el, { top: 200, duration: 0 })).toBe(1);
      expect(el.scrollTop).toBe(200);
    });

    it("when duration is negative", async () => {
      const el = createMockElement();

      expect(await easingScroll(el, { top: 200, duration: -100 })).toBe(1);
      expect(el.scrollTop).toBe(200);
    });

    it("when duration is omitted", async () => {
      const el = createMockElement();

      expect(await easingScroll(el, { top: 300 })).toBe(1);
      expect(el.scrollTop).toBe(300);
    });

    it("when duration is NaN", async () => {
      const el = createMockElement();
      const frames = spyOnFrames();

      expect(await easingScroll(el, { top: 200, duration: NaN })).toBe(1);
      expect(el.scrollTop).toBe(200);
      expect(frames).not.toHaveBeenCalled();
    });

    it("when duration is Infinity", async () => {
      const el = createMockElement();
      const frames = spyOnFrames();

      // Animating would never reach progress 1 and would loop frames forever
      expect(await easingScroll(el, { top: 200, duration: Infinity })).toBe(1);
      expect(el.scrollTop).toBe(200);
      expect(frames).not.toHaveBeenCalled();
    });

    it("treats left: 0 as a target, not as omitted", async () => {
      const el = createMockElement();
      el.scrollLeft = 400;

      expect(await easingScroll(el, { left: 0 })).toBe(1);
      expect(el.scrollLeft).toBe(0);
    });
  });

  describe("no-op", () => {
    it("resolves 1 when top and left are both undefined", async () => {
      const el = createMockElement();

      expect(await easingScroll(el, { duration: 300 })).toBe(1);
    });

    it("resolves 1 without a frame when already at the target", async () => {
      const el = createMockElement();
      el.scrollTop = 200;
      el.scrollLeft = 100;
      const frames = spyOnFrames();

      const result = await easingScroll(el, {
        top: 200,
        left: 100,
        duration: 300,
      });

      expect(result).toBe(1);
      expect(frames).not.toHaveBeenCalled();
    });

    it("resolves 1 without a frame when the target clamps to the current position", async () => {
      const el = createMockElement({ scrollHeight: 1000, clientHeight: 500 });
      el.scrollTop = 500; // already at max
      const frames = spyOnFrames();

      expect(await easingScroll(el, { top: 9999, duration: 300 })).toBe(1);
      expect(el.scrollTop).toBe(500);
      expect(frames).not.toHaveBeenCalled();
    });

    it("resolves 1 without a frame when the difference is sub-pixel", async () => {
      const el = createMockElement();
      el.scrollTop = 200;
      el.scrollLeft = 100;
      const frames = spyOnFrames();

      const result = await easingScroll(el, {
        top: 200.5,
        left: 100.3,
        duration: 300,
      });

      expect(result).toBe(1);
      expect(frames).not.toHaveBeenCalled();
    });
  });

  describe("animation", () => {
    it("animates vertical scroll to the target", async () => {
      const el = createMockElement();

      const promise = easingScroll(el, { top: 400, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(el.scrollTop).toBe(400);
    });

    it("animates horizontal scroll to the target", async () => {
      const el = createMockElement();

      const promise = easingScroll(el, { left: 300, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(el.scrollLeft).toBe(300);
    });

    it("animates both axes simultaneously", async () => {
      const el = createMockElement();

      const promise = easingScroll(el, { top: 200, left: 300, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(el.scrollTop).toBe(200);
      expect(el.scrollLeft).toBe(300);
    });

    it("moves through intermediate positions instead of jumping", async () => {
      const el = createMockElement();

      const promise = easingScroll(el, { top: 400, duration: 100 });

      await runFrames(50);
      expect(el.scrollTop).toBeGreaterThan(0);
      expect(el.scrollTop).toBeLessThan(400);

      await runFrames(100);
      expect(await promise).toBe(1);
      expect(el.scrollTop).toBe(400);
    });

    it("treats top: 0 as a target, not as omitted", async () => {
      const el = createMockElement();
      el.scrollTop = 500;

      const promise = easingScroll(el, { top: 0, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(el.scrollTop).toBe(0);
    });
  });

  describe("axis independence", () => {
    it("leaves the vertical position untouched when only left is animated", async () => {
      const el = createMockElement();
      el.scrollTop = 250;

      const promise = easingScroll(el, { left: 300, duration: 100 });
      await runFrames(20);

      // Something else scrolls vertically while the animation runs
      el.scrollTop = 120;
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(el.scrollLeft).toBe(300);
      expect(el.scrollTop).toBe(120);
    });

    it("leaves the horizontal position untouched when only top is animated", async () => {
      const el = createMockElement();
      el.scrollLeft = 180;

      const promise = easingScroll(el, { top: 400, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(el.scrollTop).toBe(400);
      expect(el.scrollLeft).toBe(180);
    });
  });

  describe("clamping", () => {
    it("clamps the target to the max scrollable offset", async () => {
      const el = createMockElement({ scrollHeight: 1000, clientHeight: 500 });

      const promise = easingScroll(el, { top: 9999, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(el.scrollTop).toBe(500);
    });

    it("does not flash to the target position before animating", () => {
      const el = createMockElement();
      const writes = trackWrites(el, "scrollTop");

      void easingScroll(el, { top: 400, duration: 300 });

      // Clamping writes the target to read it back, then rolls it straight back
      expect(writes).toEqual([400, 0]);
      expect(el.scrollTop).toBe(0);
    });
  });

  describe("RTL containers", () => {
    it("animates to a negative left", async () => {
      const el = createMockElement({ direction: "rtl" });

      const promise = easingScroll(el, { left: -300, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(el.scrollLeft).toBe(-300);
    });

    it("clamps a positive left to 0", async () => {
      const el = createMockElement({ direction: "rtl" });
      const frames = spyOnFrames();

      // Out of range in RTL, so it clamps to the resting position we are at
      expect(await easingScroll(el, { left: 300, duration: 100 })).toBe(1);
      expect(el.scrollLeft).toBe(0);
      expect(frames).not.toHaveBeenCalled();
    });
  });

  describe("window target", () => {
    it("scrolls the document scrolling element", async () => {
      const scroller = makeScrollable(scrollerOf(window));

      const promise = easingScroll(window, { top: 400, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(scroller.scrollTop).toBe(400);
    });

    it("resolves a cross-realm window without relying on instanceof", async () => {
      const frameWindow = createFrameWindow();
      // A window from another realm is not `instanceof` this realm's Window
      expect(frameWindow instanceof Window).toBe(false);

      const scroller = makeScrollable(scrollerOf(frameWindow));

      const promise = easingScroll(frameWindow, { top: 300, duration: 100 });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(scroller.scrollTop).toBe(300);
    });
  });

  describe("abort", () => {
    it("resolves 0 when the signal is already aborted", async () => {
      const el = createMockElement();
      const controller = new AbortController();
      controller.abort();

      const result = await easingScroll(el, {
        top: 100,
        duration: 300,
        signal: controller.signal,
      });

      expect(result).toBe(0);
      expect(el.scrollTop).toBe(0);
    });

    it("resolves 0 when aborted before the first frame", async () => {
      const el = createMockElement();
      const controller = new AbortController();

      const promise = easingScroll(el, {
        top: 400,
        duration: 200,
        signal: controller.signal,
      });
      controller.abort();

      expect(await promise).toBe(0);
      expect(el.scrollTop).toBe(0);
    });

    it("resolves with partial progress", async () => {
      const el = createMockElement();
      const controller = new AbortController();

      const promise = easingScroll(el, {
        top: 400,
        duration: 200,
        signal: controller.signal,
      });

      await runFrames(50);
      controller.abort();
      await runFrames(0);

      const progress = await promise;
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(0.5);
    });

    it("never resolves with more than 1", async () => {
      const el = createMockElement();
      const controller = new AbortController();

      const promise = easingScroll(el, {
        top: 400,
        duration: 50,
        signal: controller.signal,
      });

      // Well past the duration, so raw progress is far above 1
      await runFrames(500);
      controller.abort();
      await runFrames(0);

      expect(await promise).toBeLessThanOrEqual(1);
    });

    it("stops moving where the abort happened", async () => {
      const el = createMockElement();
      const controller = new AbortController();

      const promise = easingScroll(el, {
        top: 400,
        duration: 200,
        signal: controller.signal,
      });

      await runFrames(50);
      controller.abort();
      await runFrames(0);
      await promise;

      const stopped = el.scrollTop;
      expect(stopped).toBeGreaterThan(0);
      expect(stopped).toBeLessThan(400);

      // The cancelled frame must not move it afterwards
      await runFrames(300);
      expect(el.scrollTop).toBe(stopped);
    });

    it("removes the listener once the animation completes", async () => {
      const el = createMockElement();
      const controller = new AbortController();
      const removeListener = vi.spyOn(controller.signal, "removeEventListener");

      const promise = easingScroll(el, {
        top: 400,
        duration: 100,
        signal: controller.signal,
      });
      await runFrames(150);
      await promise;

      // A long-lived signal must not keep the animation closure alive
      expect(removeListener).toHaveBeenCalledWith(
        "abort",
        expect.any(Function),
      );
    });

    it("keeps the resolved value when aborted after completion", async () => {
      const el = createMockElement();
      const controller = new AbortController();

      const promise = easingScroll(el, {
        top: 400,
        duration: 100,
        signal: controller.signal,
      });
      await runFrames(150);
      expect(await promise).toBe(1);

      controller.abort();
      await runFrames(0);

      expect(await promise).toBe(1);
      expect(el.scrollTop).toBe(400);
    });
  });

  describe("easing", () => {
    it("uses the custom easing function", async () => {
      const el = createMockElement();
      const easing = vi.fn((t: number) => t * t); // easeInQuad

      const promise = easingScroll(el, { top: 400, duration: 100, easing });
      await runFrames(150);

      expect(await promise).toBe(1);
      expect(easing).toHaveBeenCalled();
      expect(el.scrollTop).toBe(400);
    });

    it("is called once per frame, never outside 0–1", async () => {
      const el = createMockElement();
      const args: number[] = [];

      // Both axes animate, so a per-axis call would show up as a duplicate
      const promise = easingScroll(el, {
        top: 400,
        left: 300,
        duration: 100,
        easing: (t) => {
          args.push(t);
          return t;
        },
      });
      await runFrames(150);
      await promise;

      expect(args.length).toBeGreaterThan(0);
      expect(Math.min(...args)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...args)).toBeLessThanOrEqual(1);
      expect(new Set(args).size).toBe(args.length);
    });

    it("rejects when it throws", async () => {
      const el = createMockElement();

      const promise = easingScroll(el, {
        top: 400,
        duration: 100,
        easing: throwingEasing,
      });
      // `rejects` attaches its handler now — attaching it after the frames run
      // would leave the rejection briefly unhandled, which the runner reports
      const rejected = expect(promise).rejects.toThrow("boom from easing");

      await runFrames(20);

      // Unguarded, the throw would kill the frame callback and hang this promise
      await rejected;
    });

    it("stops requesting frames after it throws", async () => {
      const el = createMockElement();

      const promise = easingScroll(el, {
        top: 400,
        duration: 100,
        easing: throwingEasing,
      });
      const rejected = expect(promise).rejects.toThrow();

      await runFrames(20);
      await rejected;

      const frames = spyOnFrames();
      await runFrames(200);

      expect(frames).not.toHaveBeenCalled();
    });
  });
});
