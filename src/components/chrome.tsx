import Link from "next/link";
import { nowPlaying, release } from "@/lib/mock";

export function Nav() {
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[58px] max-w-[1200px] items-center gap-8 px-8">
        <Link href="/" className="font-display text-sm font-bold tracking-tight">
          vault<span className="text-coral">.wav</span>
        </Link>
        <nav className="flex gap-6 text-sm font-semibold text-muted-foreground">
          <Link href="/" className="text-foreground">
            Explore
          </Link>
          <Link href="/library" className="transition-colors hover:text-foreground">
            Library
          </Link>
          <Link href="/find" className="transition-colors hover:text-foreground">
            Find
          </Link>
          <Link href="/studio" className="transition-colors hover:text-foreground">
            Studio
          </Link>
        </nav>
        <Link
          href="/studio"
          className="ml-auto rounded-full bg-foreground px-5 py-2 text-[13.5px] font-bold text-background transition-transform hover:-translate-y-px"
        >
          Upload
        </Link>
      </div>
    </div>
  );
}

export function NowPlayingBar() {
  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[66px] max-w-[1200px] items-center gap-4 px-8">
        <div
          className="h-10 w-10 flex-none"
          style={{ background: "linear-gradient(140deg,#132528,#FF5C4D 135%)" }}
        />
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-bold">{nowPlaying.track}</div>
          <div className="text-xs text-faint">{release.artist}</div>
        </div>
        <MiniWave />
        <div className="flex-none font-mono text-xs tabular-nums text-muted-foreground">
          01:23 / 03:37
        </div>
        <div className="flex-none font-mono text-[10.5px] text-glass">◉ LOSSLESS</div>
      </div>
    </div>
  );
}

function MiniWave() {
  const rnd = (i: number) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  const bars = Array.from({ length: 90 }, (_, j) => ({
    h: Math.round(3 + rnd(j + 11) * 22),
    on: j < 34,
  }));
  return (
    <div className="flex h-7 min-w-0 flex-1 items-center gap-[1.5px]" aria-hidden>
      {bars.map((b, i) => (
        <i
          key={i}
          className="min-w-px flex-1"
          style={{
            height: b.h,
            background: b.on ? "#FF5C4D" : "rgba(255,255,255,.14)",
          }}
        />
      ))}
    </div>
  );
}

export function Pfp({
  initials,
  gradient,
  size = 34,
}: {
  initials: string;
  gradient: string;
  size?: number;
}) {
  return (
    <span
      className="grid flex-none place-items-center rounded-full font-mono font-medium text-background"
      style={{
        width: size,
        height: size,
        background: gradient,
        fontSize: Math.max(8.5, size * 0.31),
      }}
    >
      {initials}
    </span>
  );
}
