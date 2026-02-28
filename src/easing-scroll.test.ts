// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { easingScroll } from "./easing-scroll";

/**
 * Create a mock scrollable element with configurable scroll dimensions.
 */
const createMockElement = (opts?: {
  scrollHeight?: number;
  scrollWidth?: number;
  clientHeight?: number;
  clientWidth?: number;
}) => {
  const el = document.createElement("div");

  const scrollHeight = opts?.scrollHeight ?? 2000;
  const scrollWidth = opts?.scrollWidth ?? 2000;
  const clientHeight = opts?.clientHeight ?? 500;
  const clientWidth = opts?.clientWidth ?? 500;

  Object.defineProperties(el, {
    scrollHeight: { get: () => scrollHeight, configurable: true },
    scrollWidth: { get: () => scrollWidth, configurable: true },
    clientHeight: { get: () => clientHeight, configurable: true },
    clientWidth: { get: () => clientWidth, configurable: true },
  });

  // Clamp scrollTop/scrollLeft to valid range
  let _scrollTop = 0;
  let _scrollLeft = 0;

  Object.defineProperty(el, "scrollTop", {
    get: () => _scrollTop,
    set: (v: number) => {
      _scrollTop = Math.max(0, Math.min(v, scrollHeight - clientHeight));
    },
    configurable: true,
  });

  Object.defineProperty(el, "scrollLeft", {
    get: () => _scrollLeft,
    set: (v: number) => {
      _scrollLeft = Math.max(0, Math.min(v, scrollWidth - clientWidth));
    },
    configurable: true,
  });

  return el;
};

describe("easingScroll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Immediate / edge cases ───────────────────────────────────

  it("resolves 0 if signal is already aborted", async () => {
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

  it("resolves 1 immediately when top and left are both undefined", async () => {
    const el = createMockElement();
    const result = await easingScroll(el, { duration: 300 });
    expect(result).toBe(1);
  });

  it("scrolls instantly and resolves 1 when duration is 0", async () => {
    const el = createMockElement();
    const result = await easingScroll(el, { top: 200, duration: 0 });
    expect(result).toBe(1);
    expect(el.scrollTop).toBe(200);
  });

  it("scrolls instantly and resolves 1 when duration is negative", async () => {
    const el = createMockElement();
    const result = await easingScroll(el, { top: 200, duration: -100 });
    expect(result).toBe(1);
    expect(el.scrollTop).toBe(200);
  });

  it("scrolls instantly when no duration option provided (defaults to 0)", async () => {
    const el = createMockElement();
    const result = await easingScroll(el, { top: 300 });
    expect(result).toBe(1);
    expect(el.scrollTop).toBe(300);
  });

  // ─── Animated scroll ──────────────────────────────────────────

  it("animates scroll to target and resolves 1", async () => {
    const el = createMockElement();

    const promise = easingScroll(el, { top: 400, duration: 100 });

    // Advance past the duration
    vi.advanceTimersByTime(150);
    // Flush microtasks / rAF
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toBe(1);
    expect(el.scrollTop).toBe(400);
  });

  it("animates horizontal scroll", async () => {
    const el = createMockElement();

    const promise = easingScroll(el, { left: 300, duration: 100 });

    vi.advanceTimersByTime(150);
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toBe(1);
    expect(el.scrollLeft).toBe(300);
  });

  it("animates both top and left simultaneously", async () => {
    const el = createMockElement();

    const promise = easingScroll(el, {
      top: 200,
      left: 300,
      duration: 100,
    });

    vi.advanceTimersByTime(150);
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toBe(1);
    expect(el.scrollTop).toBe(200);
    expect(el.scrollLeft).toBe(300);
  });

  // ─── Clamping ─────────────────────────────────────────────────

  it("clamps target to max scrollable area", async () => {
    const el = createMockElement({
      scrollHeight: 1000,
      clientHeight: 500,
    });

    // Request scroll beyond max (1000 - 500 = 500)
    const promise = easingScroll(el, { top: 9999, duration: 100 });

    vi.advanceTimersByTime(150);
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toBe(1);
    expect(el.scrollTop).toBe(500); // clamped
  });

  it("does not flash to target position before animation starts", () => {
    const el = createMockElement();
    const positions: number[] = [];

    // Track scrollTop changes
    let _st = 0;
    Object.defineProperty(el, "scrollTop", {
      get: () => _st,
      set: (v: number) => {
        _st = Math.max(0, Math.min(v, 1500));
        positions.push(_st);
      },
      configurable: true,
    });

    Object.defineProperty(el, "scrollHeight", {
      get: () => 2000,
      configurable: true,
    });
    Object.defineProperty(el, "clientHeight", {
      get: () => 500,
      configurable: true,
    });

    easingScroll(el, { top: 400, duration: 300 });

    // After calling easingScroll (before any rAF), scrollTop should be back to 0
    // The clamping sets it to 400 then back to 0
    expect(el.scrollTop).toBe(0);

    // The last position written should be 0 (the rollback)
    expect(positions[positions.length - 1]).toBe(0);
  });

  // ─── Abort ────────────────────────────────────────────────────

  it("resolves with partial progress on abort", async () => {
    const el = createMockElement();
    const controller = new AbortController();

    const promise = easingScroll(el, {
      top: 400,
      duration: 200,
      signal: controller.signal,
    });

    // Let animation run partway
    vi.advanceTimersByTime(50);
    await vi.advanceTimersByTimeAsync(0);

    controller.abort();
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("abort progress never exceeds 1", async () => {
    const el = createMockElement();
    const controller = new AbortController();

    const promise = easingScroll(el, {
      top: 400,
      duration: 50,
      signal: controller.signal,
    });

    // Advance well past duration, then abort
    vi.advanceTimersByTime(500);
    await vi.advanceTimersByTimeAsync(0);

    controller.abort();
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toBeLessThanOrEqual(1);
  });

  // ─── Custom easing ────────────────────────────────────────────

  it("uses custom easing function", async () => {
    const el = createMockElement();
    const easingFn = vi.fn((t: number) => t * t); // easeIn quadratic

    const promise = easingScroll(el, {
      top: 400,
      duration: 100,
      easing: easingFn,
    });

    vi.advanceTimersByTime(150);
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toBe(1);
    expect(easingFn).toHaveBeenCalled();
    expect(el.scrollTop).toBe(400);
  });
});
