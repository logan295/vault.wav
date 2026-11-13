# vault.wav

**Desktop build context:** [Current implementation and handoff](docs/DESKTOP_HANDOFF.md) · [Download desktop releases](https://github.com/logan295/vault.wav/releases).

A local music library and browser-based stage visualizer. Browse audio on your USB drives, play it from its original location, and run a visual show from Vault playback or live rekordbox timing.

**Start here:** download → install → run locally → add music → connect live → contribute.

- **Local library and visuals:** no Supabase account, API keys, or DJ hardware required.
- **Live rekordbox / FLX10 sync:** rekordbox, TimecodeLink, and vault.wav run on the **same Mac**. The FLX10 connects to rekordbox by USB.
- **Optional cloud WAV uploads:** require your own Supabase project. See [cloud setup](SETUP.md#optional-cloud-wav-uploads).

“Live” here means following DJ timing and displaying visuals. This repository does not output DMX, Art-Net, ILDA, or commands to physical lasers or lighting fixtures. The TCNet bridge carries timing and track information, not the DJ audio.

## 1. Install the prerequisites

The documented USB and DJ workflow targets **macOS**. It discovers mounted drives under `/Volumes`. Other operating systems have not been validated for the complete workflow.

Install:

1. [Node.js 24 LTS](https://nodejs.org/) with npm. Use Node 24 for the contributor checks, which import TypeScript directly.
2. [Git](https://git-scm.com/downloads) if you want to contribute. ZIP downloads work for trying the app.
3. A current browser with WebGL and BroadcastChannel support. Use the same browser/profile for the controller and detached stage.

Check your Terminal:

```bash
node --version
npm --version
git --version
```

`node --version` should start with `v24.`. Skip the Git check if using a ZIP.

## 2. Download the project

### Contributing: fork and clone

1. Open [logan295/vault.wav](https://github.com/logan295/vault.wav) and click **Fork**.
2. On your fork, click **Code → HTTPS** and copy its clone URL.
3. In Terminal, run the following, replacing `YOUR_GITHUB_USERNAME`:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/vault.wav.git
cd vault.wav
git remote add upstream https://github.com/logan295/vault.wav.git
git switch -c docs/my-change
```

Choose a branch name describing your change. Existing collaborators can clone the main repository directly and create a feature branch instead.

### Just trying it: download a ZIP

Open the repository, choose **Code → Download ZIP**, and unzip it. In Terminal, type `cd `, drag the extracted folder into the Terminal window, then press Return. The folder must contain `package.json`.

A ZIP has no Git history. Use a fork/clone when you are ready to submit changes. Audio files, local indexes, credentials, rekordbox, and TimecodeLink are not included in a download.

## 3. Install dependencies

Run from the folder containing `package.json`:

```bash
npm ci
```

Use npm and the committed `package-lock.json`. You do not need a global Next.js installation. No `.env.local` is needed for the local library or live timing.

## 4. Start vault.wav

```bash
npm run dev -- --webpack --hostname 127.0.0.1 --port 3147
```

Leave this Terminal running and open **[http://127.0.0.1:3147](http://127.0.0.1:3147)**.

The command starts two processes:

- Next.js, the web app, on `127.0.0.1:3147`.
- The live timing receiver on `127.0.0.1:3148`.

The receiver can wait for TimecodeLink while you use the ordinary library. Do not also run `npm run live:bridge`; that would start a second receiver on the same port. Use **Control-C** in the Terminal to stop both.

Use this exact `127.0.0.1` address throughout the guide. USB access and live timing are local-only. Do not expose these processes through a tunnel or bind them to your public network.

**If `scripts/dev-with-live.mjs` or the Rekordbox input is missing:** your download predates live sync. Check the repository branch/release with the maintainer. Changing the command cannot add missing feature files.

## 5. Add music and check playback

1. Connect a USB drive with music and wait for it to appear in Finder.
2. Open **[USB source manager](http://127.0.0.1:3147/local-library)**.
3. Click **Detect drives**, select the drives you want, then **Save & scan**.
4. Play a track from the list. Return to the home page and select **Laser** for visuals.

The scanner recognizes WAV, MP3, AIFF, FLAC, M4A, and AAC files; actual playback depends on browser codec support. WAV is a straightforward first test. Exported rekordbox USB metadata is read when available.

Your audio stays on the drive. The app stores its local index and playlists in ignored `var/` files. Keep the drive connected during playback. Use music you have permission to use.

## Save .womp playlists to a USB

Open **Playlists → Create playlist**. In **Music**, select tracks, choose your playlist, and click **Add to playlist**. Open the playlist, choose its drive, then click **Save to USB**.

Click **Edit details** (or the playlist artwork) to change its name, description, color, and background image. Upload JPG, PNG, or WebP images up to 5 MB; images are resized locally for fast display and can be replaced or removed.

The app writes a versioned JSON file and any playlist image inside `.womp/` on that drive. It stores the playlist name, track order, and relative music paths; audio and Rekordbox files stay untouched. Each portable playlist contains tracks from its chosen drive only. Subsequent renames, reorders, additions, removals, and playlist deletion update the drive automatically. Keep it plugged in while editing, wait for the save to finish, then eject it normally.

When you reconnect, playlists refresh automatically within ten seconds (or when returning to the app). A local copy remains visible while the drive is offline, but changes require reconnecting. On a different Mac, install/run the app and scan the USB first; its playlists then reappear with their saved order. Moving or renaming the audio files requires updating the playlist. This format restores .womp playlists; it does not create Rekordbox playlists.

Portable storage checks: `node scripts/check-portable-playlists.mjs` (Node 24). These use temporary simulated drives and do not change your music.

## 6. Connect your DJ setup live

Follow **[Rekordbox / FLX10 live connection, in order](docs/rekordbox-live-sync.md)** for the complete first-time setup and troubleshooting.

The signal path is:

```text
FLX10 → USB → rekordbox on this Mac
                  ↓
          TimecodeLink on this Mac
                  ↓ TCNet
         vault.wav local receiver
                  ↓
      Browser controller → stage tab → display/projector
```

In short: configure TimecodeLink's rekordbox connection, enable **Master Outputs → TCNet (master)** on the active Mac interface, start vault.wav, then choose **Laser → Input → Rekordbox / FLX10**. Confirm a deck title, changing time, and BPM before opening the stage tab.

Rekordbox and your audio interface remain responsible for sound. Vault does not need microphone permission or a virtual audio cable for TCNet sync. Keep the controller tab open; the stage is a second tab in the same browser, not a remote-device connection.

## Build and run without development mode

Stop the dev server with Control-C first, then:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3147
```

`start` requires a successful build and also starts the timing receiver. Run only one dev/start/receiver instance at a time. This is a local production-mode build, not a deployment to a public website. [Hosting limits](SETUP.md#hosting-and-live-connection-are-different) matter for USB and live sync.

## Contribute

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** for the branch workflow, checks, project map, and what to include in a pull request.

```bash
npm run lint
npx --no-install tsc --noEmit --incremental false
node scripts/check-live-sync.mjs
node scripts/check-show-program.mjs
npm run build
```

Run these before submitting, and report any failures rather than hiding them. No physical DJ hardware is needed for the two check scripts. Live hardware validation is separate.

## More help

- [Local setup, optional Supabase uploads, and audio output](SETUP.md)
- [Live connection and troubleshooting](docs/rekordbox-live-sync.md)
- [Detached live console](docs/live-console.md)
- [The Shrine stage](docs/shrine-venue.md)
- [VJ media sources and usage restrictions](public/vj-loops/SOURCES.md)

There is no repository-wide license file at present. Public source access does not automatically grant redistribution rights. Check the media notices and ask the maintainer before redistributing assets or assuming commercial-use permission.

## Mac desktop build

Use Node 24. After installing dependencies, run `npm run build`, then `npm run desktop:package`. The Apple Silicon application is written to `work/desktop-dist/Womp-darwin-arm64/Womp.app` by default; `WOMP_DESKTOP_OUTPUT` selects another output folder. `npm run desktop` opens the desktop shell from the checkout. This is a local, unsigned build, not a notarized release.

The desktop app starts the local web server and timing receiver when needed. Keep it open to use `http://127.0.0.1:3147` in another browser. App data is stored in the macOS Application Support directory; the first launch imports the personal library snapshot included during packaging. Portable playlist changes continue to save to the chosen USB.

**File → Convert local audio to FLAC** converts files you own or are authorized to use through the installed FFmpeg. It does not download Spotify songs, bypass protected playback, or improve the fidelity of a lossy source. A native system-audio driver and system-audio capture are not included.

Laser’s **Auto show**, **Master**, and **Blackout** controls are available above the preview. **Open stage in new tab** opens a separate stage window in the desktop app, keeping the operator console in the original window. Connection status confirms the stage is receiving updates. Balanced quality is the default for responsive playback.

## Rekordbox export bridge

Use **Rekordbox XML** in the library header to export the current playlist or all .womp playlists. Import the resulting XML into Rekordbox, then use Rekordbox to export the appropriate USB device libraries. The XML includes available files, playlist order, metadata, and imported hot cues, memory cues, and loops. It does not rewrite `PIONEER` databases, create OneLibrary directly, export .womp background images into Rekordbox, or reconstruct variable-tempo beatgrids. Analyze/check grids in Rekordbox before device export. Keep the USB connected while importing, since the XML references its original audio paths.

### Perform prototype

Open **Perform LAB** in the sidebar, or **Mode → Perform** in the Mac app. Enable audio, select a deck, then load a USB library track or drag one into the deck. Four Web Audio decks share an audio-context clock with selectable launch quantization, header/deck master ownership, header lock, varispeed BPM sync, cue return, available imported hot cues, 1–64 bar loops, trim, three-band EQ, filter, volume, mute and solo. Save/Recall State stores track references, offsets and settings in this browser on this Mac. Recall never starts playback automatically.

This is an initial stereo performance prototype. Master Tempo now preserves key during tempo changes, and key shift is independent. Independent headphone routing, FLX10 MIDI/HID mapping, Ableton Link, network clock transport, arrangement editing, MIDI clips, samplers and the guide's complete Perform Loop cue-section workflow are not implemented. The Loop view currently enables deck loops; the Controller view is a display layout. Audio is decoded in memory, so loading four long files can use substantial RAM. Launch quantization uses the shared clock. Beat sync follows the source grid; verify its BPM and downbeat using the preparation controls. Grids currently assume a constant tempo.

Validation: `node scripts/check-perform.mjs` checks clock continuity, scheduled launches, loops, channel mute/solo, owner lock and master limits. Playback, two-deck loading, looping and State recall were also exercised in the browser.

### Portable SoundCloud artwork

Optional JPEG sidecars live at `.womp/artwork/<relative-path-hash>.jpg` on a USB, with attribution and source URLs in `manifest.json`. The app prefers a valid sidecar, then embedded artwork, then its record fallback. The initial KETAMIND pass added 413 matched images; 144 tracks already had embedded artwork and 409 remain unresolved. Music files were not rewritten. These are metadata-based matches and can be reviewed using the exported artwork report.


### DJ controller view and track preparation

Choose **DJ controller · 2 decks** in Perform. It provides jog seeking, tempo faders, Master Tempo key lock, independent semitone pitch, beat/key sync, channel faders and meters, trim/EQ/filter, beat-timed echo, beat jumps, manual/automatic loops and an equal-power A/B crossfader. The jog is a seek control, not vinyl scratching. Key sync requires known keys with the same major/minor mode. Physical FLX10 mapping and independent headphone outputs are not connected.

**CUE** while playing stops and returns to the cue. While paused, holding it sets/previews the cue at the current position; release returns to it. Empty A–H pads set hot cues, saved pads launch, and Shift-click clears. Main cue and hot-cue positions are drawn on the waveform. Zoom +/−, Follow and the pan slider reveal numbered bars and individual beats.

**Analyze / edit beat grid** runs the FFmpeg-based BPM/key/grid analyzer, supports manual native BPM/key correction and half/double BPM, and sets bar 1.1 at the playhead. Estimates need checking, especially half-time/double-time and changing-tempo material. Metadata is atomically saved under the Mac library's `performance-metadata.json` and the mounted USB's `.womp/track-metadata.json`, keyed by relative music path. Music files and Pioneer databases are not changed. The USB copy restores preparation on another library scan; offline failures are surfaced in deck status. These hot cues also appear in Rekordbox XML export.

The compact browser uses 34 px virtualized rows and a collapsible playlist sidebar. Draggable/keyboard-operable separators resize browser height, sidebar width and mixer width; dimensions persist locally. Performance States save deck settings and positions in the browser; track preparation travels on USB separately.

Pitch processing uses the bundled, unmodified SoundTouchJS audio worklet 2.1.1 (MPL-2.0, `public/audio/SOUNDTOUCH-LICENSE`; source: https://github.com/cutterbl/SoundTouchJS). `node scripts/check-perform-audio.mjs` verifies actual DSP pitch output at altered tempo, and `node scripts/check-performance-metadata.mjs` checks USB restore and concurrent edits.

The DJ view places two scrolling mixing waveforms above the decks, with a common musical zoom, fixed playheads, source bar/beat lines and cue markers. Click a lane to seek, or use Left/Right for beat jumps. The small deck waveform is an overview; expand **Analyze / edit beat grid** for detailed preparation zoom and panning.

The performance workspace uses a fixed viewport split: the track library grows upward as its divider moves upward, while the upper deck pane shrinks. Mixing waveforms and the footer stay visible; individual deck/mixer panels scroll inside the available space. The resize range adapts to the window. RGB waveforms use analyzed low/mid/high frequency peaks, cached beside the Mac library with source-file size/mtime validation. Explicit Analyze regenerates analysis. Every 4/4 bar has a numbered downbeat line; close zoom labels individual beats, and the preparation grid can be nudged ±10 ms.

Manual waveform dragging uses pointer capture and coalesces position changes to animation frames. It bypasses launch quantization, preserves paused/playing state, and crossfades between source positions through a persistent pitch processor. This is seek scrubbing, not vinyl scratch emulation. CUE/Stop gate the channel output so buffered DSP or echo cannot continue after stopping.

Each deck has a direct **Analyze** button. The cue bank's **SET / PLAY** toggle lets a single pad click place/replace a cue or launch it. **Fill** populates empty A–H pads at regular phrase intervals snapped to the source grid, preserving existing cues; these are starting points to refine by ear, not detected musical drops. Shift-click clears a pad. All preparation edits save to local/USB metadata as described above.

### DDJ-FLX10 controller and headphone cue

In the Mac app, open **Perform**, enable audio, then expand **Controller & audio**.
Connect/power the FLX10 over USB and choose **Connect FLX10 MIDI**. Set its channel input selectors to the connected USB A/B port. The MIDI profile uses Pioneer DJ's [DDJ-FLX10 MIDI Message List E1](https://www.pioneerdj.com/-/media/pioneerdj/software-info/controller/ddj-flx10/ddj-flx10_midi_message_list_e1.pdf): play/pause, held transport cue, shifted set cue, hot cues A–H (shift deletes), tempo ±16%, sync/master/key controls, trim/EQ/filter, channel faders, crossfader/assign switches, loop in/out/exit/size, beat jump, jog seek, browser/load, channel/master headphone cue, headphones mix/level, and master level. Supported play/cue/sync/loop/pad LEDs follow software state. Only FLX10-named ports are selected; unplugging releases held cue previews. Ports reconnect while MIDI access remains enabled.

Select the native audio device and distinct **Master** and **Headphones** stereo channel pairs, then **Enable separate outputs**. The app enumerates the actual macOS output channel count and rejects stereo-only or overlapping routes. The expected master/phones mapping must be confirmed on connected hardware. Channel **CUE** is a pre-fader tap after trim/EQ/filter/echo, independent of channel level, crossfade, master volume and mute/solo. Headphones Cue/Master mix and level are independent; enable **Master cue** to include master in the phones mix. No cue audio is sent to the default stereo speakers. Output changes stop playback; native device loss stops playback and requires routing to be enabled again. Default stereo playback must be restored explicitly.

The bundled macOS helper uses AVAudioEngine/CoreAudio to render four discrete channels from an AudioWorklet through a bounded C atomic PCM ring; unused physical channels are zeroed. No kernel extension, system audio capture or separate driver is installed. Build it with `node scripts/build-native-audio.mjs` (Xcode command-line tools required); desktop packaging does this automatically. The helper is generated, not checked into Git.

This is an initial controller implementation, not Rekordbox feature/latency parity. Vinyl scratching, FLX10 jog-screen HID, stems, hardware input mixing/recording, full beat FX, Ableton Link and network sync are not implemented. Browser-to-native scheduling/underruns must be checked with the real device before performance use. MIDI packets, pre-fader cue gating, four-channel packet order and native ring routing have automated checks; physical FLX10 MIDI/phones verification is still pending until the controller is connected.

Checks: `node scripts/check-flx10.mjs`, `node scripts/check-output-worklet.mjs`, `node scripts/check-perform.mjs`, and `clang -O2 scripts/check-native-audio.c desktop/audio/ring.c -o work/native-audio/check && work/native-audio/check`.

Waveform rendering uses source-aligned, bounded raster tile caches: RGB colors and peak shapes remain attached to the same audio as the viewport moves. Mixing waveforms, beat/bar grids and cue labels share a display-rate animation loop tied to the audio clock; canvas backing stores follow the measured size and device pixel ratio. Detailed views also animate their playhead/follow pan independently from React's slower metadata refresh. `node scripts/check-waveform-render.mjs` checks fixed-tile reuse without repeated PCM reads, fractional scrolling and color/bounds behavior.
