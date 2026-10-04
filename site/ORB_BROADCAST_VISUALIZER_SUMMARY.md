# Orb Broadcast + Visualizer Summary

Date: 2026-04-28

This document summarizes the assistant orb, broadcast, local-audio, music-screensaver, Star Map visualizer, cache-control, and built-in hold-music work completed in this iteration.

## 1. Broadcast Override Architecture

The desktop orb and the MasterBot/voice-broadcast path are now linked through shared live broadcast state.

Implemented behavior:

- `masterbroadcast.py` can publish a direct media-file broadcast state while it is playing.
- `sol_chat_api.py` exposes the active broadcast state through:
  - `/api/chat/broadcast`
  - `/api/chat/broadcast/audio`
- the orb polls that state and treats an active broadcast as the dominant playback lane
- users joining after the broadcast starts should enter the audio in-progress rather than waiting for a restart
- active broadcast playback suppresses competing orb narration and public push speech
- on the site, the broadcast path also overrides the normal screensaver narration lane

Operational consequence:

- the orb is no longer only a local narrator; it can become a synchronized listener surface for live outbound media fanout

## 2. Orb Audio Modes

The orb now has four distinct audio modes plus a generic embedded-page media lane:

1. normal chat/read-aloud speech via `/api/chat/speak`
2. live broadcast override
3. user-supplied local audio
4. built-in orb music playlist
5. mirrored same-site page audio from embedded program/document windows

Mode precedence:

- broadcast override wins over everything else while active
- local audio remains armed but dormant while broadcast is active
- normal speech/narration is suspended while broadcast or local music mode is driving the orb audio element
- same-site page media is not a user-facing transport button; it exists so the orb can react to embedded site pages through the same media/analyser path used by local file playback
- screensaver immersion narration is conservative:
  - it may speak when the orb is otherwise quiet
  - it does not queue over an already-active non-speech media lane such as broadcast audio, local music/hold playback, or mirrored same-site page audio
- the same rule also applies to other autonomous orb narration paths such as public-push speech:
  - if site audio is already playing, the orb should not begin a second competing automatic narration lane
  - explicitly user-invoked playback remains separate from that rule

## 3. User Audio Upload + Drag-and-Drop

The site now allows the user to drive the orb with their own audio.

Implemented behavior:

- hidden file input for supported audio formats
- explicit `Choose File` action
- drag-and-drop directly onto the orb
- mobile file acceptance improved by using explicit audio extensions and looser filename-based validation when MIME metadata is unreliable
- local audio uses the orb's own audio element and existing visualizer plumbing

Supported UX outcome:

- a user can load local music or ambient audio into the orb without going through chat narration or broadcast machinery

Why this matters for embedded site pages:

- the `Choose File` path is the reference implementation for “orb reacts like normal”
- embedded site pages therefore mirror their playback into a muted hidden assistant media element instead of relying only on a CSS speaking class or a synthetic amplitude fallback
- this keeps the orb response closer to the same analyzer-driven behavior the local file path already uses

## 3A. Generic Same-Site Page Audio Bridge

Current shell behavior:

- `index.html` scans visible same-origin iframe windows in z-order for active `audio` or `video` elements
- minimized same-origin iframe windows remain eligible if the window is minimized rather than closed
- when it finds one, it mirrors the media URL, current time, playback rate, and pause state into the hidden orb page-audio element
- that hidden page-audio element is muted at the media-gain level so the user does not hear a doubled copy, while the analyzer still sees the waveform
- the shell still accepts optional page-published bridge state:
  - `window.__solPageAudioBridge`
  - `postMessage({ type: 'sol-page-audio-level', ... })`
  - `postMessage({ type: 'sol-page-audio-stop' })`
- the featured red/blue page also continues publishing its legacy `__solFeaturedRedblueBridge` and `sol-featured-redblue-*` messages for backward compatibility

Operational consequence:

- any same-site embedded page that uses normal HTML media playback now feeds the orb by default without needing a page-specific integration
- embedded page playback is orb-reactive only; it does not activate the screen-wide field or cinematic overlay unless music-screensaver mode was explicitly entered
- pages that synthesize audio or need finer timing/level control can still publish the generic bridge explicitly
- minimizing a site window should not break orb reactivity if that iframe is still alive and playing media

