import { useState, useEffect, useRef, useCallback } from "react";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackLayout,
} from "@codesandbox/sandpack-react";
// @ts-ignore
import { amethyst } from "@codesandbox/sandpack-themes";

import { easingScroll } from "easing-scroll";
import { GhLink } from "./gh-link";

import "./App.css";

const code = `
import { easingScroll } from "easing-scroll";

const controller = new AbortController();
// Abort scrolling
// controller.abort(); ❌

const target = document.querySelector('.container');

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
  console.log("Canceled");
}
`.trim();

function App() {
  const [top, setTop] = useState(0);
  const ref = useRef<HTMLUListElement>(null);

  const handleDown = useCallback(
    () => setTop((state) => Math.min(450 * 3, state + 450)),
    [],
  );

  const handleUp = useCallback(
    () => setTop((state) => Math.max(0, state - 450)),
    [],
  );

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

  return (
    <div className="app">
      <GhLink
        href="https://github.com/faustienf/easing-scroll"
        target="_blank"
      />

      <h1 className="app-title">easing-scroll</h1>
      <p className="app-subtitle">
        Smooth scrolling with custom easing functions
      </p>

      <div className="demo-area">
        <div className="scroll-panel">
          <ul ref={ref} className="container">
            <li>🍑</li>
            <li>🍋</li>
            <li>🌿</li>
            <li>🦄</li>
          </ul>
          <div className="button-group">
            <button className="button" onClick={handleUp}>
              ↑ Up
            </button>
            <button className="button" onClick={handleDown}>
              ↓ Down
            </button>
          </div>
        </div>

        <div className="code-card">
          <SandpackProvider
            style={{ height: 450 }}
            theme={amethyst}
            template="react"
            files={{
              "/App.js": code,
            }}
          >
            <SandpackLayout style={{ height: "100%", padding: 8 }}>
              <SandpackCodeEditor style={{ height: "100%" }} readOnly />
            </SandpackLayout>
          </SandpackProvider>
        </div>
      </div>
    </div>
  );
}

export default App;
