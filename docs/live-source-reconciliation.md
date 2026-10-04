# Live source reconciliation — 2026-10-03

## Inventory before import

- Repository: `davidlones/davidlones.github.io`, default branch `main`, initial head `5f99f42`.
- Existing tree: 54 files, 62 total tree entries. All 54 files remain unchanged in this PR; history is preserved.
- Live root: `/home/david/random/www`, including resolved SeedRAID file links. Inventory found 1,417 files and more than 12 GB of logical content. Filesystem `du` reports less because links are not file payloads.
- Reviewed import: **183 files, 37,567,954 bytes**. Of these, 148 are new paths relative to the earlier repository, 29 differ, and 6 match. The differing live versions are stored under `site/`; they do not overwrite the older root copies.
- Import hash check: all 183 imported files matched the live bytes immediately after import.

## Publication boundary

The allowlist imports the current desktop, canvas renderer, public static essays/project pages, public frontend program source, selected illustrations/icons, small cue data and the 1.55 MB star catalog. It includes the hold-narration transcript and timing map; large audio masters remain live-hosted.

The import excludes hidden/private directories, browser captures, build outputs, runtime logs and telemetry snapshots, unreviewed generated indexes, downloads, audio/video masters, personal records/forms, household desk source/data, device-control captures, machine-local scripts and model/dataset artifacts. Entries explicitly marked private in the live index were excluded. Linked private filesystem targets and operational credentials are not Git dependencies. Selected existing public code examples contain a masked password or example LAN address; no credential values were imported.

The live site's comprehensive crawler indexes mix multiple home-server roots and cannot safely be copied wholesale. The Pages build generates a new index from reviewed imported files only. Omitted published media and service resources use explicit live-origin URLs; their content is not newly imported into Git.

## Deployment roles

- GitHub Pages: generated static desktop, reviewed archive, static Star Map, local-file visualizer, legacy experiments, and service entry links.
- Sol home server: models, radio, APIs, live chat/speech, authenticated controls, private household interfaces, generated media and large downloads.
- `site/`: Git-managed source for reviewed home-server files after this PR is merged. Import is the exceptional reconciliation path; reviewed Git deployment is the regular direction.
- Root legacy files: historical experiments, kept independently. Build output preserves their routes unless current reviewed source occupies the same public route; every historical page remains accessible under `/experiments/`.

Pages adaptations are generated, not written back to live source. A guard insertion that no longer matches its expected function fails the build so a future source edit requires review of the adapter.

## Verification

- Four sync tests exercise dry-run behavior, allowlisting, resolved symlink import, conflicting Git changes, unsafe paths, credential rejection, live drift refusal, resolved-file backups and two sequential committed deployments while preserving a live symlink.
- Static verification checks source/allowlist agreement, secret signatures and size limits, artifact symlink/privacy boundaries, all local HTML references, and desktop/visualizer JavaScript syntax.
- Browser smoke test: current desktop rendered 38 icons, the explicit live-desktop URL was correct, no page exceptions occurred, and no backend API/push requests were made on initial load.
- Star Map opened and parsed all 6,605 catalog stars. The `/gui/?i=programs/star-map.html&maximize=true` alias was checked at phone width; its iframe resolves from the root with no failed local requests. The radio entry page has an explicit live URL and no executable scripts.
- Gitleaks 8.30.1 scan of imported source passed after review of two false positives: literal localStorage key names. The configuration exempts those exact assignments only.
- Public chat (following its redirect), radio program, START, and household desk entry URLs returned HTTP 200 through Cloudflare. This verifies navigation targets, not the internal health of every backend service.
- Build emits 33 service entry pages and preserves 54 legacy files. Media/DOSBox catalogs and external-script applications are explicitly classified even when their HTML does not contain an API URL.
- The home live files were read only. No API, model, radio service or public Pages setting was changed during preparation.

## Known boundaries

External media and live features require the home server to be available. This is not an offline mirror of the multi-gigabyte archive. The build does not claim to fix historical experiment behavior or the known screensaver activation/reassembly defects. This PR prepares publication; the Pages source-setting switch and merge activate it.

Local private audit output is under `/mnt/sol-data/sol-stack/site-git-sync/`; it is intentionally not included in this public repository.

The home workstation also has a scoped `/home/david/random/AGENTS.md` directing future managed-source edits through this repository, and a stable wrapper at `/home/david/random/bin/sol37_public_source_sync.py`. These do not change Caddy or deploy this unmerged branch.
