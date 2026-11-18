# Mornye metadata integration

Open **Import music links** from the library sidebar, or `/import-links`.
The connector accepts public Spotify track, album and playlist HTTPS URLs.
It resolves metadata, compares title + artist + duration with available local files,
and lets you review the matches before creating a playlist. It never downloads audio
or edits source file tags. Repeated/ambiguous local matches are not selected.
Results are limited to 500 tracks. Name the playlist before saving.

## Install

Python 3.11+ is required. Run `sh scripts/setup-mornye.sh` from the repository.
This pins Mornye 2.1.2 in ignored `var/mornye/.venv`.

**The PyPI package alone does not include Spotify metadata implementations.**
Its optional `utilities.sflx` extension is required. Configure it through your
trusted Mornye provider using the upstream extension manager, with
`MORNYE_DATA_DIR` pointing to this repository's `var/mornye/data`.
See https://github.com/mornyeapp/Mornye-Python for provider setup.
The connector checks for this dependency before enabling lookup. It does not
silently install a registry or enable download providers.

On this machine the Python package is installed, but no utilities extension was
supplied. A real public-link probe failed on that missing dependency. The app
reports that state explicitly; successful Spotify resolution is not yet verified.

`GET /api/local/mornye` reports dependency status. `POST` takes `{ "url": "…" }`.
Only localhost and same-origin browser requests are accepted. The child process
has a 40-second timeout, bounded output, and no shell interpolation.

## Ketamind organization

All 25 visuals retain their indices and clean artwork. The gallery, exported
manifest/CSV and console identify five rhythm families by both text and color:
kick/impact (lime), snare/half-time (coral), triplet/swing (violet), subdivisions
(cyan), and bar/phrase (amber). These describe programmed beat lanes, not detected
isolated drum stems. **Ketamind auto · 25** traverses all 25 scenes every eight bars
using the song beat grid, so seeking reproduces the selection.

Library key badges use Camelot codes with 12 pitch-family colors. Major/minor
remain visible as B/A; missing keys stay neutral. This does not infer energy or
reorder an existing DJ set. Audio files and existing playlists are preserved.

Checks: `node scripts/check-link-import.mjs`, `node scripts/check-ketamind.mjs`,
`node scripts/check-live-sync.mjs`, `node scripts/check-show-program.mjs`, and
`npm run build`.
