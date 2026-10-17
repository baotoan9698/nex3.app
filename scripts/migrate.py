"""Import the owner's public Framer design into an independent Next.js site.

Only layout, content, font files, images and animation descriptions are retained.
No Framer JavaScript, telemetry, editor code or remote forms are shipped.
Run manually to refresh the public-source snapshot, not during build/runtime.
"""
from bs4 import BeautifulSoup, Comment
from pathlib import Path
from urllib.parse import urlsplit, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'src/content'
ASSETS = ROOT / 'public/assets'
REFERENCE = ROOT / '.reference'
for folder in (CONTENT, ASSETS, REFERENCE):
    folder.mkdir(parents=True, exist_ok=True)

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404 and url == 'https://nex3.app/404':
            return error.read()
        raise

sitemap = ET.fromstring(fetch('https://nex3.app/sitemap.xml'))
urls = [x.text for x in sitemap.iter() if x.tag.endswith('loc')]
pages = {}
with ThreadPoolExecutor(max_workers=6) as pool:
    jobs = {pool.submit(fetch, url): url for url in urls}
    for job in as_completed(jobs):
        url = jobs[job]
        slug = urlsplit(url).path.strip('/') or 'home'
        raw = job.result().decode('utf-8')
        (REFERENCE / (slug.replace('/', '__') + '.html')).write_text(raw, encoding='utf-8')
        pages[slug] = (url, BeautifulSoup(raw, 'html.parser'))
        print('Read', slug, flush=True)

# Fetch every referenced image/font once. Query strings only resize an original.
asset_urls = set()
pattern = re.compile(r'https://(?:framerusercontent\.com|fonts\.gstatic\.com)/[^\s\)\("\'<>;,]+')
for _, soup in pages.values():
    for match in pattern.findall(str(soup)):
        base = match.split('?')[0]
        if re.search(r'\.(png|jpe?g|webp|gif|svg|avif|woff2?|ttf|otf|mp4|webm)$', base, re.I):
            asset_urls.add(base)

asset_map = {}
def download(url):
    parsed = urlsplit(url)
    filename = hashlib.sha256(url.encode()).hexdigest()[:10] + '-' + Path(parsed.path).name
    path = ASSETS / filename
    if not path.exists():
        path.write_bytes(fetch(url))
    return url, '/assets/' + filename

with ThreadPoolExecutor(max_workers=10) as pool:
    for job in as_completed([pool.submit(download, u) for u in sorted(asset_urls)]):
        url, local = job.result()
        asset_map[url] = local
print('Saved', len(asset_map), 'local assets', flush=True)

def localize(text):
    def replace(match):
        value = match.group(0)
        return asset_map.get(value.split('?')[0], value)
    return pattern.sub(replace, text)

# Recover FAQ text from original authoring metadata, including initially closed rows.
module_root = REFERENCE / 'modules'
module_root.mkdir(exist_ok=True)
main_script = pages['home'][1].find('script', attrs={'type': 'module', 'src': True})
if main_script:
    entry_url = main_script['src']
    entry_source = fetch(entry_url).decode('utf-8')
    module_urls = [urljoin(entry_url, value) for value in dict.fromkeys(re.findall(r'import\(`(\./[^`]+)\`\)', entry_source))]
    def cache_module(url):
        destination = module_root / Path(urlsplit(url).path).name
        if not destination.exists():
            destination.write_bytes(fetch(url))
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(cache_module, module_urls))
home_runtime = REFERENCE / 'home-runtime.mjs'
if not home_runtime.exists() and (ROOT / 'home-reference.mjs').exists():
    home_runtime.write_text((ROOT / 'home-reference.mjs').read_text(encoding='utf-8'), encoding='utf-8')
faq = json.loads((CONTENT / 'faq.json').read_text(encoding='utf-8')) if (CONTENT / 'faq.json').exists() else {}
loops = {}
source_files = ([home_runtime] if home_runtime.exists() else []) + sorted(module_root.glob('*.mjs'))
if source_files:
    source = '\n'.join(p.read_text(encoding='utf-8') for p in source_files)
    for answer, question in re.findall(r'lr9MckAMy:`([^`]+)`.{0,250}?xyvbwpR7S:`([^`]+)`', source):
        faq[question] = answer
    for question, answer in re.findall(r'r3N7MaErx:`([^`]+)`.{0,300}?yAsmkyjJv:`([^`]+)`', source, re.S):
        faq[question.strip()] = answer
    declarations = {}
    for declaration in re.finditer(r'(?<![\w$])([\w$]+)=\{([^{}]*)\}', source):
        declarations.setdefault(declaration.group(1), []).append((declaration.start(), declaration.group(2)))
    def literal_before(name, before):
        matches = [raw for pos, raw in declarations.get(name, []) if pos < before]
        if not matches:
            return {}
        raw = matches[-1]
        values = {k: float(v) for k, v in re.findall(r'(\w+):(-?(?:\d+\.?\d*|\.\d+))(?=,|$)', raw)}
        ease = re.search(r'ease:\[([^\]]+)\]', raw)
        if ease:
            values['ease'] = [float(v) for v in ease.group(1).split(',')]
        return values
    for match in re.finditer(r'__framer__loop:([\w$]+)', source):
        tail = source[match.end():match.end()+700]
        after = tail.split('children:', 1)[0]
        classes = re.findall(r'className:`(framer-[^`]+)`', after)
        if not classes:
            classes = re.findall(r'className:`(framer-[^`]+)`', source[max(0, match.start()-400):match.start()])
        if not classes:
            continue
        classname = classes[0] if 'className:' in after else classes[-1]
        transition = re.search(r'__framer__loopTransition:([\w$]+)', tail)
        values = literal_before(match.group(1), match.start())
        if classname not in loops and values:
            loops[classname] = {'target': values, 'transition': literal_before(transition.group(1), match.start()) if transition else {}}
