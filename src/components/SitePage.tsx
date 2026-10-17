import parse, { domToReact, Element, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser';
import type { ReactNode } from 'react';
import { MotionRuntime } from './MotionRuntime';
import { Carousel, ContactForm, FaqItem, MobileNavigation } from './interactions';
import faq from '@/content/faq.json';
import { ArchitectureScroll } from './ArchitectureScroll';

function descendants(node: DOMNode, predicate: (node: Element) => boolean): Element[] {
  if (!(node instanceof Element)) return [];
  return [ ...(predicate(node) ? [node] : []), ...node.children.flatMap(child => descendants(child as DOMNode, predicate)) ];
}

function text(node: DOMNode): string {
  if (node.type === 'text' && 'data' in node) return String(node.data);
  return node instanceof Element ? node.children.map(child => text(child as DOMNode)).join('') : '';
}

export function SitePage({ page }: { page: { html: string; css: string; animations: Record<string, unknown>; slug: string } }) {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return;
      const attrs = node.attribs;
      if (attrs['data-nex-carousel'] !== undefined) {
        const track = descendants(node, node => node.name === 'ul')[0];
        const items = track?.children.filter((child): child is Element => child instanceof Element && child.name === 'li') ?? [];
        const seen = new Set<string>();
        const cards: ReactNode[] = [];
        for (const item of items) {
          const name = text(item).trim();
          if (!name || seen.has(name)) continue;
          seen.add(name);
          cards.push(domToReact(item.children as DOMNode[], options));
        }
        return <Carousel cards={cards} />;
      }
      if (attrs.class?.split(' ').some(name => ['framer-rs9dF', 'framer-n2vzI'].includes(name))) {
        const inverse = attrs.class.includes('framer-n2vzI');
        const heading = descendants(node, node => node.name === (inverse ? 'h6' : 'h5'))[0];
        if (heading) {
          const question = text(heading).trim();
          const existing = descendants(node, node => node.name === 'p').map(node => text(node)).join('\n');
          const answer = (faq as Record<string, string>)[question] || existing;
          return <FaqItem question={question} answer={answer} inverse={inverse} initialOpen={['Open', 'Variant 1'].includes(attrs['data-framer-name'])} />;
        }
      }
      if (node.name === 'form') {
        return <ContactForm className={attrs.class}>{domToReact(node.children as DOMNode[], options)}</ContactForm>;
      }
      // Remove export-only hydration attributes. Layout class names stay stable
      // to preserve all the author's responsive rules and CSS custom properties.
      if (node.name === 'input' && attrs['aria-hidden'] === 'true') return <></>;
      if (node.name === 'a' && attrs.href?.startsWith('javascript:')) return <></>;
      if (node.name === 'style') return <style>{text(node)}</style>;
      if (node.name === 'svg') return undefined;
    },
  };
  return <>
    <style>{page.css}</style>
    <div id="nex3-site" key={page.slug}>{parse(page.html, options)}</div>
    <MobileNavigation />
    <MotionRuntime animations={page.animations} pageKey={page.slug} />
    {page.slug === 'home' && <ArchitectureScroll />}
  </>;
}
