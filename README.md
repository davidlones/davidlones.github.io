# Sol public source and static archive

This repository preserves the earlier experiments and tracks the reviewed public source of [Sol-37](https://sol.system42.one).

**GitHub Pages hosts the desktop and static archive. The Sol home server runs models, radio, authenticated controls, and APIs.** Service-dependent Pages routes contain explicit links to the live server; they do not proxy credentials or pretend to implement those services.

## Authoritative files

| Location | Role |
| --- | --- |
| `site/` | Reviewed public source, initially imported byte-for-byte from `/home/david/random/www`. Make future public-source edits here, on a branch. After PR review/merge, deploy this source to the home server. |
| `config/public-files.json` | Explicit synchronization allowlist. New live files are never imported automatically. Review and add a path intentionally. |
| `config/live-baseline.json` | Hashes observed at the most recent approved import. Used to detect conflicting live changes. |
| Existing root files and directories | Preserved earlier experiments. No pre-existing file was replaced by the initial import. |
| `config/legacy-files.json` | Inventory of the preserved earlier files. The Pages build also publishes them under `/experiments/`. |
| `pages/`, `tools/build_pages.py` | Pages-only presentation and service-boundary adapter. Changes here do not alter the live desktop renderer. |
| `_site/` | Generated Pages output. Never edit or commit it. |
| Home-server files outside the allowlist | Remain home-server-owned: private documents, household interfaces/data, runtime services, credentials, logs, media masters, downloads, model weights and generated datasets. |

The initial import preserved the live screensaver code. The activation, icon recovery and narration-reference repairs are tracked separately in [PR #45](https://github.com/davidlones/davidlones.github.io/pull/45). See the [verified status and remaining work](docs/source-and-deployment-status.md) before claiming a repair has reached production.

## Build and verify

Python 3.10+ and Node.js 22+ are sufficient; no package installation is needed.

```bash
python3 -m unittest discover -s tools -p 'test_*.py'
node tools/test_screensaver.cjs
python3 tools/build_pages.py
python3 tools/verify_pages.py
python3 -m http.server 8876 --bind 127.0.0.1 --directory _site
```

The build preserves all legacy files, overlays the reviewed current site in the generated artifact, regenerates a public-only archive index, resolves omitted assets to the live origin, and converts server-dependent pages to live-service entry pages. The `/gui/` shell alias is emitted as a real static directory. The desktop retains its canvas effect and local audio, while chat, generated speech, and built-in hold playback explicitly open on Sol to preserve their same-origin audio/service behavior.

## Repeatable synchronization

Commands are read-only unless `--apply` is supplied. Run them from this checkout on the home system:

```bash
# Inventory divergence before importing anything.
python3 tools/site_sync.py inventory --live /home/david/random/www

# On a dedicated branch, import reviewed live changes and commit the diff.
python3 tools/site_sync.py import-live --live /home/david/random/www --apply
python3 tools/site_sync.py check --live /home/david/random/www
git diff -- site config/live-baseline.json
# Also scan before pushing (Gitleaks 8.x, installed on the home workstation).
gitleaks dir site --config .gitleaks.toml --redact --no-banner
```

Import rejects missing managed files, known credential signatures, files over 4 MiB, and conflicting Git edits. The separate Gitleaks scan broadens credential detection; neither scanner replaces content/privacy review. Its only exemptions are two exact, reviewed localStorage key names. Files outside the allowlist are never copied or deleted. SeedRAID-linked source files are imported as ordinary bytes, so the repository has no dependencies on machine-local symlink targets.

**Normal future workflow:** branch → edit `site/` → build/tests → PR → merge → deploy the clean merged revision. Use import only to reconcile an emergency live edit; it is not the normal editing direction.

```bash
git switch main
git pull --ff-only
python3 tools/site_sync.py deploy-live --live /home/david/random/www
# Inspect the plan, then apply with a backup root on the mounted SOL data volume.
python3 tools/site_sync.py deploy-live --live /home/david/random/www \
  --backup-root /mnt/sol-data/sol-stack/site-git-sync/deploy-backups --apply
python3 tools/site_sync.py check --live /home/david/random/www
```

Deployment requires a clean committed checkout, refuses unknown live drift, backs up resolved bytes before writes, preserves existing live symlinks, and verifies each written hash. It does not remove files, restart services, or copy backend secrets. The backup contains the Git revision and a file-level deployment manifest; `last-deployment.json` records the expected state for the next deployment. After a partial failure, rerun the same revision after inspection or restore affected resolved files from that backup. For normal rollback, revert the source commit, review/merge, and deploy the new revert revision.

Keep backups on an independently verified mounted volume with enough space. There is no silent fallback to root-backed `/tmp` or Downloads.

## GitHub Pages publishing

The workflow builds and validates PRs without deployment. Pushes to `main` build and deploy through the `github-pages` environment using the [official Pages Actions flow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

PR #44 merged on 2026-10-04 UTC as `f3af75a94e5b2dfa8cd5f9d7ef25405cbc2acfb8`. Pages was switched to GitHub Actions and the merged build deployed successfully to https://davidlones.github.io/. That migration is complete; do not repeat the source-setting switch for ordinary updates.

GitHub-hosted Actions has no home-server credentials and cannot deploy live services. A successful Pages deployment does not prove the home source changed. Check available space on the actual resolved destination filesystems before applying home updates, and verify live hashes and public responses afterward. The October 3 screensaver repair was held from deployment because root storage was exhausted.

See [the reconciliation inventory](docs/live-source-reconciliation.md) for scope, exclusions and verification.