(CONTENT / 'faq.json').write_text(json.dumps(faq, ensure_ascii=False, indent=2), encoding='utf-8')
(CONTENT / 'loops.json').write_text(json.dumps(loops, indent=2), encoding='utf-8')

manifest = []
for slug, (url, soup) in pages.items():
    key = slug.replace('/', '__')
    title = soup.title.get_text() if soup.title else 'NEX3'
    desc = soup.find('meta', attrs={'name': 'description'})
    description = desc.get('content', '') if desc else ''
    styles = '\n'.join(style.get_text() for style in soup.head.find_all('style'))
    styles = localize(styles)
    # Preserve original opacity/translation/scale/delay and breakpoint definitions.
    animation_tag = soup.find('script', id='__framer__appearAnimationsContent')
    animations = json.loads(animation_tag.get_text()) if animation_tag else {}
    breakpoint_tag = soup.find('script', id='__framer__breakpoints')
    if breakpoint_tag:
        animations['__breakpoints'] = json.loads(breakpoint_tag.get_text())
    main = soup.find(id='main')
    if not main:
        raise RuntimeError('Missing page layout: ' + slug)
    templates = soup.find(id='svg-templates')
    if templates:
        main.append(templates.extract())
    for node in main.find_all(['script', 'iframe']):
        node.decompose()
    for comment in main.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()
    for node in main.find_all(True):
        for attr in ('src', 'poster', 'href', 'xlink:href'):
            value = node.get(attr, '')
            if isinstance(value, str) and value.split('?')[0] in asset_map:
                node[attr] = asset_map[value.split('?')[0]]
        for attr in list(node.attrs):
            if attr.startswith('on') or attr in ('data-framer-hydrate-v2', 'data-framer-generated-page'):
                del node[attr]
        # Browser selects the matching original breakpoint through retained CSS.
        # Initial invisible transforms are played by our own Web Animations runtime.
        style = localize(node.get('style', ''))
        if node.has_attr('style'):
            node['style'] = style
        animated = node.has_attr('data-framer-appear-id') or bool(re.search(r'(?:^|;)opacity:(?:0(?:\.001)?)(?:;|$)', style))
        if animated and node.name not in ('input',):
            node['data-nex-reveal'] = ''
            node['data-nex-initial'] = style
            style = re.sub(r'(?:^|;)(?:opacity|visibility|transform|will-change|filter):[^;]*', '', style)
            node['style'] = style.strip(';')
        if node.name == 'img':
            node.attrs.pop('srcset', None)
            node.attrs.pop('data-framer-original-sizes', None)
            if not node.find_parent(id='hero'):
                node['loading'] = 'lazy'
        if node.name == 'a' and node.has_attr('href'):
            href = node['href']
            absolute = urljoin(url, href)
            parsed = urlsplit(absolute)
            if parsed.netloc == 'nex3.app':
                node['href'] = parsed.path + ('#' + parsed.fragment if parsed.fragment else '')
            if node.get('target') == '_blank':
                node['rel'] = 'noopener noreferrer'
        if node.name in ('input', 'textarea') and node.get('placeholder'):
            node['aria-label'] = node['placeholder']
    # Slideshow clone items are handled by a dedicated React component.
    for section in main.find_all('section'):
        if section.find('fieldset', attrs={'aria-label': 'Slideshow pagination controls'}):
            section['data-nex-carousel'] = ''
    # Keep the original Explore Protocol CTA interactive even if authored as a div.
    for text in main.find_all(string=lambda t: t and t.strip() == 'Explore Protocol'):
        parent = text.find_parent(['button', 'a']) or text.find_parent(attrs={'data-highlight': 'true'})
        if parent and parent.name != 'a':
            parent['data-nex-explore'] = ''
            parent['role'] = 'link'
            parent['tabindex'] = '0'
    html = localize(''.join(str(child) for child in main.children))
    (CONTENT / (key + '.html')).write_text(html, encoding='utf-8')
    (CONTENT / (key + '.css')).write_text(styles, encoding='utf-8')
    (CONTENT / (key + '.animations.json')).write_text(json.dumps(animations), encoding='utf-8')
    manifest.append({'slug': slug, 'key': key, 'title': title, 'description': description})
(CONTENT / 'pages.json').write_text(json.dumps(sorted(manifest, key=lambda p:p['slug']), ensure_ascii=False, indent=2), encoding='utf-8')
(CONTENT / 'assets.json').write_text(json.dumps(asset_map, indent=2), encoding='utf-8')
print('Migrated', len(manifest), 'pages. No Framer runtime required.', flush=True)
