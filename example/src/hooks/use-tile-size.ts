import { useState, useEffect, RefObject } from "react";

const BASE_TILE_SIZE = 480;

export { BASE_TILE_SIZE };

export function useTileSize(ref: RefObject<HTMLElement | null>): number {
  const [size, setSize] = useState(BASE_TILE_SIZE);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setSize(el.clientHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}
