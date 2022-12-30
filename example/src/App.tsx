import { useState, useEffect, useRef } from "react";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackLayout,
} from "@codesandbox/sandpack-react";
// @ts-expect-error
import { amethyst } from "@codesandbox/sandpack-themes";

import { easingScroll } from "easing-scroll";
import "./App.css";

const code = `
import { easingScroll } from "easing-scroll";

const controller = new AbortController();
// cancel scroll
// controller.abort(); ❌

const progress = await easingScroll({
  target: document.querySelector('.container'),
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
`.trim();

function App() {
  const [top, setTop] = useState(0);
  const ref = useRef<HTMLUListElement>(null);

  const handleDown = () => {
    setTop((state) => Math.min(430 * 3, state + 430));
  };

  const handleUp = () => {
    setTop((state) => Math.max(0, state - 430));
  };

  useEffect(() => {
    const target = ref.current!;
    const controller = new AbortController();

    easingScroll({
      target,
      top,
      duration: 400,
      signal: controller.signal,
      easing: (x) => 1 - Math.pow(1 - x, 3),
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
      <div>
        <ul ref={ref} className="container">
          <li></li>
          <li></li>
          <li></li>
          <li></li>
        </ul>
        <button className="button-74" role="button" onClick={handleDown}>
          Scroll Down
        </button>
        <button className="button-74" role="button" onClick={handleUp}>
          Scroll Up
        </button>
      </div>

      <SandpackProvider
        style={{ height: 430 }}
        theme={amethyst}
        template="react"
        files={{
          "/App.js": code,
        }}
      >
        <SandpackLayout style={{ height: "100%" }}>
          <SandpackCodeEditor style={{ height: "100%" }} readOnly />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}

export default App;
