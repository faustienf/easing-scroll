type Px = number;
type Ms = number;
/**
 * Percent is number 0 - 1
 *
 * 0 = 0%, 1 = 100%
 */
type Pct = number;

type Options = {
  top: Px;
  left: Px;
  duration: Ms;
  signal: AbortSignal;
  /**
   * @see Easing functions https://easings.net
   */
  easing: (t: Pct) => Pct;
};

const linear = (t: number): number => t;

export const easingScroll = <E extends Element>(
  target: E,
  { top, left, signal, duration = 0, easing = linear }: Partial<Options>
): Promise<Pct> => {
  if (signal?.aborted) {
    return Promise.resolve(0);
  }

  if (!duration) {
    target.scrollTo({ top, left });
    return Promise.resolve(1);
  }

  return new Promise<Pct>((resolve) => {
    const startTop = target.scrollTop;
    const startLeft = target.scrollLeft;
    const startTimestamp = performance.now();
    let ramID: number;

    const getProgress = (): Pct => {
      const elapsed = performance.now() - startTimestamp;
      return elapsed / duration;
    };

    const abortHandler = () => {
      cancelAnimationFrame(ramID);
      const progress = getProgress();
      resolve(progress);
    };

    signal?.addEventListener("abort", abortHandler);

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
        target.scrollTo({ top: tickTop, left: tickLeft });
        ramID = requestAnimationFrame(tick);
      } else {
        target.scrollTo({ top, left });
        signal?.removeEventListener("abort", abortHandler);
        resolve(1);
      }
    };

    ramID = requestAnimationFrame(tick);
  });
};
