#!/usr/bin/env python3
"""Explicit, reviewable synchronization between Git and the live public tree."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / 'config/public-files.json'
BASELINE = ROOT / 'config/live-baseline.json'
MAX_BYTES = 4 * 1024 * 1024
FORBIDDEN = {'.env', '.git', '.unlisted', '.playwright-cli', '__pycache__', 'node_modules'}
SECRET = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-)?[A-Za-z0-9_-]{40,}|AKIA[A-Z0-9]{16})\b')


def files():
    paths = json.loads(POLICY.read_text())['files']
    if len(paths) != len(set(paths)):
        raise ValueError('Duplicate manifest path')
    for name in paths:
        p = Path(name)
        if p.is_absolute() or '..' in p.parts or any(x in FORBIDDEN or x.startswith('.') for x in p.parts):
            raise ValueError(f'Unsafe path: {name}')
    return paths


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_public(path):
    data = path.read_bytes()  # Materialize reviewed SeedRAID links as ordinary Git files.
    if len(data) > MAX_BYTES:
        raise ValueError(f'File exceeds public-source size limit: {path.name}')
    if SECRET.search(data):
        raise ValueError(f'Credential-like material detected: {path.name}')
    return data


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Follow an existing live file link; never replace a SeedRAID namespace link.
    target = path.resolve() if path.is_symlink() else path
    fd, temporary = tempfile.mkstemp(prefix='.git-sync-', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        if target.exists():
            os.chmod(temporary, target.stat().st_mode & 0o777)
        else:
            os.chmod(temporary, 0o644)
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['inventory', 'import-live', 'check', 'deploy-live'])
    parser.add_argument('--live', type=Path, default=Path('/home/david/random/www'))
    parser.add_argument('--apply', action='store_true', help='Apply the printed plan; otherwise read-only')
    parser.add_argument('--backup-root', type=Path, help='Required resolved-file backup location for deploy-live')
    args = parser.parse_args()
    names = files()
    baseline = json.loads(BASELINE.read_text()) if BASELINE.exists() else {}
    payloads, report = {}, []
    # Read and validate the whole batch before writing anything.
    for name in names:
        live_path, tracked_path = args.live / name, ROOT / 'site' / name
        live = read_public(live_path) if live_path.is_file() else None
        tracked = read_public(tracked_path) if tracked_path.is_file() else None
        lh, th = digest(live) if live is not None else None, digest(tracked) if tracked is not None else None
        report.append({'path': name, 'live_sha256': lh, 'git_sha256': th,
                       'state': 'same' if lh == th else 'different',
                       'legacy_state': 'same' if (ROOT / name).is_file() and digest((ROOT / name).read_bytes()) == lh else ('different' if (ROOT / name).is_file() else 'new')})
        payloads[name] = (live, tracked)
    changed = [r for r in report if r['state'] != 'same']
    print(json.dumps({'managed_files': len(names), 'changed_files': len(changed), 'changes': changed}, indent=2))
    if args.command == 'check':
        raise SystemExit(bool(changed))
    if args.command == 'inventory' or not args.apply:
        return
    if args.command == 'import-live':
        for name, (live, tracked) in payloads.items():
            if live is None:
                raise ValueError(f'Managed live source missing: {name}; review removal explicitly')
            old = baseline.get(name)
            if old and tracked is not None and digest(tracked) != old and tracked != live:
                raise ValueError(f'Git edits would be overwritten: {name}; reconcile in a branch first')
        for name, (live, _) in payloads.items():
            atomic_write(ROOT / 'site' / name, live)
        atomic_write(BASELINE, (json.dumps({n: digest(v[0]) for n, v in payloads.items()}, indent=2) + '\n').encode())
    else:
        if not args.backup_root:
            raise ValueError('--backup-root is required for live deployment')
        if subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT).strip():
            raise ValueError('Commit and review all Git changes before live deployment')
        revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        state_path = args.backup_root / 'last-deployment.json'
        previous = json.loads(state_path.read_text()) if state_path.exists() else {}
        deployed = previous.get('files', {}) if previous.get('live_root') == str(args.live.resolve()) else {}
        for row in report:
            if row['git_sha256'] is None:
                raise ValueError(f'Missing tracked source: {row["path"]}')
            expected = deployed.get(row['path'], baseline.get(row['path']))
            if row['live_sha256'] not in {expected, row['git_sha256']}:
                raise ValueError(f'Unimported live drift: {row["path"]}; import/reconcile before deployment')
        if not changed:
            print(f'Live managed files already match {revision}; no writes needed')
            return
        # No deletion, service restart, secret copying, or remote execution.
        backup = args.backup_root / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + revision[:12])
        backup.mkdir(parents=True, exist_ok=False)
        for row in changed:
            name = row['path']
            old = payloads[name][0]
            if old is not None:
                atomic_write(backup / name, old)
        atomic_write(backup / 'deployment.json', (json.dumps({'revision': revision, 'changes': changed}, indent=2) + '\n').encode())
        for row in changed:
            name = row['path']
            atomic_write(args.live / name, payloads[name][1])
            if digest((args.live / name).read_bytes()) != row['git_sha256']:
                raise RuntimeError(f'Post-write verification failed: {name}; restore from {backup}')
        atomic_write(state_path, (json.dumps({'revision': revision, 'live_root': str(args.live.resolve()),
                                             'files': {r['path']: r['git_sha256'] for r in report}}, indent=2) + '\n').encode())
        print(f'Deployed {revision}; resolved-file backup: {backup}')


if __name__ == '__main__':
    main()
