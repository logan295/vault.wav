const NOTES: Record<string, number> = {
  C: 0,
  "C#": 1,
  DB: 1,
  D: 2,
  "D#": 3,
  EB: 3,
  E: 4,
  F: 5,
  "F#": 6,
  GB: 6,
  G: 7,
  "G#": 8,
  AB: 8,
  A: 9,
  "A#": 10,
  BB: 10,
  B: 11,
};
const CAMELOT_MAJOR = [11, 6, 1, 8, 3, 10, 5, 0, 7, 2, 9, 4],
  CAMELOT_MINOR = [8, 3, 10, 5, 0, 7, 2, 9, 4, 11, 6, 1];
export function parseKey(value: string | null | undefined) {
  if (!value) return null;
  const text = value.trim().replaceAll("♯", "#").replaceAll("♭", "b");
  const camelot = /^(1[0-2]|[1-9])([AB])$/i.exec(text);
  if (camelot)
    return {
      note: (camelot[2].toUpperCase() === "A" ? CAMELOT_MINOR : CAMELOT_MAJOR)[
        Number(camelot[1]) - 1
      ],
      minor: camelot[2].toUpperCase() === "A",
    };
  const match = /^([A-Ga-g])([#b]?)(?:\s*(major|minor|maj|min|m))?$/i.exec(
    text,
  );
  if (!match) return null;
  return {
    note: NOTES[(match[1] + match[2]).toUpperCase()],
    minor: ["minor", "min", "m"].includes(match[3]?.toLowerCase()),
  };
}
export function keyShift(
  from: string | null | undefined,
  to: string | null | undefined,
  targetShift = 0,
) {
  const source = parseKey(from),
    target = parseKey(to);
  if (!source || !target || source.minor !== target.minor) return null;
  return ((target.note + targetShift - source.note + 18) % 12) - 6;
}
