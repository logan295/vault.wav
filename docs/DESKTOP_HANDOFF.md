# .womp desktop — build context and handoff

Updated November 13, 2026. This document describes the local-first desktop implementation shipped in the November 13 Apple Silicon DMG. The product direction is Spotify-style library browsing combined with a compact, Rekordbox-inspired performance desk and a music-driven virtual stage.

## Desktop delivery

- Electron 45 desktop shell, Next.js 16 / React 19 application, Three.js / React Three Fiber stage renderer.
- macOS arm64 (Apple Silicon) is the packaged and locally checked target. Intel, Windows and Linux installers have not been produced for this release.
- The app includes its runtime; installed users do not need Node or a development server. Open the DMG and drag Womp into Applications.
- Local web UI binds to `127.0.0.1:3147`; live timing bridge uses port 3148. Close a separately running development server before launching the desktop app.
- User indexes, playlists and VFX imports live outside the app bundle. File → Open app data folder locates the desktop data directory. Updating the app preserves that directory.
- The public DMG starts without the developer's library index or playlists. Music must be added/scanned on the destination Mac. Existing local data is not replaced.
- This is a development desktop build, not a notarized commercial installer. Do not describe it as Apple-notarized or universally compatible.

## Local music library

USB/source scanning, original-location audio playback, search, artwork, playlists, playlist covers, virtualized track lists, metadata preparation, waveform caching and analysis are implemented. Mounted macOS drives are discovered under `/Volumes`. Missing/disconnected sources remain dependent on their original files becoming available again. Rekordbox USB/XML metadata supports cues, BPM, first-beat anchors and export workflows; see the README and USB guide for supported paths. Optional cloud upload code is separate from the local-first workflow.

## DJ / Perform workspace

`/perform` has a two-deck DJ view, four-deck performance view, loop view and controller view.

- Two full-width scrolling RGB waveforms share a centered playhead and musical time scale. Zoom controls change the visible beat span. Upper waveforms support click-to-seek and pointer scrubbing; the compact track overview supports direct position seeking. Tracks can be dragged from the browser onto a deck or its mixing lane.
- Clicking a mixing waveform focuses it for keyboard navigation: Left/Right jump one beat; Shift + Left/Right jump four beats.
- A compact center mixer provides channel level, trim, three-band EQ, filter, cue routing, mute/solo, echo, output meters and crossfader. The library height and mixer/sidebar widths can be adjusted. Smaller screens reserve space for the operating controls.
- Play/pause, master-deck selection, beat sync, tempo, master tempo/key lock, key shift and key sync are present. The clock can be owned by a deck or the header. This is a local musical clock, not Ableton Link.
- CUE returns/stops a playing deck; while paused it sets the cue at the current position and previews while held, returning on release. Pressing Play during held cue latches playback. Eight colored hot cues have set/play/clear modes; Shift-click also clears. Empty pads set a cue, saved pads launch it. Phrase fill populates empty slots without replacing existing cues.
- Per-deck Q snaps newly set cues and loop endpoints to the track's beat grid. Its accuracy depends on BPM and first-beat preparation. Analyze/edit beat grid remains available.
- Auto loops support 1/4, 1/2, 1, 2, 4, 8, 16 and 32 beats; IN/OUT sets a manual loop, AUTO/EXIT engages/exits, and halve/double changes loop length. Active loop ranges are drawn on the waveforms.
- Beat jump supports 1/2 through 64 beats. With a loop active it moves the loop and playhead together while retaining loop duration. Ordinary jumps retain the selected musical interval and clamp to track boundaries.
- Cue/metadata persistence and Save/Recall State exist. A saved state is distinct from the audio files themselves.

Waveform and jog interaction currently seeks/scrubs the playback position; full vinyl scratch audio emulation is not implemented. Do not claim feature parity with Rekordbox.

## Audio and FLX10

Web Audio playback includes the bundled SoundTouch worklet for key-preserving tempo changes and independent pitch shifting. The desktop native audio helper and output worklet support device/channel routing for separate master and headphone outputs. The default stereo route does not imply a separate physical headphone output. Device selection is under Controller & audio.

An FLX10 MIDI mapping handles supported transport, mixer, browsing, cue and jog messages. Hardware support is MIDI-oriented: FLX10 HID displays, full controller firmware integration, system audio capture and a standalone installed audio driver are not included. Automated message/routing checks are not proof of testing every physical controller function. The File menu's optional FLAC conversion depends on a local ffmpeg installation; it does not download or bypass protected Spotify audio.

## Stage and laser show

The show can follow .womp library playback or external Rekordbox timing. The external route uses the local timing bridge and the separate Rekordbox/TimecodeLink setup described in `docs/rekordbox-live-sync.md`. It follows timing/track data; it does not carry DJ audio.

The compact live booth includes a live stage monitor, camera selection, laser/lighting/visual/stage banks, output faders, blackout and held flash. Detached stage output shares show state and timing through BroadcastChannel. The booth preview uses a lower-resolution 24 FPS rendering path to leave resources for the show.

Venues include Finger Club / Eye Rig, The Shrine, Circular Arena, Festival Mainstage, Orbital Portal, Laser Cathedral, Warehouse Floor, Prism Temple, Bass Bunker and Halo Arena. These are code-built virtual environments.

Finger Club follows the supplied concert references: two peach finger characters with raised bent arms and fists, expressive faces and eye lenses; a central diamond LED, flanking cutout chevron wings and separate diagonal LED blades; four eye origins plus six additional laser projectors; a mirror ball, trusses, stage, speakers and rear control desk. It is a stylized reconstruction, not a photogrammetry scan or an exact venue replica.

