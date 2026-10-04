# Source and deployment status

Verified 2026-10-03 Chicago / 2026-10-04 UTC. This is a dated checkpoint; inspect current PRs, Actions runs and live source hashes before deployment.

| Work | Verified state |
| --- | --- |
| Public-source reconciliation | PR #44 merged as `f3af75a94e5b2dfa8cd5f9d7ef25405cbc2acfb8`; 183 reviewed public files, 54 preserved legacy files, full repository history retained. |
| GitHub Pages | Actions publishing active; merged deployment succeeded. Static desktop/archive and service links verified publicly. |
| Main site after migration | Managed source matched exactly; no live writes, restarts, DNS or proxy changes. |
| Screensaver repair | PR #45 open; renderer, playback retry, cue-reference and regression fixes prepared. Not merged or deployed at this checkpoint. |
| Narration audio | Original SOL-GPT A/B/C masters preserved; no rerender. Cue metadata corrected on the repair branch. |
| Backend publication | Local assessment only: 32 candidate Python modules, 964,457 bytes, syntax parse and initial credential scan passed. No backend import or publication occurred. |
| Main-site deployment blocker | Root filesystem exhausted, including after a verified 19 MB tooling-cache offload. Stable headroom remains necessary before live file replacement. |

## Responsibilities

`site/` is the authority for the reviewed allowlist. Normal changes use a branch, validation, PR, merge and explicit home deployment from a clean merged revision. Pages adapters and generated `_site/` output are not home-server source. Unmanaged private/runtime files remain local. The sync tool does not deploy backend services.

Preserve Git history in both `davidlones.github.io` and any future `davidlones/random` backend work. The old snapshot/force-push procedure is retired. Backend publication needs an explicit reviewed allowlist, traced dynamic/subprocess dependencies, safe configuration templates, offline tests and separate deployment/rollback controls. A clean credential scan is not a privacy review; do not copy active proxy routes, environment files, databases, voice references, model weights, household records or logs.

## Resuming the screensaver repair

1. Inspect PR #45 and its latest checks; do not infer merge or production state from this document.
2. Verify stable free space and the mounted backup volume. The most recent pre-repair runtime snapshot was `20261004T030549Z`, with 5,168 items and no missing sources. Symlink manifests alone do not preserve resolved file contents.
3. Follow the repository README for authorized merge and explicit deployment. Use the drift-aware sync command and resolved-file backups; stop if live hashes diverge from the imported/deployed baseline.
4. Verify the public renderer/cache version, full activation when audio is blocked, retry on interaction, dismissal and complete icon recovery. Confirm the cue manifest and transcript correspond to the actual audio files. Physical iPhone/Safari and full A/B/C listening remain unverified by the controlled Chromium tests.

See [the rendering chronology](screensaver-hold-rendering-review.md) and [the import inventory](live-source-reconciliation.md).

## Resumed validation, October 3 late evening

Root headroom recovered to about 26 GiB before rollout; the earlier full-disk checkpoint above is historical. Pre-deployment runtime snapshot `20261004T042749Z` contains 5,169 items with no missing sources. Resolved deployment targets were checked independently for free space and baseline drift. Original A/B/C audio still matches the preserved masters byte for byte.

The repair now explicitly distinguishes actual icon disintegration from visual hiding/shrinking. The final icon emits one automatic activation event, and the latched field snaps fully on at the next frame. The manual ✦ Easter egg remains in the orb popup. Renderer regression tests cover partial versus complete vacuum, desktop/touch activation, empty desktops, and icon recovery. Record merge and live verification separately after rollout.
