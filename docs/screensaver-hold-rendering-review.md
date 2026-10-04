# Screensaver and baked hold-narration rendering review

Reviewed 2026-10-03, America/Chicago. This is an evidence-based review, not a record of a deployed repair. No production renderer, narration MP3, or cue manifest was changed during this review.

## Original behavior to preserve

The original desktop field is a two-dimensional canvas simulation. The orb contains the resting field; holding the pointer unfolds it across the desktop. Pointer and orb form a binary gravity system. Icons drift, shrink, blur, disintegrate into particles, and orbit in an accretion band. When the temporary interaction ends, particles return and rebuild the icons.

The April 28 music extension made the orb a moving playback target. Dissolved icons should remain particles while music plays, and tapping the moving orb interrupts playback. The top active Star Map can become transparent, hide its controls, pass input through, and contribute stars to the same field. An early requirement for maximization was subsequently relaxed; it should not be reintroduced from an older description.

On May 10, David explicitly requested that **vacuuming all icons automatically initiate the full screensaver with music and baked narration**, and that it remain latched until dismissed. The manual star button uses the same path. This automatic behavior is part of the intended design, not merely an optional manual music visualizer. Browser autoplay refusal must remain an explicit pending-audio state rather than silently canceling the visuals.

The authored hold program is Cisco/Opus Number 1 with baked SOL-GPT commentary, rotating A → B → C → A. A is sparse/dry, B sharper, C increasingly self-aware. Live-generated commentary is a separate lane. The “Mute Screensaver Voice” control addresses that generated speech lane, not removal of narration already mixed into a hold MP3.

## Rendering change log

Dates below use local Chicago dates. Historical execution records establish the dated changes; file modification times alone do not establish a deployment date.

| Date / evidence | Change | Verification or limitation |
| --- | --- | --- |
| April 26 Git checkpoint `e1f6cb5` | Multiversal canvas, held-pointer binary field, icon disintegration/reassembly and immersion events already exist. | Recoverable historical source; compared directly with current renderer. |
| April 28 session | Local audio music mode; moving orb transport; Star Map point bridge, transparency, chrome removal, click-through input and accretion motion. | Session records contain successive corrections; several contemporary checks were syntax-only. |
| April 28 session | Block both idle-triggered and weak-gravity-triggered icon return while music plays. | Intended persistence is explicitly recorded. Current implementation has divergent hold conditions. |
| April 28, about 22:34–22:37 | Initial narrated hold loop becomes three complete 11:07 acts, with 3 / 6 / 9 authored cues. | Historical transcript and render commands preserved. |
| April 28, about 22:45–22:51 | Narration emphasis, fade-ins/outs, music ducking, limiter; padding and final trimming preserve the full track after a shortened-render problem. | Final FFmpeg command uses raw `assistant-default-hold-source.mp3`, sidechain compression, and a 667.08898-second trim. Current encoded masters probe at 667.115102 seconds. |
| May 10 | Add forced latch, manual star button, automatic icon-vacuum hold-playlist bootstrap, and retry after autoplay refusal. | User explicitly requested automatic music and baked narration after icon vacuum. |
| May 10 | Add editable track-relative cue timeline and full Settings transcript, plus separate generated-commentary placeholders. | Timeline exports JSON; editing it does not retime an existing MP3. |
| May 10 | Add two early lines per act, expanding 3/6/9 cues to 5/8/11. First remix truncated the track; the follow-up preserved 11:07. | Session reports rebuilt MP3s but explicitly lacks a full audible validation. |
| May 10 | User reports Track A's new “Please remain…” line before “Thank you…”. A temporary 1:35/2:35 retime was then reverted at the user's request to 1:08/2:18. | Code/manifest agreement was verified then; actual audible onset was not established. |
| May 17 | Builder gains explicit per-cue voice support. | Historical patch to `build_assistant_hold_tracks.py`; this does not alone prove a render happened that day. The explicit `early` default is evidenced by the June 18 inspection, not this patch. |
| May 27 file timestamps; known by June 18 | Expanded Early-voice public renders existed. | Preserved in `.pre-solgpt-restore-20260618-1738`; exact May 27 render execution was not recovered in this review. |
| June 18 | At David's request, restore original SOL-GPT recordings by copying `.hold-build` A/B/C masters over the public files; change cache version to `20260618-solgpt`; set future builder default to `sol-gpt`. | June session records the restoration. Today all three public-tree files still match `.hold-build` byte for byte. |
| April checkpoint → current renderer, whose mtime is June 21 | Multiple media inputs, per-media mute, external amplitude/bands, transparent canvases, calmer resting direction/motion, and pointer-default suppression added. | Verified source difference; not all individual edit dates recovered. Current sustained-field audio branch is restricted to touch/coarse-pointer devices. |
| October 3 review | Reproduced activation mismatch and stranded-icon state; recovered hold-render chronology and cue mismatch. | Controlled Chromium tests and local media inspection below. |

## Hold narration: original mix versus the retained cue manifest

These are **scheduled original render offsets** recovered from the final April FFmpeg command, not fresh speech-recognition alignments. The restored MP3s match the preserved April masters. The current JSON still carries the expanded May script and timings, despite identifying the audio as the restored SOL-GPT pass.

| Track | Original mix cues | Current manifest cues | Original opening | Manifest opening |
| --- | ---: | ---: | --- | --- |
| A | 3 | 5 | 1:25 — “Thank you for continuing to hold…” | 0:14 |
| B | 6 | 8 | 1:05 — “Thank you for holding. The system appreciates your patience…” | 0:12 |
| C | 9 | 11 | 0:35 — “Thank you for holding. This call is not being monitored…” | 0:10 |

Original A: **1:25, 4:45, 8:40**.

