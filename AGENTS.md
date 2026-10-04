# Public source workflow

- Preserve repository history and the earlier root experiments. Never force-push or rebuild this repository as a history-free snapshot.
- `site/` is the reviewed public-source authority. Make changes on a branch, validate, and open a PR before deploying the merged revision to the home server.
- Inventory drift with `tools/site_sync.py inventory` before an import. Do not copy the entire live web root.
- New synchronization paths require explicit review in `config/public-files.json`. Exclude credentials, private documents, household data, runtime logs, model weights and large generated datasets/media.
- Do not edit `_site/`. Pages-specific changes belong in `pages/` or the build adapter; service functionality remains at `https://sol.system42.one`.
- Run `python3 -m unittest discover -s tools -p 'test_*.py'`, the build, and `tools/verify_pages.py` before publication. Browser-check navigation and service boundaries when changing the Pages adapter.
- Live deployment must use the sync tool with a resolved-file backup and a clean Git revision. Do not bypass drift checks or remove untracked live files.
