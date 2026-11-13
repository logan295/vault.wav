export type VfxClip = { id: string; src: string; poster: string; label: string; group: string };
export const VFX_SOURCES = [
  { name:"ImmerGround / CC0", url:"https://immerground.com/loops", detail:"1080p and 4K beat-synced loops · 16 clips included" },
  { name: "Beeple", url: "https://beeple-crap.com/vjloops", detail: "Creative Commons visuals · download the artist’s packs" },
  { name: "DocOptic / Negated", url: "https://docoptic.com/downloads/negated/", detail: "Five free HD geometric loops · free checkout required" },
  { name: "Resolume Footage", url: "https://resolume.com/footage", detail: "Professional licensed packs · import your purchased H.264 conversion" },
] as const;
