// Demo catalog shown until Supabase credentials are wired in .env.local.
// Shapes mirror the DB schema so swapping to live queries is mechanical.

export type MockTrack = {
  id: string;
  title: string;
  position: number;
  durationSecs: number;
  format: "wav" | "mp3";
  sampleRate?: number;
  bitDepth?: number;
  bitrateKbps?: number;
};

export type MockComment = {
  id: string;
  author: string;
  initials: string;
  gradient: string;
  timeSecs: number | null;
  body: string;
  age: string;
  supporter: boolean;
};

export const release = {
  artist: "Maravilla",
  artistHandle: "maravilla",
  artistLocation: "San Diego",
  artistFollowers: 2214,
  slug: "night-swimming",
  title: "Night Swimming",
  type: "EP",
  year: 2026,
  trackCount: 6,
  totalLength: "21:14",
  quality: "24-bit / 96 kHz WAV",
  priceMinCents: 500,
  supporterCents: 300,
  plays: 1204,
  likes: 143,
  supporters: 86,
  masteredBy: "K. Otonashi",
};

export const nowPlaying = {
  track: "Undertow",
  position: "01:23.402",
  duration: "03:37.019",
  progress: 0.38,
};

export const comments: MockComment[] = [
  {
    id: "c1",
    author: "ria.anders",
    initials: "RA",
    gradient: "linear-gradient(135deg,#4FD8C2,#256B5C)",
    timeSecs: 83,
    body: "heard that sub drop under the vocal lossless for the first time — it's a different song.",
    age: "2 days ago",
    supporter: true,
  },
  {
    id: "c2",
    author: "jtburns",
    initials: "JT",
    gradient: "linear-gradient(135deg,#D18F60,#B54536)",
    timeSecs: 31,
    body: "been here since the demos. this mix is the one — congrats M.",
    age: "4 days ago",
    supporter: false,
  },
  {
    id: "c3",
    author: "dvaughn_",
    initials: "DV",
    gradient: "linear-gradient(135deg,#FF5C4D,#7A241B)",
    timeSecs: 124,
    body: "this part makes me go crazy every time. bought the WAV just to hear it on the studio monitors.",
    age: "1 week ago",
    supporter: true,
  },
  {
    id: "c4",
    author: "m.kessler",
    initials: "MK",
    gradient: "linear-gradient(135deg,#F2F7F6,#93A2A0)",
    timeSecs: 62,
    body: "the stereo image at the bridge is unreal. what mics on those rooms?",
    age: "1 week ago",
    supporter: false,
  },
];

export const waveformMarkers = [
  { left: 14, initials: "JT", gradient: "linear-gradient(135deg,#D18F60,#B54536)" },
  { left: 31, initials: "MK", gradient: "linear-gradient(135deg,#F2F7F6,#93A2A0)" },
  { left: 38, initials: "RA", gradient: "linear-gradient(135deg,#4FD8C2,#256B5C)" },
  { left: 57, initials: "DV", gradient: "linear-gradient(135deg,#FF5C4D,#7A241B)" },
  { left: 71, initials: "SB", gradient: "linear-gradient(135deg,#93A2A0,#3A4645)" },
];

export const moreReleases = [
  { title: "Salt Lines", stats: "▶ 3.1K · ♥ 204 · $2+", gradient: "linear-gradient(135deg,#256B5C,#040607)" },
  { title: "Demos, Vol. 1", stats: "▶ 968 · ♥ 77 · stream", gradient: "linear-gradient(135deg,#93A2A0,#132528)" },
  { title: "Pale Blue Sun", stats: "▶ 5.4K · ♥ 411 · $4+", gradient: "linear-gradient(135deg,#B54536,#040607)" },
];

export const supporterFaces = [
  { initials: "RA", gradient: "linear-gradient(135deg,#4FD8C2,#256B5C)" },
  { initials: "JT", gradient: "linear-gradient(135deg,#D18F60,#B54536)" },
  { initials: "DV", gradient: "linear-gradient(135deg,#FF5C4D,#7A241B)" },
  { initials: "MK", gradient: "linear-gradient(135deg,#F2F7F6,#93A2A0)" },
  { initials: "+81", gradient: "linear-gradient(135deg,#6FAE8F,#132528)" },
];

export const marquee = [
  ["MARAVILLA", "san diego"],
  ["SALT LINES", "new EP"],
  ["K. OTONASHI", "mastering"],
  ["LOW TIDE TAPES", "label"],
  ["GLASSHOUSE", "24-bit/96k"],
  ["REST STOPS", "supported by 214 fans"],
];