## 3B. Preferred Web Narration Pipeline

For narrated site pages, the preferred path is now:

1. generate with the local Chatterbox-backed `11speak.py`
2. cache the narration as a static asset in `www/audio/`
3. normalize/re-encode the cached stream once if it came from concatenated chunk output and will be used for browser seeking or script sync
4. derive reveal timing from the cached playback asset itself:
   - pause/silence aligned map when possible
   - transcription/alignment assistance when needed
   - avoid using raw generation telemetry as if it were spoken-duration timing
5. let the orb mirror the embedded page media through the generic page-audio lane

## 4. Music Screensaver Mode

When local audio or the built-in orb music is playing, the desktop enters a music-screensaver mode.

Implemented behavior:

- the orb becomes the moving interaction point
- the screensaver field becomes audio-reactive
- orb clicks/taps control playback during that mode rather than behaving like ordinary bubble focus
- once icons have disintegrated into particles, they remain particles until:
  - music stops
  - or the user successfully taps the moving orb and interrupts playback

This closed several previous reassembly paths that caused icons to reform when the pointer or finger stopped moving.

## 5. Star Map Visualizer Integration

The maximized Star Map is now intended to merge into the screensaver rather than appear as a separate opaque application window.

Implemented behavior:

- `programs/star-map.html` publishes visible rendered star points to the parent shell
- the orb music-screensaver logic can use those points as a gravity field
- when the top visible Star Map is active during music mode, the star field is treated as particulate matter in the same field as the orb
- the Star Map has a dedicated visualizer mode where:
  - normal controls fade away
  - background/chrome become transparent
  - the host window stops filling with opaque Win95 gray
  - the layer becomes click-through so interactions can reach the orb/screensaver beneath

Fallback behavior was also added so the Star Map can infer visualizer state from the parent shell even if the original message bridge misses.

## 6. Star Motion, Lensing, and Blend Goal

The Star Map visualizer work moved through several iterations:

- initial warp/lensing pass was too subtle
- transparency and control-hiding were blocked by the host shell, not only by the Star Map page
- star motion originally read more like a distorted texture than real field matter
- later passes pushed stars toward orbit/advection around the orb and companion perturbations
- the goal became a seamless blend where star-map stars behave as particles inside the same screensaver cosmology

Current intended visual language:

- stars drift and twinkle
- stars bend around orb/perturbation wells
- stars are pulled into accretion-style flow instead of sitting as a static backdrop
- the desktop screensaver and Star Map share one field aesthetic rather than stacking independent effects

## 7. Transparency and Input Fixes

Several fixes were required to make the blend visible and usable:

- removed the unwanted global blur/backdrop behavior
- made the iframe host transparent
- removed gray window fill during Star Map visualizer mode
- removed or faded Star Map chrome during visualizer mode
- made the transparent visualizer host click-through so it stopped swallowing user interaction

Without these fixes the user mainly saw a gray veil or an apparently inert Star Map window.

## 8. Performance Pass

Because the Star Map can render a large number of stars, a first-pass optimization pass was added.

Implemented behavior:

- lowered effective DPR during visualizer mode
- cached static star properties instead of recomputing them every frame
- capped heavy visualizer-mode star count
- skipped trails for very small stars
- skipped expensive halo work for stars too small to justify it
- reduced frequency of star-point reposts back to the shell

This was framed as a practical frame-time cut, not a redesign.

## 9. Cache-Control Hardening

To stop stale client-side HTML/JS from masking changes, cache behavior was tightened in the serving stack.

Implemented behavior:

- `Caddyfile.pkd_share` now marks key HTML surfaces `Cache-Control: no-store`
- `sol37_gui_share_server.py` also emits `Cache-Control: no-store` for generated GUI HTML
- the visualizer asset version was bumped so script URLs changed
- services were reloaded/restarted so the live stack served the new headers

Reason:

- multiple visualizer/debugging issues appeared invisible until caching was ruled out

