/** Pixel value */
type Px = number;

/** Milliseconds value */
type Ms = number;

/**
 * Progress percentage as a number between 0 and 1.
 *
 * - `0` — 0% (animation not started or aborted immediately)
 * - `1` — 100% (animation completed)
 * - `0 < value < 1` — partial progress (animation was aborted mid-way)
 */
type Pct = number;

type Options = {
  /** Target vertical scroll position in pixels */
  top?: Px;
  /** Target horizontal scroll position in pixels */
  left?: Px;
  /**
   * Animation duration in milliseconds.
   * If `0` or negative, scrolls instantly without animation.
   * @default 0
   */
  duration?: Ms;
  /**
   * An `AbortSignal` to cancel the scroll animation.
   * When aborted, the promise resolves with the current progress (0–1).
   */
  signal?: AbortSignal;
  /**
   * Easing function that maps animation progress `t` (0–1) to eased value.
   * @default linear
   * @see Easing functions https://easings.net
   */
  easing?: (t: Pct) => Pct;
};

/** Default easing — no transformation, constant speed */
const linear = (t: number): number => t;

/**
 * Imperatively set scroll position on the target element.
 * If a value is `undefined`, the current scroll position is preserved.
 */
const scrollTo = <E extends Element>(
  target: E,
  top: Options["top"],
  left: Options["left"],
) => {
  target.scrollTop = top ?? target.scrollTop;
  target.scrollLeft = left ?? target.scrollLeft;
};

/**
 * Smoothly scroll an element to the given position using a custom easing function.
 *
 * @param target - The scrollable HTML element
 * @param options - Scroll options (top, left, duration, easing, signal)
 * @returns A promise that resolves with the animation progress:
 *   - `1` if the animation completed fully
 *   - `0` if the signal was already aborted before starting
 *   - `0 < value < 1` if the animation was aborted mid-way
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 *
 * const progress = await easingScroll(element, {
 *   top: 500,
 *   duration: 400,
 *   easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
 *   signal: controller.signal,
 * });
 * ```
 */
export const easingScroll = <E extends Element>(
  target: E,
  { top, left, signal, duration = 0, easing = linear }: Options,
): Promise<Pct> => {
  // Already aborted — skip entirely, resolve with 0 progress
  if (signal?.aborted) {
    return Promise.resolve(0);
  }

  // Nothing to scroll — resolve immediately as complete
  if (top === undefined && left === undefined) {
    return Promise.resolve(1);
  }

  // Non-positive duration — scroll instantly without animation
  if (duration <= 0) {
    scrollTo(target, top, left);
    return Promise.resolve(1);
  }

  return new Promise<Pct>((resolve) => {
    const startTop = target.scrollTop;
    const startLeft = target.scrollLeft;

    // Clamp target values to the browser's valid scroll range by
    // temporarily applying them and reading back the clamped result.
    // Then immediately restore the original position to avoid a visual flash.
    scrollTo(target, top, left);
    top = target.scrollTop;
    left = target.scrollLeft;
    target.scrollTop = startTop;
    target.scrollLeft = startLeft;

    const startTimestamp = performance.now();
    let ramID: number;

    /** Calculate raw animation progress (may exceed 1 between frames) */
    const getProgress = (): Pct => {
      const elapsed = performance.now() - startTimestamp;
      return elapsed / duration;
    };

    /** Handle abort: cancel pending frame and resolve with clamped progress */
    const abortHandler = () => {
      cancelAnimationFrame(ramID);
      const progress = Math.min(getProgress(), 1);
      resolve(progress);
    };

    // Use { once: true } so the listener auto-removes after firing,
    // preventing a stale reference to the closure on the signal.
    signal?.addEventListener("abort", abortHandler, { once: true });

    /** Animation frame callback — interpolates scroll position via easing */
    const tick = () => {
      const progress = getProgress();
      const tickTop =
        top === undefined
          ? undefined
          : startTop + (top - startTop) * easing(progress);
      const tickLeft =
        left === undefined
          ? undefined
          : startLeft + (left - startLeft) * easing(progress);

      if (progress < 1) {
        scrollTo(target, tickTop, tickLeft);
        ramID = requestAnimationFrame(tick);
      } else {
        // Animation complete — set exact final position and clean up
        scrollTo(target, top, left);
        signal?.removeEventListener("abort", abortHandler);
        resolve(1);
        return;
      }
    };

    ramID = requestAnimationFrame(tick);
  });
};
