# Connect rekordbox / FLX10 live, step by step

Complete [README steps 1–3](../README.md) first: download the project, install Node 24, and run `npm ci`.

This connects **timing and track metadata** to vault.wav's browser visuals. Rekordbox continues to play the audio through your usual FLX10/interface output. Vault does not send transport or MIDI commands to rekordbox, capture microphone audio, or control physical lighting/laser fixtures.

## What you need

- A Mac running this checkout and a current WebGL-capable browser.
- rekordbox and an FLX10 connected/configured for normal DJ playback. The recorded hardware check used rekordbox 7 and an FLX10; other combinations need their own validation.
- [TimecodeLink](https://timecodelink.com/tutorial/rekordbox), installed and licensed/configured as its vendor requires.
- **All three applications on the same Mac:** rekordbox, TimecodeLink, and vault.wav.
- Optional: a monitor/projector attached to the Mac for the detached stage, and an indexed copy of the playing song for analyzed song cues.

TimecodeLink and rekordbox are separate software, not included in this repository. Follow the vendor's current compatibility and installation guidance. A USB audio cable alone does not send rekordbox's timing to Vault.

## 1. Get ordinary DJ playback working

1. Connect the FLX10 to the Mac by USB and connect your usual speakers/interface.
2. Open rekordbox, confirm it recognizes the controller, and load a test track.
3. Check audio output and playback in rekordbox at a safe volume.

Do this before debugging Vault. Leave transport and audio settings under your control in rekordbox.

## 2. Connect TimecodeLink to rekordbox

1. Open TimecodeLink on the **same Mac**.
2. Follow the [vendor's rekordbox setup tutorial](https://timecodelink.com/tutorial/rekordbox) for your installed version. Complete any first-time integration setup it requires.
3. Confirm TimecodeLink's rekordbox connection is active and it can see the loaded deck/track.

Do not assume another contributor's Mac configuration comes with the GitHub download. A rekordbox update may require repeating the vendor's setup. Stop here if TimecodeLink itself has no signal from rekordbox.

## 3. Enable TCNet output

In TimecodeLink:

1. Enable **Master Outputs → TCNet (master)**.
2. Select the Mac's **currently active network interface**. Use the interface shown for your current connection, not an IP address copied from someone else's setup.
3. Leave other output protocols off unless you need them for another application.

The receiver accepts packets only from this Mac's own interface addresses or loopback. TimecodeLink on a second computer is not supported by this implementation. If you change networks/interfaces, restart the Vault app/receiver so it refreshes its allowed local addresses. Do not disable your firewall or expose ports to the internet as a troubleshooting shortcut.

## 4. Start the app and receiver together

If Vault is already running with the README command, keep that instance. Otherwise, from the repository root:

```bash
npm run dev -- --webpack --hostname 127.0.0.1 --port 3147
```

Leave that Terminal open. Expect the app to become ready on port **3147** and this receiver message:

```text
vault.wav live receiver: 127.0.0.1:3148 • TCNet UDP 60000/60001/65024
```

There is only one receiver per Mac. Do not run `npm run live:bridge` alongside `npm run dev` or `npm run start`. The standalone bridge command is for contributors who deliberately start the web process separately.

For a prebuilt show, stop dev first, run `npm run build`, then:

```bash
npm run start -- --hostname 127.0.0.1 --port 3147
```

## 5. Select the live input

1. Open **[http://127.0.0.1:3147](http://127.0.0.1:3147)**.
2. Select **Laser**.
3. Set **Input → Rekordbox / FLX10**.
4. Set **Follow → Auto (master / playing)**, or choose a specific deck.
5. Play/pause your test track in rekordbox. Confirm Vault shows the correct **deck, title, BPM, playback state, and changing elapsed time**.

Entering this mode pauses local Vault playback. Play, pause, and seek in rekordbox rather than the Vault transport.

Auto prefers a **playing master**. If the master is paused, it can follow another playing deck, preferring the strongest reported on-air value. Choose a specific deck when you want deterministic manual following.

## 6. Put visuals on the output screen

1. Click **Open stage in new tab** in the Laser view.
2. Keep the original tab open as the operator console.
3. Move the new stage tab/window to the monitor or projector connected to this Mac. Use the browser's fullscreen controls if desired.
4. Make a simple visual or lighting change in the controller and confirm it appears on the stage.
5. Click **Return stage here** to close the separate output and restore the inline preview.

The tabs communicate using BroadcastChannel. They must stay in the **same browser/profile and origin**. Use the button to create the stage session; do not open `/stage-display` by itself or send the link to a second device. Allow the requested popup if the browser blocks the stage tab.

## 7. Optional: link a song for analyzed cues

**Live timing only** means the timing connection works, but Vault has not matched the track to its local library. It is not a connection error.

For waveform-based arrangement/drop cues:

1. Connect the drive containing the matching audio and [scan it into the local library](../README.md#5-add-music-and-check-playback).
2. Return to the Laser view. After scanning, switch **Input** to **Vault library**, then back to **Rekordbox / FLX10** so the live input reloads the library list. Play the same song in rekordbox.
3. Vault tries a unique normalized title match, artist match when supplied, and duration difference under two seconds when both durations are known.
4. If it cannot match uniquely, open **Link track for song cues** and select the correct indexed track.
5. Confirm **Song show matched**. Allow analysis to finish before judging the cues.

A manual link belongs to the current deck/track identity and clears when that identity changes. Rekordbox's internal track IDs are not treated as Vault IDs. An unindexed song can follow transmitted timing and beat edges, but live timing alone cannot predict future drops or song structure. Unknown duration is supported; the UI may show no total length and disable seeking.

## Troubleshoot by the status you see

| Symptom/status | Check next |
| --- | --- |
| `Receiver offline` | Check the Terminal for a receiver error. Confirm you used `npm run dev` or `npm run start`, not just `next dev`. Open the receiver diagnostic below. |
| `Waiting for TimecodeLink` | Confirm TimecodeLink sees rekordbox, **TCNet (master)** is enabled, and the selected interface is current. All processes must be on this Mac. |
| `Connected · load a track in rekordbox` | Load a track on the selected deck, or return Follow to Auto. |
| `Signal lost — show held` | Timing is stale or the receiver reported an error. Check TimecodeLink and the Terminal. Restart Vault after an interface/network change. |
| `Live timing only` | Connection works. Index/link the matching song only if you need analyzed cues. |
| Wrong deck followed | Select the deck manually; check which deck is playing/master in rekordbox. |
| `EADDRINUSE` / address already in use | Stop the duplicate Vault/bridge instance you started with Control-C in its Terminal. Do not kill unrelated processes. The receiver's port is fixed at 3148. |
| Stage does not open/update | Use **Open stage in new tab**, allow its popup, and keep the controller in the same browser/profile. A copied URL on another device will not work. |
| Sound missing | Check rekordbox/interface output. TCNet does not transmit audio to Vault. |
| Visuals consistently early/late | Adjust the console timing trim for your display path; test before a performance. |

The show holds when samples are older than 1.5 seconds or the receiver reports an error, and resumes from the latest deck position when signal returns. The receiver publishes at 20 Hz and the renderer interpolates. This is not a measured end-to-end latency guarantee.

## Read-only diagnostics and developer checks

In a second Terminal:

```bash
curl http://127.0.0.1:3148/state
curl http://127.0.0.1:3147/api/local/live-sync
```

With a working source, `packets` should increase between requests, the loaded deck should have metadata and recent `receivedAt`, and `errors` should be empty. HTTP 200 alone does not prove live timing is arriving. These snapshots can include track titles, so review/redact them before posting to an issue.

- UDP **60000, 60001, 65024**: TCNet input. Same-Mac senders only.
- HTTP **127.0.0.1:3148/state**: receiver snapshot; `/events`: SSE stream. Loopback-only, read-only, no CORS.
- `/api/local/live-sync` and `?stream=1`: app proxy, protected by the existing local-host request guard. Keep the app bound to loopback; this is not a public authenticated service.

Offline checks, without rekordbox/FLX10:

```bash
node scripts/check-live-sync.mjs
node scripts/check-show-program.mjs
```

The first checks TCNet decoding, malformed packets, timing/metadata, pitch, deck selection, and matching. The second checks arrangement cues, drop boundaries, rests, continuous motion, and seeks. Neither replaces an end-to-end hardware test.

## Recorded hardware validation

The project's November 5, 2026 test notes report real TimecodeLink packets from rekordbox 7 with an FLX10: loaded titles, positions, BPM, pause/play, master changes, and a newly loaded track. A built app also rendered a detached stage while its controller followed live timing and Vault audio stayed paused.

Those tracks were not in the Vault index and their transmitted duration was zero. Exact analyzed drop matching was therefore **not verified on hardware** in that session. This is a historical result, not a guarantee for a new installation or later code changes. Run the checks and your own rehearsal before relying on a setup live.

Protocol reference: [MIT-licensed TCNetOutput in SuperTimecodeConverter](https://github.com/fiverecords/SuperTimecodeConverter/blob/main/TCNetOutput.h).
