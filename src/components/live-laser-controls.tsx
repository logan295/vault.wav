import { useState } from "react";

const colors = [
  ["White", "#ffffff"], ["Cyan", "#00e5ff"], ["Blue", "#2a8cff"],
  ["Purple", "#9a70ff"], ["Pink", "#ff3d98"], ["Red", "#ff1744"],
  ["Amber", "#ff9100"], ["Lime", "#78ff4d"],
] as const;
const combinations = [
  { name: "Ice", colors: ["#00e5ff", "#2a8cff", "#ffffff"] },
  { name: "Neon", colors: ["#9a70ff", "#ff3d98", "#00e5ff"] },
  { name: "Fire", colors: ["#ff1744", "#ff9100", "#ffd84a"] },
];

export type LaserTarget = "both" | "left" | "floor";

export function LiveLaserControls({ palette, onPalette, patterns, pattern, onPattern, target, onTarget, bankControls }: {
  palette: string[]; onPalette: (palette: string[]) => void;
  patterns: readonly string[]; pattern: number | null | undefined; onPattern: (pattern: number | null) => void;
  target: LaserTarget; onTarget: (target: LaserTarget) => void; bankControls: boolean;
}) {
  const [panel, setPanel] = useState<"styles" | "colors">("styles");
  const [mix, setMix] = useState(false);
  const selectColor = (color: string) => onPalette(mix
    ? palette.includes(color) ? palette.filter((entry) => entry !== color) : [...palette, color]
    : [color]);
  const quickStyles = bankControls
    ? [0, 1, 3, 5, 7, 12, 13, 15]
    : [0, 1, 2, 4, 5, 7, 10, 13];

  return <section aria-label="Quick laser controls" className="space-y-4 border-b border-white/10 bg-[#101416] p-3 sm:p-4">
    <div className="grid grid-cols-2 gap-2" aria-label="Quick control page">
      <button type="button" aria-pressed={panel === "styles"} onClick={() => setPanel("styles")} className="min-h-11 rounded-md border border-white/20 text-sm aria-pressed:bg-emerald-300/20">Laser styles</button>
      <button type="button" aria-pressed={panel === "colors"} onClick={() => setPanel("colors")} className="min-h-11 rounded-md border border-white/20 text-sm aria-pressed:bg-sky-300/20">Laser colors</button>
    </div>
    <div hidden={panel !== "colors"}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">Laser colors</h3>
        <button type="button" aria-pressed={mix} onClick={() => setMix((value) => !value)}
          className="min-h-11 rounded-md border border-white/20 px-3 text-sm text-white/80 aria-pressed:bg-sky-300/20">Mix colors</button>
      </div>
      <div className="grid grid-cols-4 gap-2" aria-label="Laser color palette">
        {colors.map(([name, color]) => <button key={name} type="button" aria-label={`Laser color ${name}`}
          aria-pressed={palette.includes(color)} onClick={() => selectColor(color)}
          className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md border border-white/15 bg-white/3 text-xs text-white/85 hover:bg-white/10 aria-pressed:border-white aria-pressed:bg-white/10">
          <span className="size-5 rounded-full ring-1 ring-white/25" style={{ backgroundColor: color }} aria-hidden="true" />{name}
        </button>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" aria-label="Laser color presets">
        <button type="button" onClick={() => onPalette([])} aria-pressed={!palette.length}
          className="min-h-11 rounded-md border border-white/20 px-3 text-sm text-white/80 aria-pressed:bg-white/15">Auto colors</button>
        {combinations.map((preset) => <button key={preset.name} type="button"
          aria-pressed={palette.length === preset.colors.length && palette.every((color, index) => color === preset.colors[index])}
          onClick={() => onPalette(preset.colors)}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 text-sm text-white/80 aria-pressed:bg-white/15">
          <span className="size-4 rounded-full" style={{ background: `linear-gradient(135deg,${preset.colors.join(",")})` }} aria-hidden="true" />{preset.name}
        </button>)}
        <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-2 text-sm text-white/80">Custom
          <input aria-label="Custom laser color" type="color" value={palette[0] ?? "#00e5ff"}
            onChange={(event) => onPalette([event.target.value])} className="size-8 cursor-pointer rounded bg-transparent" />
        </label>
      </div>
      <p className="mt-2 text-xs text-white/65">{mix ? "Tap swatches to add or remove colors. An empty palette follows the music." : "Tap a color to apply it to every laser."}</p>
    </div>
    <div hidden={panel !== "styles"}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">Laser styles</h3>
        {bankControls && <div className="flex gap-1" aria-label="Laser style target">
          {([["Both", "both"], ["Top", "left"], ["Bottom", "floor"]] as const).map(([name, value]) => <button type="button" key={value}
            aria-pressed={target === value} onClick={() => onTarget(value)}
            className="min-h-11 rounded-md border border-white/20 px-3 text-sm text-white/80 aria-pressed:bg-sky-300/20">{name}</button>)}
        </div>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Quick laser styles">
        {quickStyles.map((index) => <button key={index} type="button" aria-pressed={pattern === index} onClick={() => onPattern(index)}
          className="min-h-14 rounded-md border border-white/15 bg-[#181e21] px-2 py-2 text-left text-sm font-semibold text-white/85 hover:bg-white/10 aria-pressed:border-emerald-300/60 aria-pressed:bg-emerald-300/15">
          {patterns[index]}
        </button>)}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" aria-pressed={pattern === null} onClick={() => onPattern(null)}
          className="min-h-11 shrink-0 rounded-md border border-white/20 px-3 text-sm text-white/80 aria-pressed:bg-emerald-300/15">{bankControls && target !== "both" ? "Follow master" : "Music auto"}</button>
        <label className="grid min-w-0 flex-1 gap-1 text-xs text-white/70">All laser styles
          <select aria-label="All laser styles" value={pattern === undefined ? -2 : pattern ?? -1}
            onChange={(event) => onPattern(Number(event.target.value) < 0 ? null : Number(event.target.value))}
            className="h-11 min-w-0 rounded-md border border-white/20 bg-black px-2 text-sm text-white">
            <option value={-2} disabled>Different styles per bank</option>
            <option value={-1}>{bankControls && target !== "both" ? "Follow master" : "Music auto"}</option>
            {patterns.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
        </label>
      </div>
    </div>
  </section>;
}
