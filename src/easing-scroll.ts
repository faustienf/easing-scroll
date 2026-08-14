/** Pixel value */
type Px = number;

/** Milliseconds value */
type Ms = number;

/** Animation progress as a number between 0 and 1, where 1 is complete */
type Pct = number;

type Options = {
  /**
   * Target vertical scroll position in pixels.
   * When omitted, the vertical position is left untouched.
   */
  top?: Px;
  /**
   * Target horizontal scroll position in pixels.
   * When omitted, the horizontal position is left untouched.
   *
   * Values use the browser's own convention, so inside a `direction: rtl`
   * container this is typically negative.
   */
  left?: Px;
  /**
   * Animation duration in milliseconds.
   * Anything that is not a finite positive number scrolls instantly.
   * @default 0
   */
  duration?: Ms;
  /**
   * An `AbortSignal` to cancel the scroll animation.
   * When aborted, the promise resolves with the current progress (0–1).
   */
  signal?: AbortSignal;
  /**
   * Easing function that maps animation progress `t` to an eased value.
   *
   * `t` is always within 0–1. The returned value may leave that range —
   * overshoot curves are clipped by the scrollable range.
   *
   * @default linear
   * @see Easing functions https://easings.net
   */
  easing?: (t: Pct) => number;
};

/**
 * Anything that can be scrolled: a scrollable element, or `window` to scroll
 * the page itself.
 */
type ScrollTarget = Element | Window;

/** Default easing — no transformation, constant speed */
const linear = (t: Pct): number => t;

/**
 * Resolve a scroll target to the element that actually carries the scroll
 * position. `window` maps to the document's scrolling element, whose
 * `scrollTop`/`scrollLeft` mirror `scrollY`/`scrollX`.
 *
 * Detected by duck typing rather than `instanceof Window`, which is `false`
 * for a window from another realm (an iframe, for example).
 */
const resolveScroller = (target: ScrollTarget): Element => {
  if ("document" in target) {
    const { document } = target;
    return document.scrollingElement ?? document.documentElement;
  }
  return target;
};

/**
 * Imperatively set scroll position on the scrolling element.
 * An axis given as `undefined` is left untouched.
 */
const setScrollPosition = (
  scroller: Element,
  top: Options["top"],
  left: Options["left"],
) => {
  if (top !== undefined) scroller.scrollTop = top;
  if (left !== undefined) scroller.scrollLeft = left;
};

/**
 * Smoothly scroll an element to the given position using a custom easing function.
 *
 * @param target - A scrollable element, or `window` to scroll the page
 * @param options - Scroll options (top, left, duration, easing, signal)
 * @returns A promise that resolves with the animation progress:
 *   - `1` if the animation completed fully
 *   - `0` if the signal was aborted before the first frame
 *   - `0 < value < 1` if the animation was aborted mid-way
 *
 *   Rejects only when the `easing` function throws.
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
 *
 * @example Scroll the page back to the top
 * ```ts
 * await easingScroll(window, { top: 0, duration: 400 });
 * ```
 */
export const easingScroll = <E extends ScrollTarget>(
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

  const scroller = resolveScroller(target);

  // Zero, negative, NaN and Infinity all scroll instantly rather than animate
  if (!Number.isFinite(duration) || duration <= 0) {
    setScrollPosition(scroller, top, left);
    return Promise.resolve(1);
  }

  const startTop = scroller.scrollTop;
  const startLeft = scroller.scrollLeft;

  // Clamp target values to the browser's valid scroll range by temporarily
  // applying them and reading back the clamped result. Then immediately restore
  // the original position to avoid a visual flash. Reading back also keeps this
  // correct in RTL containers, where the browser's own range is the authority.
  setScrollPosition(scroller, top, left);
  const targetTop = top === undefined ? undefined : scroller.scrollTop;
  const targetLeft = left === undefined ? undefined : scroller.scrollLeft;
  scroller.scrollTop = startTop;
  scroller.scrollLeft = startLeft;

  // Already at the target position — nothing to animate
  const sameTop = targetTop === undefined || Math.abs(targetTop - startTop) < 1;
  const sameLeft =
    targetLeft === undefined || Math.abs(targetLeft - startLeft) < 1;
  if (sameTop && sameLeft) {
    return Promise.resolve(1);
  }

  return new Promise<Pct>((resolve, reject) => {
    let startTimestamp: Ms | undefined;
    let rafID: number;

    /** Calculate raw animation progress (may exceed 1 between frames) */
    const getProgress = (timestamp: Ms): Pct => {
      if (startTimestamp === undefined) return 0;
      const elapsed = timestamp - startTimestamp;
      return elapsed / duration;
    };

    /** Handle abort: cancel pending frame and resolve with clamped progress */
    const abortHandler = () => {
      cancelAnimationFrame(rafID);
      const progress = Math.max(0, Math.min(getProgress(performance.now()), 1));
      resolve(progress);
    };

    // `{ once: true }` covers the abort path. The paths below remove the
    // listener explicitly, so a long-lived signal never retains this closure.
    signal?.addEventListener("abort", abortHandler, { once: true });

    /** Animation frame callback — interpolates scroll position via easing */
    const tick = (timestamp: Ms) => {
      if (startTimestamp === undefined) startTimestamp = timestamp;
      const progress = getProgress(timestamp);

      if (progress >= 1) {
        // Animation complete — set exact final position and clean up
        setScrollPosition(scroller, targetTop, targetLeft);
        signal?.removeEventListener("abort", abortHandler);
        resolve(1);
        return;
      }

      // Checked against 1 first, so easing only ever sees progress within 0–1,
      // and is called once per frame rather than once per axis.
      let eased: number;
      try {
        eased = easing(progress);
      } catch (error) {
        // Left unhandled, a throw inside a frame callback would stop the
        // animation and leave this promise pending forever
        signal?.removeEventListener("abort", abortHandler);
        reject(error);
        return;
      }

      setScrollPosition(
        scroller,
        targetTop === undefined
          ? undefined
          : startTop + (targetTop - startTop) * eased,
        targetLeft === undefined
          ? undefined
          : startLeft + (targetLeft - startLeft) * eased,
      );
      rafID = requestAnimationFrame(tick);
    };

    rafID = requestAnimationFrame(tick);
  });
};
