import { FC, RefObject } from "react";
import "./scroll-panel.css";

type Props = {
  listRef: RefObject<HTMLUListElement | null>;
  onUp: () => void;
  onDown: () => void;
};

export const ScrollPanel: FC<Props> = ({ listRef, onUp, onDown }) => {
  return (
    <div className="scroll-panel">
      <ul ref={listRef} className="container">
        <li>🍑</li>
        <li>🍋</li>
        <li>🌿</li>
        <li>🦄</li>
      </ul>
      <div className="button-group">
        <button className="button" onClick={onUp}>
          ↑ Up
        </button>
        <button className="button" onClick={onDown}>
          ↓ Down
        </button>
      </div>
    </div>
  );
};