## 10. Documentation Updates

The following documentation was updated during this work:

- `README.md`
- `SCREENSAVER_README.md`
- `ORB_HOLD_NARRATION_SCRIPT.md`
- external/import notes under `/home/david/notes/imports/`
- later follow-up docs also covered the featured root red/blue page and its narration/orb tie-in

Those updates now describe:

- broadcast override routes and behavior
- orb local audio upload/drag-drop
- music-screensaver mode
- Star Map transparent visualizer-host behavior
- the built-in orb music playlist
- the baked hold-system narration script

## 11. Built-In Hold Music Program

The orb now has a built-in ambient music mode launched by `Play Music`.

Source:

- Cisco Default Hold Music / Opus Number 1

Implemented behavior:

- `Play Music` launches the built-in playlist
- `Choose File` still opens the user file picker instead of being overloaded
- the built-in music is not a single loop; it is a rotating three-track playlist
- each track is a full pass of the same hold-music bed with different commentary overlays
- the orb auto-advances A -> B -> C -> A indefinitely

## 12. Hold-System Narration Design

The built-in playlist was rewritten into a staged self-aware hold-system voice.

Structure:

- Track A: sparse, dry, mildly self-aware
- Track B: more frequent and more sardonic
- Track C: dense, escalating, openly self-aware by the final act

The transcript is documented separately in `ORB_HOLD_NARRATION_SCRIPT.md`.

The narration includes:

- commentary on the music itself
- commentary on current server state
- commentary on broadcast override presence
- commentary framing the system like a self-aware phone hold environment

## 13. Audio-Mix Improvements

The built-in playlist audio assets were later remixed to improve intelligibility.

Implemented behavior:

- narration volume raised modestly
- music bed reduced under narration using sidechain compression
- narration clips now use fade-ins and fade-outs
- transitions were smoothed so inserts feel more intentional and less abrupt
- full-length runtime was preserved after correcting an early shortened render pass

This means the built-in playlist now behaves more like an authored ambient audio program than a raw overlay stack.

## 14. Generated Assets

Important generated/served audio assets now include:

- `audio/assistant-default-hold-source.mp3`
- `audio/assistant-default-hold-loop-a.mp3`
- `audio/assistant-default-hold-loop-b.mp3`
- `audio/assistant-default-hold-loop-c.mp3`

Historically during this work there were also earlier single-file loop variants and polished screenplay-render assets used for broadcast tests.

## 15. Current State Summary

At the end of this iteration, the intended system behavior is:

- the orb can speak, broadcast, play user audio, or run its built-in hold playlist
- the orb can also mirror the featured root narration lane from `featured-redblue.html`
- music playback can unfold the desktop into an audio-reactive screensaver field
- disintegrated icons persist as particles during music mode
- the maximized Star Map can become a transparent particulate layer inside the same field
- broadcast override can temporarily seize the orb playback lane
- the built-in music mode now rotates through three narrated hold-style acts
- the transcript of that narration is documented

Featured-root follow-up note:

- the root popup is now `featured-redblue.html`, not the earlier Facebook embed surface
- its narration is pre-generated with `$11speak` and cached as `www/audio/featured-redblue-narration.mp3`
- the root social preview image at `www/assets/sol37-og-gui-share.png` is regenerated by `bin/build_sol37_share_cards.py` from the current `ROOT_FEATURED_POST` opened as a maximized `/gui` window with the assistant closed; the builder also publishes a content-hashed preview image and updates the root `og:url` version to avoid stale social-card caches
- the shell keeps both:
  - a same-origin playback-state bridge from the iframe
  - and a muted hidden assistant media element used as the orb’s featured-page mirror lane

## 16. Remaining Reality Check

Not every visual pass in this sequence was fully browser-validated end-to-end in the terminal environment.

Known caveat:

- several changes were verified by syntax checks, asset rendering, service behavior, or screenshots rather than by a full interactive browser QA pass after every patch

So this summary should be read as:

- a summary of implemented behavior and intended integration points
- plus a record of the debugging steps required to get the Star Map/screensaver blend close to the desired direction
