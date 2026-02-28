import { FC } from "react";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackLayout,
} from "@codesandbox/sandpack-react";
// @ts-ignore
import { aquaBlue } from "@codesandbox/sandpack-themes";

import "./code-card.css";

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

type Props = {
  height: number;
};

export const CodeCard: FC<Props> = ({ height }) => {
  return (
    <div className="code-card">
      <SandpackProvider
        style={{ height }}
        theme={aquaBlue}
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
};
