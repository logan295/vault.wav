# vault.wav

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

## Ketamind · Wonky 15

Audition fifteen original, beat-driven visuals at `/ketamind`, or choose **Ketamind · Wonky 15** in the live console's Visuals collection. Each has distinct geometry and a different rhythmic assignment. See [the pairings and offline audition guide](docs/ketamind-wonky-15.md).

The follow-up [Unbranded 10](docs/ketamind-unbranded-10.md) collection adds ten more logo-free scenes at `/ketamind-2`. Its offline player opens with only the visuals visible; the original fifteen remain available.
