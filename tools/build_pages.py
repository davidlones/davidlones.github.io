#!/usr/bin/env python3
"""Build a static archive; service UIs become explicit live-host entry pages."""
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
from urllib.parse import urljoin, urlsplit, unquote

from site_sync import ROOT, files, read_public

OUT = ROOT / '_site'
LIVE = 'https://sol.system42.one'
STATIC = 'https://davidlones.github.io'
GENERATED = {'site-index.json', 'knowledge-index.json', 'sitemap.xml', 'robots.txt', 'archive.html', 'live-services.html', 'gui/index.html'}
SERVICE_ALIASES = ['chat', 'dashboard', 'start', 'radio', 'services/desk', 'unified-clock', 'sol-ai', 'push', 'webcam-feed', 'youtube-transcript-search', 'zip-drive', 'api-reference']
GUARDS = ['hydrateAssistantHistory', 'initializeAssistantBroadcastPolling',
          'initializePublicPushNotifications', 'refreshSecondaryFeatureMinecraftStatus',
          'startSecondaryFeatureStatusRefresh', 'scheduleSecondaryFeatureToast',
          'requestAssistantImmersionNarration', 'scheduleAssistantSuggestionPrefetch',
          'scheduleAssistantReadAloudPrefetch', 'scheduleAssistantPageContextSync',
          'refreshArchiveCounter', 'prefetchAssistantPreviewSpeech']
LIVE_ACTIONS = {'askDesktopAssistant': '/chat', 'readCurrentPageAloud': '/',
                'speakCurrentAssistantMessage': '/', 'playAssistantBuiltInAudio': '/?assistant=show'}


def title(text, fallback):
    match = re.search(r'<title[^>]*>(.*?)</title>', text, re.I | re.S)
    return html.unescape(re.sub('<[^>]+>', '', match.group(1))).strip() if match else fallback


def landing(label, path):
    url = LIVE + '/' + path.lstrip('/')
    if url.endswith('/index.html'):
        url = url[:-10]
    return f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(label)} — live service</title><link rel="stylesheet" href="/pages/archive.css">
