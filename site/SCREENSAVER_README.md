# Sol-37 Screensaver + Star Map README

## October 3 verification and repair status

The implementation history below is retained. [PR #45](https://github.com/davidlones/davidlones.github.io/pull/45) prepares repairs for incomplete latch activation, stranded icons after particle eviction, and blocked-audio retry. It was open and not deployed at this checkpoint; root disk exhaustion blocked the main-site update. GitHub Pages publication from PR #44 is a separate completed change.

Preserve the original behavior: held-pointer gravity dissolves icons; releasing an unlatched field reassembles them; vacuuming all icons automatically latches the full music screensaver and A → B → C hold program. A manual latch uses the same path. Audio refusal leaves visuals active with pending-audio status. Ordinary embedded audio drives only the orb. The top active Star Map can join the field without a maximization requirement.

The restored recordings contain 3/6/9 baked cues. Track A's “Thank you for continuing to hold” starts at the historical 1:25 mix offset. See [the narration script](ORB_HOLD_NARRATION_SCRIPT.md) and `data/assistant-hold-loop-timings.json`; offsets are from the original render recipe, not fresh speech-onset measurements. Generated speech is a separate lane, and its mute control does not remove baked voice from a music file. Historical machine-state lines are not current telemetry. No audio was rerendered for this repair.


Date: 2026-06-28

## What This Document Covers

This is the implementation README for the Sol-37 desktop screensaver system and the `programs/star-map.html` application as they currently work together on the site.

It covers:

- the desktop orb and full-screen screensaver field
- the audio-reactive music-screensaver mode
- the StarFinder II star-map application
- the bridge that lets the star map collapse into the screensaver as a transparent field layer
- the data path, runtime messages, and performance tradeoffs behind that effect

Short answer to the architectural question: this is not one giant WebGL background.

Current split:

- the desktop screensaver is a 2D canvas system in `www/assets/hue-visualizer.js`
- the star map is a separate 2D canvas React app in `www/programs/star-map.html`
- the two layers coordinate through same-origin shell state and `postMessage`, not through a shared renderer

That separation is intentional. It keeps the desktop field, the orb, the icons, and the star catalog loosely coupled enough to evolve independently.

## The Core Idea

The screensaver is not an overlay added after the desktop exists. The desktop itself becomes the matter of the scene.

At rest:

- the full cosmology is compressed into the orb
- the orb contains the event horizon, lensing, glow, radiation arcs, and internal star motion

Under interaction or audio:

- the field unfolds outward across the desktop
- the cursor and orb become a temporary binary system
- icons begin to drift, distort, and eventually disintegrate into particles
- those particles feed the same accretion-style field as the stars

When the Star Map is the top visible maximized program during music-screensaver mode, it stops reading as a separate app window and becomes another matter source inside that same field.

## Main Components

Primary files:

- `www/index.html`
- `www/assets/hue-visualizer.js`
- `www/programs/star-map.html`
- `www/dat.json`
- `www/ORB_BROADCAST_VISUALIZER_SUMMARY.md`
- `www/ORB_HOLD_NARRATION_SCRIPT.md`

High-level responsibilities:

- `index.html`
  Owns the desktop shell, orb UI, audio controls, iframe windows, page-audio mirroring, and music-screensaver state.
- `assets/hue-visualizer.js`
  Draws the orb visualizer and the full-screen multiversal field, handles audio analysis, icon gravity, icon particle disintegration, and immersion narration triggers.
- `programs/star-map.html`
  Loads and parses the StarFinder II catalog from `dat.json`, renders the sky to a 2D canvas, exposes star metadata, and publishes sampled visible star points back to the shell.
- `dat.json`
  Carries the original `Stars.dat` text payload through JSON so the browser can fetch and parse it directly.

## Screensaver Architecture

### 1. Orb State

The orb is always alive, even before full screensaver activation.

The orb renderer maintains:

- a dark event horizon core
- a pulsing backlight
- lensing and glare
- radiation arcs
- small internal stars
- pointer-directed flare motion

This is drawn through `createHueVisualizer(...)` in `assets/hue-visualizer.js`.

### 2. Full-Screen Field

When the visualizer runs in `variant: "multiversal"` mode, it creates a second fixed-position full-screen canvas. That canvas becomes the desktop-scale field layer.

That layer handles:

- deep-space background washes
- barycenter glow between orb and cursor
- accretion rings
- perturbation ripples
- click-born temporary horizons
- icon gravity and icon breakup
- particle-star births

The orb canvas stays visible in the foreground while the full-screen field expands behind and around it.

### 3. Audio Drive

The visualizer uses the Web Audio API:

- `AudioContext`
- `AnalyserNode`
- media element sources
- per-lane gain controls

It derives:

- RMS amplitude
- low/mid/high band energy
- smoothed activity values

Those values drive:

- color balance
- glow strength
- field intensity
- orbit/accretion motion
- orb pulse and bloom

Current color logic is intentionally exaggerated:

- low frequencies bias red
- mid frequencies bias green
- high frequencies bias blue

### 4. Icon Matter

Desktop icons are not treated as UI that merely sits above the effect.

In multiversal mode the field can:

- pull icons toward the cursor/orb pair
- scale, blur, and rotate them under gravity
- swallow them past a threshold
- replace them with particles
- orbit those particles in the accretion disk
- reassemble them later when the field quiets down

This is the most important thematic rule in the whole system: the desktop becomes material, not scenery.

## Audio Modes And Screensaver Entry

The orb can be driven by several audio lanes:

- normal speech narration
- live broadcast override
- user-selected local audio
- built-in hold-music playlist
- mirrored same-site page media

Important rule:

- embedded page audio makes the orb reactive by default
- it does not automatically unfold the screen-wide field
- the desktop-scale music-screensaver is an intentional mode

Music-screensaver mode is entered when local audio or built-in orb music is actively driving the orb.

While active:

- `body.music-screensaver` is set by the shell
- the orb becomes the moving interaction point
- the desktop field becomes audio-reactive
- orb clicks/taps become playback control behavior
- icon reassembly is suppressed while music remains active

## Star Map Architecture

### 1. Dataset

The star map fetches `/dat.json` with `cache: "no-cache"` and expects a `Stars` string property containing the original StarFinder II table text.

Current live dataset count:

- `6605` catalog rows parsed from `Stars.dat`

The app parses:

- SAO identifier
- RA / Dec
- proper motion
- magnitude
- B-V color index
- spectral type
- radial velocity
- distance
- trailing name field

Coordinate framing:

- RA is converted from sexagesimal hours to degrees
- Dec is converted from sexagesimal degrees to signed degrees
- the catalog is treated as a J2000 snapshot

### 2. Rendering Model

The star map is a React app that renders to a single 2D canvas.

It is not WebGL and not DOM-per-star.

Per-star static properties are cached after load:

- normalized sky position
- base core size from magnitude
- color from spectral class

Each frame then applies:

- twinkle
- halo glow
- optional drift
- optional lensing/flow displacement in visualizer mode
- optional trail rendering for sufficiently large stars

### 3. App Controls

Normal app mode includes:

- max object size
- magnitude limit
- star count cap
- fuzz intensity
- per-star inspection panel

The loading screen deliberately frames the app as legacy software:

- it explicitly references `Stars.dat`
- it explains the `/dat.json` bridge
- it presents the catalog as a boot-time parse, not as a magical effect

That framing matters. The point is for the app to feel like plausible retro astronomy software before it becomes part of the ambient desktop cosmology.

## Star Map To Screensaver Integration

### 1. Why The Integration Exists

The desired result is not:

- a translucent astronomy app floating over the screensaver

The desired result is:

- the star-map window breaks containment
- its stars become field matter
- its controls recede
- its host becomes transparent
- interaction passes through to the desktop/orb layer underneath

### 2. Activation Conditions

The Star Map enters visualizer mode only when all of these are true:

- the parent shell is in `music-screensaver` mode
- the Star Map window is the top visible relevant window
- the current iframe source is `programs/star-map.html`

When active:

- the shell marks the host as a music visualizer host
- the star-map page hides chrome and controls
- the page background goes transparent
- the shell keeps sending visualizer payload updates

### 3. Message Flow

There are two separate bridges.

From shell to star map:

- `sol-window-activity`
  Tells the child page whether its host window is active enough to keep rendering.
- `sol-star-map-visualizer-mode`
  Carries whether blended mode is active and, when active, the current orb/perturbation field payload.

From star map to shell:

- `sol-star-map-points`
  Sends sampled visible star positions back to the parent shell.

That payload includes:

- sampled normalized point positions
- effective rendered radius
- total visible rendered point count
- frame dimensions
- timestamp

### 4. Shared Visual Language

Once in visualizer mode, the star map uses shell-provided field data:

- orb position
- orbiting perturbation wells
- drift amount
- twinkle boost
- pulse state

The star canvas then bends its stars around those wells and shifts them into advection/orbit behavior.

This makes the stars read less like a pinned astronomical wallpaper and more like matter being disturbed by the same gravity field that is affecting the orb and the desktop icons.

## Performance Strategy

The system is visually dense, but the implementation is conservative.

It avoids a single heavyweight renderer and instead cuts cost in obvious places.

Current optimizations include:

- the star map lowers effective DPR in visualizer mode
- the star map caches per-star static properties after parse
- the star map caps visualizer-mode draw count at `5200` even if the catalog window settings are higher
- trails are skipped for stars too small to justify them
- halo work is skipped when the halo radius is too small
- star-point reposts to the parent are throttled to roughly every `260ms`
- the full-screen visualizer samples only a modest built-in ambient star set for its own idle field
- icon particle counts are capped

This is why the current effect can look elaborate without requiring a full GPU scene graph rewrite.

## Why This Is Not One Shared WebGL Canvas

A single WebGL pass would make some effects easier to unify, but it would also collapse several useful boundaries:

- the orb would stop being a self-contained surface
- the star map would stop being a believable standalone program
- page-level ownership would become harder to reason about
- shell/program decoupling would get worse

The current architecture preserves three important properties:

1. The orb works by itself.
2. The Star Map works by itself.
3. The blended mode is a negotiated state, not a permanent rendering dependency.

That is the right tradeoff for this site.

## Data And Authenticity Notes

What gives the Star Map its credibility is not just the star count.

It is the whole stack of choices:

- original `Stars.dat` terminology remains visible
- J2000 framing remains visible
- catalog rows can be inspected directly
- raw row text is still shown in the detail panel
- the load sequence behaves like a parse, not like a prefab animation

That is why the transition into a surreal desktop screensaver still feels grounded. The fantasy rides on top of a believable retro-software substrate.

## Operator Notes

When working on this system, check these layers in order:

1. `index.html`
   Verify shell state, audio mode precedence, and iframe host behavior.
2. `assets/hue-visualizer.js`
   Verify analyzer wiring, field activation, icon gravity, and multiversal canvas behavior.
3. `programs/star-map.html`
   Verify catalog parse, draw loop, visualizer-mode class toggles, and parent messaging.
4. `dat.json`
   Verify the catalog payload still exposes `Stars` and still parses cleanly.
5. cache headers / asset versions
   Rule out stale HTML or JS before assuming the visual logic is wrong.

If the visualizer appears to fail, common causes are:

- stale cached HTML/JS
- the Star Map not being the top active window
- the shell not being in `music-screensaver` mode
- the transparent host state not being applied
- same-origin message assumptions being broken

## Design Summary

The screensaver and the star map are now parts of one narrative system:

- the orb is the compressed cosmology
- the screensaver is the cosmology unfolded across the desktop
- the star map is the credible scientific instrument that can be absorbed into that same field

The effect works because it does not start as fantasy.

It starts as:

- a plausible old astronomy program
- a plausible desktop shell
- a plausible audio visualizer

Then the site lets those systems contaminate each other until the browser window stops feeling like a window and starts feeling like a viewport.

### Final-icon activation repair (October 3, 2026)

The renderer emits the automatic activation event only after every participating desktop icon has actually disintegrated. Merely hiding or shrinking icons does not activate it. The last icon triggers the same hold-playlist activation path as the manual ✦ control in the SOL orb popup; the full field snaps on at the next rendered frame. Blocked autoplay leaves the field active and retries on interaction. Dismissal restores the icons. Original hold recordings are unchanged.
