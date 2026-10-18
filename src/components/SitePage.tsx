import { attributesToProps, htmlToDOM, domToReact, type Element, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser';
import type { ReactNode } from 'react';
import { MotionRuntime } from './MotionRuntime';
import { Carousel, ContactForm, FaqItem, MobileNavigation } from './interactions';
import faq from '@/content/faq.json';
import { ArchitectureScroll, MobileArchitectureArt } from './ArchitectureScroll';

function isElement(node: unknown): node is Element {
  return !!node && typeof node === 'object' && 'attribs' in node && 'children' in node;
}

function descendants(node: DOMNode, predicate: (node: Element) => boolean): Element[] {
  const element = 'attribs' in node ? node as Element : null;
  const children = 'children' in node ? node.children as DOMNode[] : [];
  return [ ...(element && predicate(element) ? [element] : []), ...children.flatMap(child => descendants(child, predicate)) ];
}

function text(node: DOMNode): string {
  if (node.type === 'text' && 'data' in node) return String(node.data);
  return isElement(node) ? node.children.map(child => text(child as DOMNode)).join('') : '';
}

export function SitePage({ page }: { page: { html: string; css: string; animations: Record<string, unknown>; slug: string } }) {
  const tree = htmlToDOM(page.html);
  const architecture = page.slug === 'home' ? tree.flatMap(node => descendants(node, element => element.attribs.class?.split(' ').includes('framer-kKgAQ') ?? false))[0] : undefined;
  const architectureStrip = architecture ? descendants(architecture, element => element.attribs.class === 'framer-66biz4')[0] : undefined;
  const drawings = architectureStrip?.children.filter(isElement) ?? [];
  const mobileArtSources = ['J9zmYoxdbySuHM86I67mvF1ZbM', 'ATSew9SXeA6MBtzeAReo67iIVNg', 'ek4TvmVIaYF0SP1kMCbCyg36S4'];
  const mobileVariants = ['framer-v-16vo0c9', 'framer-v-1ikofib', 'framer-v-pgu32m'];
  const labels = ['On-chain Asset Layer', 'Integration Layer', 'Connectivity Layer'];
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!isElement(node)) return;
      const attrs = node.attribs;
      if (architecture && attrs['data-framer-background-image-wrapper'] !== undefined) {
        const image = node.children.find(child => isElement(child) && child.name === 'img') as Element | undefined;
        const stage = mobileArtSources.findIndex(source => image?.attribs.src?.includes(source));
        if (stage >= 0 && drawings[stage]) {
          const rootProps = attributesToProps(architecture.attribs);
          return <MobileArchitectureArt stage={stage + 1} label={labels[stage]}>
            <div {...rootProps} className={`framer-kKgAQ framer-16vo0c9 ${mobileVariants[stage]}`} data-framer-name={`Mobile ${stage + 1}`} aria-hidden="true">
              <div className="framer-66biz4">{domToReact([drawings[stage]], options)}</div>
            </div>
          </MobileArchitectureArt>;
        }
      }
      if (attrs['data-nex-carousel'] !== undefined) {
        const track = descendants(node, node => node.name === 'ul')[0];
        const items = track?.children.filter((child): child is Element => isElement(child) && child.name === 'li') ?? [];
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
    <div id="nex3-site" key={page.slug}>{domToReact(tree, options)}</div>
    <MobileNavigation />
    <MotionRuntime animations={page.animations} pageKey={page.slug} />
    {page.slug === 'home' && <ArchitectureScroll />}
  </>;
}