<main><h1>{html.escape(label)}</h1><p>This feature runs on the Sol home server. GitHub Pages hosts the static desktop and archive.</p>
<p><a class="primary" href="{html.escape(url, quote=True)}" target="_top">Open live service at sol.system42.one</a></p>
<p>Models, radio receivers, authenticated controls and APIs stay on the live server.</p>
<p><a href="/">Desktop</a> · <a href="/archive.html">Static archive</a> · <a href="/live-services.html">Live services</a></p></main></html>'''


def exists(path):
    p = OUT / unquote(path).lstrip('/')
    return p.is_file() or (p / 'index.html').is_file()


def route(value, current):
    if not value or value.startswith(('#', 'data:', 'javascript:', 'mailto:', 'tel:', 'blob:')):
        return value
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return value
    resolved = urlsplit(urljoin(STATIC + '/' + current, value))
    path = resolved.path
    # Existing static files stay local; everything else has an explicit live origin.
    if exists(path):
        return path + ('?' + resolved.query if resolved.query else '') + ('#' + resolved.fragment if resolved.fragment else '')
    return LIVE + path + ('?' + resolved.query if resolved.query else '') + ('#' + resolved.fragment if resolved.fragment else '')


class Rewrite(HTMLParser):
    def __init__(self, current):
        super().__init__(convert_charrefs=False)
        self.current, self.output = current, []

    def handle_starttag(self, tag, attrs):
        values = []
        for key, value in attrs:
            if value is not None and key in {'href', 'src', 'poster', 'action', 'data-link'}:
                value = route(value, self.current)
            if value is not None and key == 'srcset':
                value = ', '.join(' '.join([route(part.strip().split()[0], self.current), *part.strip().split()[1:]]) for part in value.split(',') if part.strip())
            values.append(key if value is None else f'{key}="{html.escape(value, quote=True)}"')
        self.output.append('<' + tag + (' ' + ' '.join(values) if values else '') + '>')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag): self.output.append(f'</{tag}>')
    def handle_data(self, data): self.output.append(data)
    def handle_entityref(self, name): self.output.append(f'&{name};')
    def handle_charref(self, name): self.output.append(f'&#{name};')
    def handle_comment(self, data): self.output.append(f'<!--{data}-->')
    def handle_decl(self, data): self.output.append(f'<!{data}>')


def guard(text, name, statement='return;'):
    pattern = rf'(^[ \t]*(?:async )?function {name}\([^\n]*\{{\n)'
    text, count = re.subn(pattern, lambda m: m[1] + f'    if (window.SOL_STATIC_ARCHIVE) {{ {statement} }}\n', text, flags=re.M)
    if count != 1:
        raise ValueError(f'Static adapter needs review: expected one {name}, found {count}')
    return text


def adapt_desktop(text):
    text = text.replace('<head>', '<head>\n<script src="/pages/archive-mode.js"></script>', 1)
    for name in GUARDS:
        text = guard(text, name)
    for name, path in LIVE_ACTIONS.items():
        text = guard(text, name, f'window.solOpenLiveService({json.dumps(path)}); return;')
    # Caddy supplies these aliases on the live host; Pages needs physical paths.
    text = text.replace("window.location.pathname === '/gui'", "window.location.pathname.replace(/\\/$/, '') === '/gui'")
    # Keep the archive entry focused on the desktop; the live site's featured service remains linked.
    text = text.replace("const featuredWin = openLinkedResourceWindow(ROOT_FEATURED_POST.href, ROOT_FEATURED_POST.title);", "const featuredWin = null; // Static archive opens on the desktop.")
    # Literal runtime/media resources referenced inside JavaScript, including template URLs.
    text = re.sub(r'([\'\"`])(/(?:audio|video|downloads|api|push)/)', lambda m: m[1] + LIVE + m[2], text)
    return text


def main():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir()
    legacy = json.loads((ROOT / 'config/legacy-files.json').read_text())
    for name in legacy:
        source = ROOT / name
        if source.is_symlink() or not source.is_file(): raise ValueError(f'Legacy file unavailable: {name}')
        for target in [OUT / name, OUT / 'experiments' / name]:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    managed = files()
    for name in managed:
        target = OUT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(read_public(ROOT / 'site' / name))
    shutil.copytree(ROOT / 'pages', OUT / 'pages')
    services = []
    for name in managed:
        if not name.endswith(('.html', '.htm')) or name == 'index.html': continue
        target = OUT / name
        text = target.read_text()
        # No client-side proxying of same-origin service applications from Pages.
        if re.search(r'/api/|new WebSocket|new EventSource|/push/', text) or name.startswith(('chat/', 'dashboard/', 'start/', 'sol-ai/')):
            services.append({'path': name, 'title': title(text, name)})
            target.write_text(landing(title(text, name), name))
    for name in SERVICE_ALIASES:
        p = OUT / name / 'index.html'
        if not p.exists():
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(landing(name.replace('-', ' ').title(), name))
            services.append({'path': name, 'title': name})
    desktop = adapt_desktop((OUT / 'index.html').read_text())
    (OUT / 'index.html').write_text(desktop)
    (OUT / 'gui').mkdir(exist_ok=True)
    (OUT / 'gui/index.html').write_text(desktop.replace('<head>', '<head><base href="/">', 1))
    index = []
    for name in managed:
        if name.endswith(('.html', '.md')):
            text = (ROOT / 'site' / name).read_text()
            index.append({'id': name.replace('/', '-').replace('.', '-'), 'file': name, 'href': name,
                          'title': title(text, name), 'type': 'md' if name.endswith('.md') else 'html',
                          'source': 'www', 'private': False})
    (OUT / 'site-index.json').write_text(json.dumps(index, indent=2) + '\n')
    (OUT / 'knowledge-index.json').write_text('{"posts": []}\n')
    links = '\n'.join(f'<li><a href="/{html.escape(x["file"], quote=True)}">{html.escape(x["title"])}</a></li>' for x in index)
    old = '\n'.join(f'<li><a href="/experiments/{html.escape(n, quote=True)}">{html.escape(n)}</a></li>' for n in legacy if n.endswith(('.html', '.htm')))
    (OUT / 'archive.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><title>Sol static archive</title><link rel="stylesheet" href="/pages/archive.css"><main><h1>Sol static archive</h1><p><a href="/">Desktop</a> · <a href="/live-services.html">Live services</a></p><h2>Current public source</h2><ul>{links}</ul><h2>Earlier experiments</h2><ul>{old}</ul></main></html>')
    slinks = '\n'.join(f'<li><a href="{LIVE}/{html.escape(x["path"], quote=True)}">{html.escape(x["title"])}</a></li>' for x in services)
    (OUT / 'live-services.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><title>Sol live services</title><link rel="stylesheet" href="/pages/archive.css"><main><h1>Live services</h1><p>These run on <a href="{LIVE}">sol.system42.one</a>. GitHub Pages runs no models, radio receivers, authenticated controls or APIs.</p><ul>{slinks}</ul><p><a href="/">Desktop</a> · <a href="/archive.html">Archive</a></p></main></html>')
    # All files exist before resolving references, including newly generated routes.
    for p in sorted(OUT.rglob('*.html')):
        current = str(p.relative_to(OUT))
        parser = Rewrite('index.html' if current == 'gui/index.html' else current)
        parser.feed(p.read_text())
        p.write_text(''.join(parser.output))
    for p in OUT.rglob('*.css'):
        p.write_text(re.sub(r'url\(([\'\"]?)([^)\'\"]+)\1\)', lambda m: 'url(' + m[1] + route(m[2], str(p.relative_to(OUT))) + m[1] + ')', p.read_text()))
    (OUT / '.nojekyll').touch()
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {STATIC}/sitemap.xml\n')
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join('<url><loc>' + html.escape(STATIC + '/' + x['file']) + '</loc></url>' for x in index if x['file'].endswith('.html')) + '</urlset>')
    (ROOT / 'build-report.json').write_text(json.dumps({'managed_files': len(managed), 'legacy_files': len(legacy), 'live_service_pages': services}, indent=2) + '\n')
    print(f'Built {OUT}: {len(managed)} managed files; {len(legacy)} preserved legacy files; {len(services)} service entry pages')


if __name__ == '__main__': main()