Original B: **1:05, 2:55, 4:35, 6:15, 7:50, 9:25**.

Original C: **0:35, 2:00, 3:15, 4:25, 5:35, 6:45, 7:55, 9:05, 10:10**.

The six May additions were “Please remain where you are in the song…”, “A brief reassurance…”, “This portion…managed waiting…”, “If the melody has become familiar…”, “You are now inside the efficient part of the loop…”, and “The music continues to suggest…”. Restoring the earlier complete recordings also rolled back that expanded audio content; leaving the expanded transcript in place did not restore those inserts.

The original machine-state lines are historical baked narration. They are not current CPU, RAM, disk, or service measurements.

## Confirmed defects and remaining limits

1. **Shell latch and canvas activation disagree.** `setAssistantMusicScreensaver()` honors forced activation without audio. The canvas requires active audio plus a coarse/touch pointer for its sustained audio drive. In an isolated browser harness using the live-served renderer, silent latch opacity stayed at 0 on both desktop and touch contexts. With injected active audio levels, desktop remained 0 while touch reached 0.96. Holding the pointer reached about 0.96; releasing it with a silent latch reduced opacity to about 0.000042. This reproduces a renderer state mismatch, not a full physical-iPhone playback test.

2. **Particle-budget eviction strands icons.** `spawnIconDisintegration()` removes particles above 520 without clearing the evicted icons' disintegrated state. `resetDesktopGravity()` skips those icons. In a stress fixture with 40 colocated icons, all 40 dissolved; after release and 700 frames, 16 still had `pointer-events:none` while field opacity was effectively zero. This is consistent with faded icons remaining over the teal desktop, although the screenshots alone do not establish the exact trigger sequence.

3. **Narration reference and rendered audio are different revisions.** The Settings view consumes the JSON manifest, but hold playback consumes the already mixed MP3. Their opening times and cue counts differ as above. The timeline editor cannot repair the audio merely by changing displayed timestamps.

4. **The current builder does not reproduce the preserved master recipe.** It takes `assistant-default-hold-loop.mp3` as its bed (the historically narrated single-loop asset), adds every manifest cue, applies speech EQ/loudness/gain and a limiter, and writes 96-kbit MP3. It does not contain the original sidechain ducking or clip fades. Running it could stack narration over an already narrated base. Do not treat a successful builder exit as restoration of the original mix.

No full 33-minute A/B/C listening cycle, fresh transcription alignment, or physical Safari test was completed in this review. Repairs should preserve the recovered original behavior and explicitly reconcile the later expanded script with the requested original voice.

## Repair prepared after the review

The renderer now uses the shell's `music-screensaver` state to sustain the full field on desktop and touch, including while autoplay is blocked. Audio energy still changes the animation; it is no longer required to honor the latch. Ordinary embedded audio does not activate the full field.

Particle allocation shares the 520-particle budget across icons. Reassembly also releases any icon whose particles were evicted, and destroying the renderer restores every icon's styles and input.

The cue manifest and transcript now describe the restored 3/6/9-cue masters using the original scheduled mix offsets. The six May additions remain archived in the script document. No audio was regenerated, no voice was replaced, and these offsets are not represented as newly measured speech onsets. The separate builder defect remains outside this frontend repair; do not rerender with the old builder.

Regression coverage executes the real renderer with controlled frames: silent latch on desktop and coarse-pointer contexts, audio-only nonactivation, 40-icon and 540-icon dissolve/hold/recovery, and renderer teardown. The original renderer fails the silent-latch assertion. Production deployment status must be verified separately from these source changes.

The shell retry guard now accepts its own pending hold track after autoplay rejection and preserves the pending-audio status instead of claiming that music is playing. Browser testing with deliberate NotAllowedError rejection confirmed the full field remains near 0.96 opacity and a later interaction increases play attempts from one to two. This is a controlled Chromium test, not physical iPhone audio verification.

Pre-repair runtime backup: `20261004T030549Z`, 5,168 items, `missing_sources: []`. Root storage exhausted again after a verified 19 MB tooling-cache offload, so production writes must wait for stable headroom. Resolved-byte backups remain required at deployment.

## October 3 follow-up: iPhone reports visuals without sound

After the visual repair deployed, the user reported silent iPhone playback. The April 28 session's original `playAssistantBuiltInAudio` patch already awaited audio unlock before invoking `play()`. The imported pre-repair source retained this ordering. May 10 added pending autoplay retry, but it assumed startup would reject rather than remain waiting on a suspended audio context. The same-origin site-audio helper had subsequently adopted concurrent unlock/play while the built-in hold path retained the older order.

The previous GitHub homepage (commit `a193e40`) redirected to `https://sol.system42.one/gui`; the preserved `sol37/index.html` and static Star Map did not contain the orb hold-player implementation. Therefore playback reached through that redirect must not be attributed to an independently hosted static audio engine. The repository history available before May ends with March commits; April runtime source was reconstructed from the April 28 session, not invented as a GitHub commit.

The follow-up repair calls audio-context resume and media play synchronously before awaiting either, uses a bounded startup wait, leaves a visible Tap for sound control while pending, and makes pending orb taps retry rather than dismiss. A playback audio-session hint is applied where supported. Original audio remains untouched. Desktop/touch renderer behavior and Star Map integration are retained.

Verification includes an unresolved-unlock regression and a browser policy simulation requiring play within the click handler. Both button and orb retries produced a running context, advancing original media, and nonzero analyser samples. This is decoded-audio evidence, not confirmation of physical iPhone speaker output.

Reference: WebKit's documented media gesture policy, https://webkit.org/blog/6784/new-video-policies-for-ios/ . Local source excerpts: `/mnt/sol-data/sol-stack/screensaver-audit/april-audio-source-excerpts.txt`.
