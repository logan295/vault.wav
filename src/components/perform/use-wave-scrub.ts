"use client";
import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { PerformEngine } from "@/lib/perform/engine";
export function useWaveScrub(
  engine: PerformEngine,
  index: number,
  span: number,
  start: number | (()=>number),
  direction = -1,
) {
  const drag = useRef<{
      x: number;
      position: number;
      span: number;
      width: number;
      left: number;
      start: number;
      moved: boolean;
      element: HTMLElement;
    } | null>(null),
    pending = useRef<number | null>(null),
    frame = useRef(0);
  const flush = () => {
    frame.current = 0;
    if (pending.current !== null) {
      engine.scrubTo(index, pending.current);
      pending.current = null;
    }
  };
  const finish = (e: ReactPointerEvent<HTMLElement>, cancel = false) => {
    const active = drag.current;
    if (!active) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    if (!active.moved && !cancel) {
      pending.current = Math.max(
        0,
        active.start + ((e.clientX - active.left) / active.width) * active.span,
      );
    }
    flush();
    drag.current = null;
    engine.endScrub(index);
    e.currentTarget.style.cursor = "";
  };
  useEffect(() => {
    const cancel = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      pending.current = null;
      if (drag.current) drag.current.element.style.cursor = "";
      drag.current = null;
      engine.endScrub(index);
    };
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, [engine, index]);
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0 || !engine.decks[index].buffer) return;
      e.preventDefault();
      e.currentTarget.focus();
      const visibleStart=typeof start==="function"?start():start;
      const r = e.currentTarget.getBoundingClientRect();
      drag.current = {
        x: e.clientX,
        position: direction===1 ? visibleStart+((e.clientX-r.left)/r.width)*span : engine.position(index),
        span,
        width: r.width,
        left: r.left,
        start:visibleStart,
        moved: false,
        element: e.currentTarget,
      };
      engine.beginScrub(index);
      if(direction===1)engine.scrubTo(index,drag.current.position);
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.style.cursor = "grabbing";
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const active = drag.current;
      if (!active) return;
      const delta = e.clientX - active.x;
      if (!active.moved && Math.abs(delta) < 2) return;
      active.moved = true;
      pending.current =
        active.position + ((direction * delta) / active.width) * active.span;
      if (!frame.current) frame.current = requestAnimationFrame(flush);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => finish(e),
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => finish(e, true),
    onLostPointerCapture: (e: ReactPointerEvent<HTMLElement>) =>
      finish(e, true),
  };
}
