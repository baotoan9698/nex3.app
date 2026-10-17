import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pages from '@/content/pages.json';

export { pages };
export async function loadPage(slug: string) {
  const page = pages.find(page => page.slug === slug);
  if (!page) return null;
  const base = path.join(process.cwd(), 'src', 'content', page.key);
  const [html, css, animations] = await Promise.all([
    readFile(base + '.html', 'utf8'),
    readFile(base + '.css', 'utf8'),
    readFile(base + '.animations.json', 'utf8'),
  ]);
  return { ...page, html, css, animations: JSON.parse(animations) };
}
