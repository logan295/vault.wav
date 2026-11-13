import { Nav, NowPlayingBar, Pfp } from "@/components/chrome";
import { WaveformCanvas } from "@/components/waveform-canvas";
import {
  comments,
  moreReleases,
  nowPlaying,
  release,
  supporterFaces,
  waveformMarkers,
} from "@/lib/mock";

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Mock-backed for now: every route renders the demo release until Supabase
// credentials land, then this becomes a live query on (handle, slug).
export default async function ReleasePage({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  await params;

  return (
    <>
      <Nav />
      <main className="flex-1">
        {/* artwork-derived wash — Spotify lineage, card-less */}
        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(255,92,77,.18) 0%, rgba(79,216,194,.05) 50%, transparent 100%)",
          }}
        >
          <header className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-8 pb-8 pt-14 sm:flex-row sm:items-end sm:gap-8">
            <div
              className="h-[212px] w-[212px] flex-none shadow-[0_30px_80px_rgba(0,0,0,.6)]"
              role="img"
              aria-label={`${release.title} cover art`}
              style={{
                background:
                  "radial-gradient(150px 150px at 80% 15%, #4FD8C2 0%, transparent 56%), radial-gradient(190px 210px at 12% 92%, #FF5C4D 0%, rgba(255,92,77,0) 60%), linear-gradient(155deg, #132528 0%, #040607 92%)",
              }}
            />
            <div className="min-w-0 pb-1">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {release.type}
              </div>
              <h1 className="mb-3.5 mt-2.5 text-balance font-display text-[clamp(38px,6.4vw,72px)] font-black leading-[0.98] tracking-tight">
                {release.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-[14.5px] text-muted-foreground">
                <span className="flex items-center gap-2 font-bold text-foreground">
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{
                      background: "linear-gradient(135deg,#FF5C4D,#4FD8C2)",
                    }}
                  />
                  {release.artist}
                </span>
                <span className="text-faint">•</span>
                <span>{release.trackCount} tracks</span>
                <span className="text-faint">•</span>
                <span>{release.totalLength}</span>
                <span className="text-faint">•</span>
                <span>{release.year}</span>
                <span className="text-faint">•</span>
                <span className="font-mono text-xs text-glass">
                  ◉ {release.quality}
                </span>
              </div>
            </div>
          </header>
        </div>

        <div className="mx-auto max-w-[1200px] px-8">
          {/* action row */}
          <div className="flex flex-wrap items-center gap-5 py-5">
            <button
              aria-label="Play"
              className="grid h-[60px] w-[60px] flex-none cursor-pointer place-items-center rounded-full bg-coral transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <svg width="19" height="21" viewBox="0 0 17 19" aria-hidden>
                <path d="M1.5 1.8v15.4L15.5 9.5z" fill="#060A0B" />
              </svg>
            </button>
            <div>
              <button className="cursor-pointer rounded-full bg-coral px-6 py-3 text-[15px] font-bold text-background">
                Buy · $5+
              </button>
              <div className="mt-1.5 font-mono text-xs text-glass">
                $4.50 → {release.artist} · artists keep 90%
              </div>
            </div>
            <button className="cursor-pointer rounded-full border border-white/20 px-5.5 py-3 text-[14.5px] font-semibold">
              ♥ Support · $3/mo
            </button>
            <div className="ml-auto flex gap-4 font-mono text-xs tabular-nums text-faint">
              <span>▶ {release.plays.toLocaleString()}</span>
              <span>♥ {release.likes}</span>
              <span>{release.supporters} supporters</span>
            </div>
          </div>

          {/* the sacred surface */}
          <div className="pt-3">
            <div className="mb-2 flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
              <span>
                <b className="font-medium text-foreground">
                  {nowPlaying.position}
                </b>{" "}
                / {nowPlaying.duration}
              </span>
              <span className="text-faint">tr 02 — {nowPlaying.track}</span>
            </div>
            <WaveformCanvas
              progress={nowPlaying.progress}
              className="block h-[110px] w-full"
              animate
            />
            <div className="relative h-[22px] border-b border-border">
              {waveformMarkers.map((m) => (
                <span
                  key={m.initials}
                  className="absolute -top-[11px] -translate-x-1/2"
                  style={{ left: `${m.left}%` }}
                >
                  <Pfp initials={m.initials} gradient={m.gradient} size={22} />
                </span>
              ))}
            </div>
          </div>

          {/* comments + rail */}
          <div className="grid grid-cols-1 gap-14 pt-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Pfp
                  initials="LG"
                  gradient="linear-gradient(135deg,#4FD8C2,#6FAE8F)"
                />
                <div className="flex-1 rounded-lg bg-white/5 px-4 py-2.5 text-sm text-faint">
                  Comment at{" "}
                  <b className="font-mono text-xs font-medium text-glass">
                    {nowPlaying.position}
                  </b>{" "}
                  — say something about this moment…
                </div>
              </div>

              <div className="mb-1 flex items-baseline gap-3.5">
                <h3 className="text-[15px] font-bold">251 comments</h3>
                <span className="ml-auto text-[13px] text-faint">
                  Sorted by: Newest
                </span>
              </div>

              {comments.map((c) => (
                <div
                  key={c.id}
                  className="flex gap-3.5 border-t border-border py-4 first:border-t-0"
                >
                  <Pfp initials={c.initials} gradient={c.gradient} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2 text-[13.5px] font-bold">
                      {c.author}
                      {c.timeSecs !== null && (
                        <button className="cursor-pointer font-mono text-xs font-normal text-coral hover:underline">
                          at {fmtTime(c.timeSecs)}
                        </button>
                      )}
                      {c.supporter && (
                        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-glass">
                          supporter
                        </span>
                      )}
                      <span className="text-xs font-normal text-faint">
                        {c.age}
                      </span>
                    </div>
                    <p className="mb-1.5 mt-1 max-w-[60ch] text-[14.5px] text-muted-foreground">
                      {c.body}
                    </p>
                    <button className="cursor-pointer text-[12.5px] font-semibold text-faint hover:text-muted-foreground">
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* rail — flat sections, Spotify lineage */}
            <aside>
              <section className="mb-8">
                <div className="mb-3.5 flex items-center gap-3.5">
                  <span
                    className="h-14 w-14 rounded-full"
                    style={{
                      background: "linear-gradient(135deg,#FF5C4D,#4FD8C2)",
                    }}
                  />
                  <div>
                    <div className="text-[15.5px] font-bold">
                      {release.artist}
                    </div>
                    <div className="text-[12.5px] text-faint">
                      {release.artistFollowers.toLocaleString()} followers ·{" "}
                      {release.artistLocation}
                    </div>
                  </div>
                </div>
                <button className="w-full cursor-pointer rounded-full border border-white/20 py-2.5 text-[13.5px] font-semibold">
                  Follow
                </button>
              </section>

              <section className="mb-8">
                <h4 className="mb-3.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  More from {release.artist}
                </h4>
                {moreReleases.map((r) => (
                  <div key={r.title} className="flex items-center gap-3 py-2">
                    <div
                      className="h-[42px] w-[42px] flex-none"
                      style={{ background: r.gradient }}
                    />
                    <div>
                      <div className="text-[13.5px] font-semibold leading-tight">
                        {r.title}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-faint">
                        {r.stats}
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              <section className="mb-8">
                <h4 className="mb-3.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {release.supporters} supporters
                </h4>
                <div className="flex">
                  {supporterFaces.map((f, i) => (
                    <span key={f.initials} className={i > 0 ? "-ml-2" : ""}>
                      <Pfp initials={f.initials} gradient={f.gradient} size={30} />
                    </span>
                  ))}
                </div>
                <div className="mt-2.5 text-[12.5px] text-faint">
                  <b className="font-semibold text-glass">$3/mo</b> unlocks the
                  full catalog in lossless
                </div>
              </section>

              <section className="border-t border-border pt-4.5">
                <h4 className="mb-3.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  The .womp pledge
                </h4>
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  {[
                    "Artists keep 90% of every dollar",
                    "Uploads never train AI",
                    "Your fan list is yours — export any day",
                  ].map((li) => (
                    <li key={li}>
                      <span className="text-glass">— </span>
                      {li}
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>
      <NowPlayingBar />
    </>
  );
}
