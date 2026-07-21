"use client";

import { useEffect, useRef } from "react";

function rnd(i: number) {
  return Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
}

type Props = {
  /** 0..1 playback progress */
  progress?: number;
  bars?: number;
  className?: string;
  /** slow ambient playhead drift (release page hero) */
  animate?: boolean;
};

/**
 * The sacred surface. Fine dense bars (SoundCloud lineage) with a reflection,
 * coral progress, foam playhead. Peaks are deterministic here (mock);
 * the live player feeds precomputed peaks from the DB.
 */
export function WaveformCanvas({
  progress = 0.38,
  bars = 300,
  className,
  animate = false,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const W = cv.width;
    const H = cv.height;
    const gap = 2;
    const bw = (W - gap * (bars - 1)) / bars;
    const base = H * 0.72;

    const heights: number[] = [];
    for (let i = 0; i < bars; i++) {
      const t = i / bars;
      heights.push(
        Math.min(
          1,
          Math.max(
            0.05,
            0.22 +
              0.3 * Math.abs(Math.sin(t * 7.7)) +
              0.26 * Math.abs(Math.sin(t * 19.3 + 1.2)) +
              0.22 * rnd(i),
          ),
        ),
      );
    }

    function draw(p: number) {
      ctx!.clearRect(0, 0, W, H);
      for (let i = 0; i < bars; i++) {
        const x = i * (bw + gap);
        const on = i / bars < p;
        const up = heights[i] * base * 0.97;
        const dn = heights[i] * (H - base) * 0.8;
        ctx!.fillStyle = on ? "#FF5C4D" : "rgba(255,255,255,.16)";
        ctx!.fillRect(x, base - up, bw, up);
        ctx!.fillStyle = on ? "rgba(255,92,77,.34)" : "rgba(255,255,255,.055)";
        ctx!.fillRect(x, base + 2, bw, dn);
      }
      ctx!.fillStyle = "rgba(242,247,246,.92)";
      ctx!.fillRect(p * W - 1, 4, 2, H - 8);
    }

    draw(progress);

    if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let raf = 0;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (start === null) start = ts;
        let p = progress + ((ts - start) / 1000) * 0.004;
        if (p > 0.985) {
          start = ts;
          p = progress;
        }
        draw(p);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
  }, [progress, bars, animate]);

  return (
    <canvas
      ref={ref}
      width={2000}
      height={192}
      className={className ?? "block h-24 w-full"}
      aria-hidden
    />
  );
}

/** Glowing waveform skyline for the landing hero — swells toward center, burns at the baseline. */
export function HorizonCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = cv.width;
    const H = cv.height;
    const N = 190;
    const gap = 3;
    const bw = (W - gap * (N - 1)) / N;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const env = Math.sin(t * Math.PI);
      const h = (0.12 + 0.75 * env * (0.45 + 0.55 * rnd(i))) * H;
      const x = i * (bw + gap);
      const g = ctx.createLinearGradient(0, H - h, 0, H);
      g.addColorStop(0, "rgba(255,92,77,.05)");
      g.addColorStop(0.75, "rgba(255,92,77,.55)");
      g.addColorStop(1, "rgba(255,92,77,.95)");
      ctx.fillStyle = g;
      ctx.fillRect(x, H - h, bw, h);
    }
  }, []);

  return (
    <canvas
      ref={ref}
      width={2400}
      height={380}
      className={className ?? "block h-[190px] w-full"}
      aria-hidden
    />
  );
}
