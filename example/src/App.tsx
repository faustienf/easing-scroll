import { useState, useRef, useCallback } from "react";

import { useTileSize, useEasingScroll, BASE_TILE_SIZE } from "./hooks";
import { ScrollPanel } from "./scroll-panel";
import { CodeCard } from "./code-card";
import { GhLink } from "./gh-link";

import "./App.css";

const STYLES = {
  "--tile-size": `${BASE_TILE_SIZE}px`,
} as React.CSSProperties;

function App() {
  const [top, setTop] = useState(0);
  const ref = useRef<HTMLUListElement>(null);
  const tileSize = useTileSize(ref);

  useEasingScroll(ref, top);

  const handleDown = useCallback(
    () => setTop((state) => Math.min(tileSize * 3, state + tileSize)),
    [tileSize],
  );

  const handleUp = useCallback(
    () => setTop((state) => Math.max(0, state - tileSize)),
    [tileSize],
  );

  return (
    <div className="app" style={STYLES}>
      <GhLink
        href="https://github.com/faustienf/easing-scroll"
        target="_blank"
      />

      <h1 className="app-title">easing-scroll</h1>
      <p className="app-subtitle">
        Smooth scrolling with custom easing functions
      </p>

      <div className="demo-area">
        <ScrollPanel listRef={ref} onUp={handleUp} onDown={handleDown} />
        <CodeCard height={tileSize} />
      </div>
    </div>
  );
}

export default App;
