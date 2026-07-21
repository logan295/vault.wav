# vault.wav — personal lossless setup

## 1. Supabase (you do this once)
1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) (any region, free tier is fine for dev).
2. Open **SQL Editor** and run these files in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_personal_audio.sql`

   This creates the private audio bucket, the personal WAV library, account setup trigger, and row-level access rules.
3. **Settings → API**: copy *Project URL*, *anon public* key, and *service_role* key.
4. **Storage → Settings**: raise the file size limit. WAVs are large; 500 MB is a practical starting point. Your Supabase plan may impose a lower maximum.
5. **Authentication → Providers**: enable Email.
6. **Authentication → URL Configuration**: add `http://localhost:3000/auth/callback` as a redirect URL for local development. Add the matching production URL when deployed.

## 2. Environment
```bash
cp .env.example .env.local   # then add the three Supabase values from step 1
```

## 3. Run and upload
```bash
npm run dev
```

Open [http://localhost:3000/upload](http://localhost:3000/upload), sign in through the email link, choose a WAV, and play it from the uploaded list.

Large WAVs use resumable 6 MB chunks and upload directly to the private Supabase bucket. The database stores duration, sample rate, bit depth, channel count, and file size. Playback uses a one-hour signed URL and supports normal browser seeking.

## 4. Mac audio output

No third-party “lossless driver” is required for normal playback. Connect your DAC or audio interface, then:

1. Open **Applications → Utilities → Audio MIDI Setup**.
2. Select the output device.
3. Set its format to match the track you are playing, such as **96,000 Hz / 2ch / 24-bit**.
4. Keep vault.wav in **Direct** mode so the app does not insert its Web Audio EQ graph.
5. Keep the app and system volume at unity when your DAC or amplifier controls volume.

The web player decodes the original WAV without converting it to MP3/AAC. macOS and the browser still own the final system mixer, so the app cannot promise exclusive-mode, automatic sample-rate switching, or provably bit-perfect output. Those capabilities require a native macOS audio engine using Core Audio; that is a separate second phase, not a browser driver setting.

## Local USB library — no cloud required

You can use vault.wav without Supabase:

1. Connect one or more USB drives and confirm they appear in Finder.
2. Start vault.wav with `npm run dev`.
3. Open [http://localhost:3000/local-library](http://localhost:3000/local-library).
4. Select any combination of detected drives and choose **Save & scan**.
5. Play indexed WAVs directly from their original USB locations.

The local index is stored in `var/local-library.json` and contains metadata and relative paths only. Audio files are never copied. Local USB endpoints reject non-localhost requests. If a drive is ejected, its tracks remain indexed but become unavailable until it is reconnected.
