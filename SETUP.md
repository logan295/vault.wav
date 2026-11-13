# Additional setup

For the ordered download, install, and first-run instructions, start with [README.md](README.md). The standard local address in these guides is `http://127.0.0.1:3147`.

## Local library: no account or environment file required

1. Complete README steps 1–4 and leave the server running.
2. Connect your USB drive and confirm it appears in Finder.
3. Open [USB source manager](http://127.0.0.1:3147/local-library).
4. Choose **Detect drives**, select the drives, then **Save & scan**.
5. Play a track. Keep its source drive connected.

The scanner reads audio and exported rekordbox metadata without copying or editing the original audio. The local index and playlist files are stored under ignored `var/`. Ejected tracks remain indexed but cannot play until their drive is reconnected.

Mounted-volume discovery defaults to macOS `/Volumes`. Advanced development overrides are `VAULT_WAV_VOLUMES_ROOT`, `VAULT_WAV_INDEX_PATH`, and `VAULT_WAV_PLAYLIST_PATH`. They are optional. If setting a volumes root, it must contain source directories as children, not just loose audio files. Other OS workflows are not validated by this guide.

[Live rekordbox timing](docs/rekordbox-live-sync.md) is also local and does not require Supabase.

## Optional cloud WAV uploads

Only follow this section if you need the `/upload` cloud feature. It is separate from USB playback and live timing. Use a development project you control and review the provider's limits/costs before storing audio.

### 1. Create the database and storage

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. In its SQL Editor, run these repository files **in order** against the new project:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_personal_audio.sql`
3. These migrations create the database tables, private audio bucket, account trigger, and row-level access rules. Do not run them blindly against an existing production database.
4. In Storage settings, set an upload size limit appropriate for your WAVs. Large WAVs may require hundreds of MB per file; your Supabase plan can impose a lower maximum.
5. Enable the Email authentication provider.

### 2. Set the auth URLs

In **Authentication → URL Configuration**, use the exact origin you will open in the browser:

- Local Site URL: `http://127.0.0.1:3147`
- Allowed redirect URL: `http://127.0.0.1:3147/auth/callback`

If you deliberately use `localhost` or another port, add its exact callback URL too. When deploying the cloud feature, configure its HTTPS origin and callback separately. The sign-in code builds the callback from the browser's current origin.

### 3. Create your private environment file

From the repository root:

```bash
cp .env.example .env.local
```

Do not overwrite an existing `.env.local`; edit its values instead. Find the project's URL and API keys in its settings and fill in:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

The service-role key bypasses row-level security. Keep it server-only, never rename it with a `NEXT_PUBLIC_` prefix, and never put it in a screenshot, issue, commit, or browser code. Use the project's legacy anon/service-role API keys for the variable names above. `.env.local` stays ignored by Git; `.env.example` has blank placeholders only.

Restart the server after changing environment values. If using `npm run start`, rebuild first because public environment values are included in the client build.

### 4. Verify upload and sign-in

1. Open [http://127.0.0.1:3147/upload](http://127.0.0.1:3147/upload).
2. Request a sign-in link to your own email and open it in the same browser you used to request it.
3. Choose a small WAV you have permission to upload.
4. Wait for upload completion and try playback from the uploaded list.

Uploads use resumable 6 MB chunks directly to the private Supabase bucket. The database stores the track metadata, and playback uses a one-hour signed URL. Opening `/upload` without valid Supabase configuration is not part of the no-account local workflow.

## Hosting and live connection are different

A hosted website cannot read a USB plugged into your laptop or reach the timing receiver at your laptop's `127.0.0.1`. The current live bridge needs a persistent local Node process and same-Mac TCNet packets. Serverless hosting is not a substitute for it.

For a live show, use the local [build/start commands](README.md#build-and-run-without-development-mode). Keep both browser tabs and the receiver on that Mac. Moving the stage tab to an attached monitor/projector is supported; sending its URL to another device is not a remote-stage workflow.

A deployment of the optional cloud-upload feature needs its own server environment variables, Supabase URLs, and deployment validation. This repository does not provide a verified one-click deployment of the full local/DJ workflow. The `npm run start` command starts the local receiver too, so do not use it unchanged as a generic cloud-hosting recipe.

## Mac audio output

For normal Vault playback, connect your DAC or audio interface, then:

1. Open **Applications → Utilities → Audio MIDI Setup**.
2. Select the output device and set an appropriate sample rate and bit depth, such as 96,000 Hz / 2ch / 24-bit for a matching track.
3. Use **Direct** mode to avoid inserting the app's Web Audio EQ graph.
4. Set volume conservatively before listening. Use your DAC/interface controls as appropriate for your setup.

No third-party “lossless driver” is required for ordinary browser playback. The browser and macOS still control the system mixer. The app cannot promise exclusive-mode output, automatic sample-rate switching, or provably bit-perfect playback.

For live rekordbox mode, configure audio output in **rekordbox**. The TCNet receiver does not capture, route, or play the DJ audio.