Lasers default to Drops only. Other release modes include arrangement, manual always-on and off. Scanner speed, pattern, fan, beam width, density, banks, color, drop hold/punch and eye-only rig control are exposed. Slow integrated motion avoids jumping scanner phase when speed changes. The pattern bank includes lattice, fans, iris, helix, curtains, wave ribbons, prism and slow pendulum looks.

Drop detection looks for sustained bass/energy returns and suppresses ordinary repeating kicks and isolated hits. Choreography progresses from an opening reveal through a short cut, alternating banks and longer musical phrases. Eye projectors have separate reveal/crossfire/wave/rotating fan targets and brighter drop output. Detection is heuristic; different tracks and beat-grid preparation can affect timing.

**Preview drop — no song needed** runs a silent four-beat buildup and four-bar drop, animates the actual stage rig, then stops automatically. It does not seek or play the music transport. A stop button is available during the preview; blackout still wins. It can be triggered from laser controls or beside projection mapping controls.

## VFX and projection mapping

The visual library includes existing VJ packs plus sixteen curated ImmerGround CC0 clips. Attribution/source URLs are in `public/vj-loops/SOURCES.md`; that list is authoritative for individual asset provenance. Do not assume unrelated imported/user clips have the same license.

Local H.264 MP4 import supports clips up to 150 MB and generated thumbnails. Video textures are pooled by source to reduce duplicate decoders. Fit/fill, speed, saturation, mirror, freeze, linked auto walls and musical auto-change intervals are exposed. Additional generative studio looks are available without video files.

Procedural mapping paints the finger bodies and venue wall surfaces. Eight modes include ripple contours, liquid interference, kaleidoscope, woven ribbons, hyperspace spiral, chromatic cells, fractal inversion and prismatic mandala. Brightness, scale and speed are adjustable. Trip preset selects a stronger fractal treatment; drop onset adds a brief mapping brightness accent.

All laser, lighting and projector mapping output described here is virtual rendering. There is no ILDA, DMX, Art-Net, physical laser calibration or real projector mapping output in this release.

## Main implementation locations

| Area | Paths |
| --- | --- |
| Desktop shell / native output | `desktop/main.cjs`, `desktop/preload.cjs`, `desktop/audio/` |
| Desktop packaging | `scripts/package-desktop.mjs`, `scripts/build-native-audio.mjs` |
| DJ layout / browser | `src/components/perform/` |
| DJ transport / clock / routing | `src/lib/perform/engine.ts`, `clock.ts`, `hardware.ts`, `flx10.ts` |
| Waveform drawing | `src/lib/perform/draw-waveform.ts`, `src/components/perform/mix-waveforms.tsx`, `waveform.tsx`, `use-wave-scrub.ts` |
| Show / booth | `src/components/laser-show-renderer.tsx`, `compact-show-console.tsx` |
| Venue models / atmosphere | `finger-club-venue.tsx`, `circular-arena.tsx`, `shrine-venue.tsx`, `venue-atmosphere.tsx` in `src/components/` |
| Musical show policy | `src/lib/local-audio/{arena-drops,laser-policy,drop-choreography,drop-preview,song-show}.ts` |
| VFX | `src/lib/vfx/`, `src/components/vfx-video-material.tsx`, `vfx-import.tsx`, `src/app/api/local/vfx/` |

## Build and validation

Use Node 24 and the committed npm lockfile. Next.js 16 has breaking changes: read the relevant bundled documentation before changing framework code, per `AGENTS.md`.

```sh
npm ci
npm run build
npm run desktop:package
```

Packaging defaults to an empty starter library. For a private development bundle only, `WOMP_INCLUDE_SEED=1` opts into copying local library/playlist seed data. `WOMP_DESKTOP_OUTPUT` selects the package output directory. The native helper is built by the packaging script; building it requires the macOS compiler/toolchain. Package on the intended architecture rather than assuming a universal binary.

The distributable DMG contains `Womp.app` and an Applications shortcut. Verify it using `hdiutil verify`. Attach read-only to check that the app's embedded `.next/BUILD_ID` matches the production build. Keep installers as GitHub release assets rather than Git blobs.

Relevant checks include:

```sh
node scripts/check-perform.mjs
node scripts/check-perform-audio.mjs
node scripts/check-flx10.mjs
node scripts/check-laser-show.mjs
```

Other focused checks cover native/output worklets, artwork/waveform caching, metadata, playlist portability, Rekordbox export and VFX import/range streaming. Some require an isolated local index/server or compiled native helper; inspect each script before running it against user data.

For the latest changes, production builds and targeted lint/type checks passed; engine tests cover cue behavior, quantized/fractional loops, loop resizing and moving loops with beat jump. Laser tests cover release boundaries, sustained-drop detection, drop progression, bounded eye targets and silent preview timing. Local UI checks exercised laptop-sized deck/booth layouts, loaded waveforms, loop regions, beat jump, keyboard focus/navigation, the installed app and silent drop rendering. The native automation surface could not complete a pointer-drag verification, so do not describe that gesture as separately end-to-end certified. No full physical FLX10 or touring-show certification is implied.

## Next useful work

Validate physical FLX10 mappings and separate headphone/master routing on the target hardware; continue improving waveform spectral presentation, scratch behavior and cue ergonomics; refine venue geometry and drop timing across more music; add signed/notarized installers and repeatable release automation. Keep DJ engine/hardware work coordinated with venue/UI changes, and avoid treating built app bundles, local user indexes or generated `work/` folders as source files.
