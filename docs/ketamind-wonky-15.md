# Ketamind · Wonky 15

Fifteen original procedural visuals, each with separate geometry and rhythm. These are realtime WebGL visuals, not fifteen recolors of a video. Select them in **Laser show → Live console → Visuals → Collection → Ketamind · Wonky 15**. The **Audition Ketamind** link opens `/ketamind` without replacing the controller. The same selection is sent to the detached stage, including its center diamond and side screens.

## Beat pairings

| Visual | Rhythm / response |
| --- | --- |
| Gloop Cathedral | Quarter-note compression of liquid organ pipes; drop opens their chamber. |
| Jawbreaker Oracle | Half-time snare teeth, quarter-note mouth dilation. |
| Triplet Tentacles | Three contractions per beat; curl direction changes each bar. |
| Subfloor Worm | Quarter-note body compression, eighth-note skin ridges. |
| Rubber Duck Reactor | Kick squash and offbeat release; drop halo overload. |
| Fractal Fungus | Two-beat cap blooms and sixteenth-note spore sparks. |
| Chrome Centipede | Eighth-note leg stepping; snare displaces the spine. |
| Goblin Laundry | Four-beat warped cloth fold; snare color inversion. |
| Bass Guillotine | Quarter-note opening versus half-time snare blade closure. |
| Acid Ant Farm | Sixteenth-note ant circuits and quarter-note chamber pulses. |
| Pixel Poltergeist | Snare pixel scramble and eighth-note gaze movement. |
| Time Slime | Four-beat clock rotation, kick melting, snare marker displacement. |
| Eyeball Carousel | Eight-beat orbit, quarter-note pupils and snare blinks. |
| Jellyfish Switchyard | Offbeat propulsion, triplet tentacle sparks and drop expansion. |
| Ketamind Singularity | Sixteen-beat accretion cycle, kick distortion and drop shockwave. |

These are rhythmic assignments: “kick” means the quarter-note kick lane, and “snare” the half-time lane at beat 3 of a four-beat bar. They do not claim to classify the actual drum stems in arbitrary audio. Existing analyzed attacks add accents and detected drops drive expansion. The pack receives `arenaFrame.beat`, `.time`, `.bpm`, `.attack`, `.dropBeat` and the song cue, so it follows the same grid, transport interpolation and cue motion as the show. A pause freezes that transport; a seek recomputes the same visual state. Tempo changes alter wall-clock speed without baking a fixed BPM into the art.

No particular beat audio files were supplied in this request. Therefore these pairings work against the song selected in Vault or matched in rekordbox; no named track-to-visual match is fabricated. For unindexed live tracks, the existing live timing limits still apply: no future analyzed drop prediction.

## Preview and delivery

- `/ketamind`: responsive audition page with 15 selectors, preview BPM, pause/reset, and the currently playing library track as a clock source. The synthetic preview drop is explicitly labeled at beat 32. It plays no audio of its own.
- `public/ketamind/ketamind-wonky-15.html`: self-contained, offline WebGL audition of all 15. No CDN or installation. Space pauses, left/right switches, H hides the controls. `?visual=<id>` opens a particular design.
- `public/ketamind/beat-pairings.csv` and `.json`: names and rhythm assignments.
- `public/ketamind/contact-sheet.html`: actual rendered frames of all 15, with links to their offline audition.
- `public/ketamind/renders/*.png`: browser-rendered stills, not animation files. SVG files are lightweight symbolic alternates.
- The final ZIP includes the offline player, stills, pairings and this guide. Real-time show delivery requires the project changes; the ZIP is an audition pack, not an MP4 pack.

`src/lib/visuals/ketamind-shader.ts` contains the shared GLSL program with 15 separate scene branches. `ketamind-material.tsx` supplies live uniforms. `scripts/export-ketamind.mjs` regenerates the portable player, pairings and SVG alternates. Actual PNG stills are captured from the browser renderer. No supplied stock clip is embedded in this pack.

## Validation

Run `node scripts/check-ketamind.mjs`, the existing live-sync and song-program checks, TypeScript, ESLint and the production build. The new check verifies all 15 registry entries/assets, exported metadata, exact pulse boundaries, triplet/sixteenth rates, drop decay and deterministic state when paused or seeking. Browser review must also check the gallery, the offline shader player, all 15 selections, mobile width, a detached stage, and no shader compile errors. Hardware rekordbox validation requires a connected live deck; browser/clock checks alone do not establish it.

## Delivery verification, November 14, 2026

TypeScript, targeted ESLint, all three check scripts and `npm run build` passed. The build retained the existing playlists filesystem tracing warning. All 15 branches rendered in the offline player with no shader errors; their PNGs are distinct. The production gallery rendered, pause/reset and 175 BPM changes worked, and a 390px iframe had no horizontal overflow (379px client width and scroll width). Live-console pack filtering and all three pages were checked; selecting Rubber Duck Reactor and Ketamind Singularity reached the detached stage screens. Electron popup initialization logs were present in the in-app browser, but no shader compile errors were observed and stage rendering worked.

Port 3147 was owned by a different project, so this preview is running at `http://127.0.0.1:3157/ketamind` with its receiver on 3148. No live DJ hardware or supplied beat-audio pairing was validated in this run. This is a local feature branch; it has not been pushed to GitHub.
