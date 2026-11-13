"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export function VirtualTrackList({ count, renderRow, rowHeight=56, activeIndex }: { count: number; activeIndex?:number; rowHeight?:number; renderRow: (index: number) => ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // This stateful virtualizer is intentionally excluded from compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({ count, getScrollElement: () => scrollRef.current, estimateSize: () => rowHeight, overscan: 5 });
  useEffect(()=>{if(activeIndex!==undefined&&activeIndex>=0)virtualizer.scrollToIndex(activeIndex,{align:"auto"});},[activeIndex,virtualizer]);
  return <div ref={scrollRef} className="track-scroll" role="list" aria-label="Tracks" style={{ height: Math.min(count * rowHeight, 840) }}>
    <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
      {virtualizer.getVirtualItems().map(row => <div role="listitem" key={row.key} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: row.size, transform: `translateY(${row.start}px)` }}>{renderRow(row.index)}</div>)}
    </div>
  </div>;
}
