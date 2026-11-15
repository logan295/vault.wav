# Ten more wonky visuals · no logo

This is a second, separate collection appended to the existing fifteen. The original IDs, shader indices 0–14, files and first download pack are preserved. The ten new scenes occupy indices 15–24 and are available under **Live console → Visuals → Collection → Ketamind · Unbranded 10**. `/ketamind-2` auditions only these ten; `/ketamind` shows all twenty-five.

Every new frame is procedural geometry: no logo, wordmark, artist name, typography, watermark or image overlay appears in the art. The offline `public/ketamind-2/wonky-10.html` player starts in clean mode with only the canvas visible. H reveals/hides controls, Space pauses, and left/right changes the visual. Control labels and the contact sheet captions sit outside the art.

| Visual | Beat lane |
| --- | --- |
| Taffy Cyclotron | Quarter-note stretch; triplet candy braids. |
| Manta Melt | Offbeat wing thrust; half-time tail snap; drop expansion. |
| Frogspawn Machine | Triplet egg contractions; quarter-note nucleus growth. |
| Prism Gremlin | Snare origami flips; eighth-note facet rotation. |
| Neon Bone Orchard | Half-time branch growth; quarter-note joint pulses. |
| Accordion Abyss | Eighth-note corridor folds; drop throat expansion. |
| Slink Contraption | Sixteenth-note spring waves; quarter-note squash. |
| Molten Marbles | Quarter-note sphere collisions; snare split highlights. |
| Wobble Pudding | Four-beat jelly rotation; kick squash; snare ripples. |
| Elastic Imp | Half-time grin; quarter-note cheeks; triplet horn twitch. |

The rhythm envelope and source clock are unchanged from the first set. Artwork follows the existing song grid, seek/pause behavior, analyzed onsets and detected drops. Kick/snare names refer to rhythmic lanes, not a new drum-stem classifier. No specific audio files were supplied for this request; these are assignments to the playing song's beat rather than fabricated song pairings. See `ketamind-wonky-15.md` for shared transport behavior and live-input limits.

Deliverables include the self-contained logo-free player, ten rendered PNG stills, pairing CSV/JSON and a downloadable audition ZIP. These are live WebGL visuals, not MP4 loops. No external fonts, media, libraries or network access are needed by the offline player.

Regenerate the second player and pairings with `node scripts/export-ketamind.mjs --more`. `node scripts/check-ketamind.mjs` verifies all 25 registrations/assets, both collections' metadata, clean mode and the shared timing envelopes. The first collection is regenerated only when that command is run without `--more`.

Validation: TypeScript, targeted ESLint, shared timing/asset tests, live-sync tests, song-program tests and production build passed. All ten new branches rendered without shader errors. Ten distinct clean PNGs were captured from the portable player. The original `public/ketamind` assets and first ZIP remain byte-for-byte unchanged. The existing playlists tracing build warning remains. Live DJ hardware was not retested for this addition.

The production collection filter showed exactly ten new items over two console pages. Selecting Taffy Cyclotron and Elastic Imp worked, and Elastic Imp appeared on the detached stage's main, side and diamond screens. The dedicated gallery opened on Taffy Cyclotron with only the ten new cards. The offline player was left playing in clean mode. Preview remains on port 3157 because 3147 is occupied by another project. This addition is committed locally and has not been pushed to GitHub.
