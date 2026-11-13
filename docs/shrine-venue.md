# The Shrine

Select **Stage → The Shrine** in the detached live console, or The Shrine under the inline console's stage setup. This is a photo-guided scene inspired by the supplied venue images, not a surveyed architectural model.

The long hall has a timber floor, vaulted roof ribs, paired two-story balconies, columns, a tall rear video wall, a rectangular stage and DJ booth, line-array speakers, stairs, suspension cables, six cross trusses, and empty floor and balcony areas.

Six crosses carry 36 moving heads and 12 laser projectors. The balcony rails add eight moving heads and 12 projectors; eight more projectors sit at the stage front. Each projector renders 17 instanced rays. The lighting palette, motion range, pattern and speed connect to the live lighting bank. Video clips use the existing Fit/Fill controls on the portrait LED wall. The current LED layout is fixed to the tall rear wall for this venue.

**Quick laser fan** selects Wide fan, Ceiling fan, Vertical fan, or Static fan, applying to the selected Top/Floor/Both bank. Manual fan selections keep the chosen shape while following the song speed, shutters and bank cues; Run song show also restores automatic shape selection. Spread and beam width control the fan's coverage and weight. Fan endpoints intersect the hall bounds instead of bunching along an arbitrary clamped line.

The detached display uses the existing audio-clock snapshots; the music stays in the controller tab. The original Circular arena and its camera distances remain available.

## Rig references, second photo pass

The newer five photos clarify two longitudinal ceiling spines, lower balcony-edge rails, and covered cross platforms suspended well below the roof. The scene now puts the crosses at 7.9 m, with upright, underside and end-mounted moving heads. Narrow beams replace broad wash cones on these fixtures. Lower-rail projectors are classified as the bottom bank; cross projectors remain the top bank.

Added laser looks: Vertical columns, Mirrored ceiling fans, Balcony lattice, Parallel rake, Crossfire canopy. Added lighting looks: Vertical columns, Parallel rake, Horizontal plane, Mirrored fans, Crossfire. Automatic Shrine cues select from the reference laser looks and retain the song's shutter rests and lighting-only sections. Manual pattern choices still override the automatic bank selection.

A front-of-house console sits at the rear of the room. Crowd geometry has been removed from both levels. This remains a scene reconstructed from photographs; rig dimensions and fixture counts are approximations.

Reference checks: manually selected vertical laser/light columns and mirrored fans through the live desk and verified the detached output. Screenshots: /tmp/vault-shrine-reference-columns.png and /tmp/vault-shrine-reference-fans.png. TypeScript, targeted ESLint, and whitespace checks passed.

## Shared song transport and empty venue

Lasers (including manually selected patterns), moving heads, generative screens and VJ videos now derive motion from one integrated per-song phase. Rate changes remain continuous across cue boundaries and reconstruct after arbitrary seeks. Videos authored at 150 BPM follow that source tempo; untagged videos preserve natural speed at rate 1 and follow the song section rate. The video clock corrects drift beyond 140 ms and follows pause/seek. This aligns transport and cue changes; source footage without an authored beat grid cannot guarantee every visible event hits a musical onset.

Song cues use the envelope, bass, treble, track identity and detected drops. Pre-drop boundaries accelerate builds; beat-level boundaries at drops exchange banks and vary rate; low-energy sections retain lighting-only rests. Detected drops remain automatic estimates.

The Shrine has no crowd meshes. Textured plaster, subtle wood relief, geometric balcony grilles, layered cornices/capitals, rig clamps and cable runs add architectural detail. Camera selection includes floor, left/right balcony, rear balcony, stage wing, booth, overhead and audience.

Verification: node scripts/check-show-program.mjs validates exact cue entry, track identity, quiet rests, changing drop speeds, continuous phase and seek reconstruction. Real local playback was tested with a selected fan and VJ clip through a detached display, including seek and pause. Floor, balcony and stage-wing views were inspected in the browser.
