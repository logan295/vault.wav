"use client";
import { useRef } from "react";
export function ResizeHandle({
  label,
  value,
  min,
  max,
  axis,
  direction = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  axis: "x" | "y";
  direction?: 1 | -1;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ position: number; value: number } | null>(null);
  const change = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`dj-resize dj-resize-${axis}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = {
          position: axis === "x" ? e.clientX : e.clientY,
          value,
        };
      }}
      onPointerMove={(e) => {
        if (drag.current)
          change(
            drag.current.value +
              direction *
                ((axis === "x" ? e.clientX : e.clientY) -
                  drag.current.position),
          );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        if (
          ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(e.key)
        ) {
          e.preventDefault();
          change(
            value +
              direction * (["ArrowLeft", "ArrowUp"].includes(e.key) ? -10 : 10),
          );
        }
      }}
    >
      <i />
    </div>
  );
}
