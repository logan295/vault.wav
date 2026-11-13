# Contributing to vault.wav

Start with the numbered [README setup](README.md). You can work on the local library, UI, visual renderer, and protocol checks without Supabase credentials or DJ hardware.

## 1. Make a focused branch

Fork the repository, clone your fork, and add the original as `upstream` as shown in the README. Before a new change, make sure `git status` is clean. Commit your own work or safely set it aside before switching branches.

```bash
git switch main
git fetch upstream
git merge --ff-only upstream/main
git switch -c fix/describe-your-change
npm ci
```

If the fast-forward fails, stop and inspect your branch history. Do not reset or force-push to discard work. Contributors with direct repository access can use `origin/main` instead of `upstream/main`.

## 2. Find the relevant code

- `src/app/`: pages and API routes. `/local-library` manages USB sources; `/stage-display` renders the detached output.
- `src/components/`: playback, library UI, live console, and stage rendering.
- `src/lib/local-audio/`: filesystem scanning, rekordbox USB metadata, playlists, analysis, and song cues.
- `src/lib/live-sync/transport.ts`: live deck selection and local-track matching.
- `scripts/live-sync-bridge.mjs` and `scripts/lib/tcnet.mjs`: the same-Mac TCNet receiver and packet parser.
- `scripts/dev-with-live.mjs`: starts the app and receiver together.
- `src/lib/supabase/`, `src/app/api/tracks/`, and `supabase/migrations/`: optional cloud uploads.
- `docs/`: operating guides. Update these when UI labels, commands, or setup requirements change.
- `public/vj-loops/SOURCES.md`: asset attribution and restrictions.

Read `AGENTS.md` before changes. This repository uses Next.js 16.2.10, React 19, TypeScript, and Tailwind CSS 4. Its installed Next.js guidance is under `node_modules/next/dist/docs/`.

## 3. Keep private and generated files out

Never commit `.env.local`, service-role keys, tokens, user audio, local paths/indexes in `var/`, `node_modules/`, or `.next/`. `.env.example` contains blank placeholders and is safe to track. Use your own development Supabase project rather than someone else's production credentials.

Do not add downloaded media just because it is free to view. Verify redistribution permission, preserve attribution, and update the sources document. Existing notices include restricted-use clips and packs whose redistribution terms need review. No new code license or asset license is granted by this contribution guide.

For dependency changes, keep `package.json` and `package-lock.json` consistent. Do not mix npm, Yarn, pnpm, and Bun lockfiles.

## 4. Run checks

Use Node 24. From the repository root:

```bash
npm run lint
npx --no-install tsc --noEmit --incremental false
node scripts/check-live-sync.mjs
node scripts/check-show-program.mjs
npm run build
git diff --check
```

Stop a running dev/start server before building in the same checkout. `npm run build` does not start the receiver. The protocol tests use synthetic packets; they do not control rekordbox or certify a live performance setup. A `MODULE_TYPELESS_PACKAGE_JSON` warning can accompany the direct TypeScript check scripts; still check their final exit status.

For UI changes, also verify the affected flow in a browser. For live/show changes, cover:

- Controller plus detached stage in the same browser/profile.
- Play, pause, seek, and returning the stage to the controller.
- Manual deck selection, Auto switching, and a paused master with another deck playing.
- Receiver unavailable, lost/stale timing, and recovery.
- An unmatched track (`Live timing only`) and a correctly linked local track, if available.
- Keyboard controls, narrow screens, and blackout/flash behavior when affected.

If you cannot test hardware, say so. List your OS, Node version, browser, and the exact commands that passed or failed. Do not turn historical test notes into a claim that your change was tested.

## 5. Review and submit

```bash
git status --short
git diff
```

Stage only your intended files, commit the change, and push your feature branch to your fork. Open a **draft pull request** into `logan295/vault.wav:main` while it is being reviewed.

Include:

- What changed and why.
- Steps to reproduce or try it.
- Check results and any remaining limits.
- Screenshots for UI changes, with private information removed.
- Any new setup, environment, network, or asset-license requirements.

Avoid unrelated cleanup, generated files, and blanket `git add .` when your checkout contains other work.

## Maintainer check before publishing live-sync setup

A README alone cannot deliver the live features. Publish and review the matching launcher, receiver, API routes, transport logic, UI/components, stage route, check scripts, and documentation together. Confirm referenced assets are present and cleared for distribution, or remove their references before release.

Use a clean clone or ZIP of the proposed branch with no `node_modules`, `.env.local`, or `var/` from a developer machine. Follow the README in order and verify that `npm ci`, the local app, and the receiver work. Check that `.env.example` is included and real environment files remain ignored. Do not call the GitHub download current until the intended commit is actually on the remote branch.
