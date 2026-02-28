import { useEffect, RefObject } from "react";
import { easingScroll } from "easing-scroll";

export function useEasingScroll(
  ref: RefObject<HTMLElement | null>,
  top: number,
): void {
  useEffect(() => {
    const target = ref.current!;
    const controller = new AbortController();

    easingScroll(target, {
      top,
      duration: 400,
      signal: controller.signal,
      easing: (x: number): number => 1 - Math.pow(1 - x, 3),
    }).then((progress) => {
      if (progress < 1) {
        console.log("Canceled", progress);
      } else {
        console.log("Finished", progress);
      }
    });

    return () => {
      controller.abort();
    };
  }, [top]);
}
