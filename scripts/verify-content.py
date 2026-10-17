"""Verify local assets, SVG references, page coverage and runtime independence."""
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import unquote, urlsplit
import json
import re

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'src/content'
pages = json.loads((CONTENT / 'pages.json').read_text(encoding='utf-8'))
routes = {'/' if p['slug'] == 'home' else '/' + p['slug'] for p in pages}
errors = []
for page in pages:
    html = (CONTENT / (page['key'] + '.html')).read_text(encoding='utf-8')
    css = (CONTENT / (page['key'] + '.css')).read_text(encoding='utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    ids = {node['id'] for node in soup.select('[id]')}
    for node in soup.select('use[href^="#"]'):
        if node['href'][1:] not in ids:
            errors.append(f"{page['slug']}: missing SVG definition {node['href']}")
    if soup.find('script') or soup.find('iframe'):
        errors.append(f"{page['slug']}: embedded runtime found")
    assets = set(re.findall(r'/assets/[^\s\)\("\'<>;]+', html + css))
    for asset in assets:
        if not (ROOT / 'public' / unquote(asset.lstrip('/'))).is_file():
            errors.append(f"{page['slug']}: missing asset {asset}")
    for link in soup.select('a[href^="/"]'):
        route = urlsplit(link['href']).path.rstrip('/') or '/'
        if route not in routes and not route.startswith('/assets/'):
            errors.append(f"{page['slug']}: unknown route {route}")
    for node in soup.select('img[src]'):
        if not node['src'].startswith(('/assets/', 'data:')):
            errors.append(f"{page['slug']}: remote image {node['src']}")
if errors:
    print('\n'.join(sorted(set(errors))))
    raise SystemExit(1)
print(f"Verified {len(pages)} pages: local assets, local routes, SVG definitions, no embedded Framer runtime.")
