#!/usr/bin/env python3
"""Check publication boundaries, static references, and JavaScript syntax."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urljoin, urlsplit
from site_sync import ROOT, files, read_public


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.scripts = []
        self.script = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for attr in ('href', 'src', 'poster', 'action'):
            if attrs.get(attr): self.refs.append(attrs[attr])
        if tag == 'script' and not attrs.get('src') and attrs.get('type', '') in ('', 'text/javascript', 'application/javascript', 'module'):
            self.script = ''
    def handle_data(self, data):
        if self.script is not None: self.script += data
    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            self.scripts.append(self.script)
            self.script = None


def main():
    out = ROOT / '_site'
    assert out.is_dir(), 'Build first'
    names = files()
    actual = {str(p.relative_to(ROOT / 'site')) for p in (ROOT / 'site').rglob('*') if p.is_file()}
    assert actual == set(names), 'Unreviewed or missing imported source'
    for name in names:
        p = ROOT / 'site' / name
        assert not p.is_symlink(), f'Git source must contain bytes, not local links: {name}'
        read_public(p)
    errors, scripts = [], 0
    for p in out.rglob('*.html'):
        current = str(p.relative_to(out))
        reader = References()
        reader.feed(p.read_text())
        for ref in reader.refs:
            if ref.startswith(('#', 'data:', 'javascript:', 'mailto:', 'tel:', 'blob:')): continue
            url = urlsplit(urljoin('https://davidlones.github.io/' + current, ref))
            if url.netloc != 'davidlones.github.io': continue
            path = out / unquote(url.path).lstrip('/')
            if not path.is_file() and not (path / 'index.html').is_file():
                errors.append(f'{current}: missing local reference {ref}')
        # Old experiments are preserved, not silently repaired; syntax-check current shell/adapters.
        if current in {'index.html', 'gui/index.html'}:
            for script in reader.scripts:
                result = subprocess.run(['node', '--check', '--input-type=module'], input=script, text=True, capture_output=True)
                if result.returncode: errors.append(f'{current}: {result.stderr[:500]}')
                scripts += 1
    for name in ['pages/archive-mode.js', 'assets/hue-visualizer.js']:
        subprocess.run(['node', '--check', str(out / name)], check=True)
    for p in out.rglob('*'):
        assert not p.is_symlink(), f'Pages artifact contains symlink: {p}'
        assert not any(x in p.relative_to(out).parts for x in ['.git', '.env', '.unlisted', '__pycache__'])
    assert 'window.SOL_STATIC_ARCHIVE = true' in (out / 'pages/archive-mode.js').read_text()
    assert 'https://sol.system42.one' in (out / 'live-services.html').read_text()
    for service in json.loads((ROOT / 'build-report.json').read_text())['live_service_pages']:
        path = out / service['path']
        if not path.is_file(): path = path / 'index.html'
        body = path.read_text()
        assert '<script' not in body.lower(), f'Service app executes on Pages: {path}'
        assert 'Open live service at sol.system42.one' in body
    if errors: raise SystemExit('\n'.join(errors))
    print(f'PASS: {len(names)} reviewed source files; local HTML references; {scripts} desktop scripts; artifact boundaries')


if __name__ == '__main__': main()
