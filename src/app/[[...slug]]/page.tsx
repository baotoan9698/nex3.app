import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPage, pages } from '@/lib/content';
import { SitePage } from '@/components/SitePage';

type Props = { params: Promise<{ slug?: string[] }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return pages.map(page => ({ slug: page.slug === 'home' ? [] : page.slug.split('/') }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = pages.find(page => page.slug === (slug?.join('/') || 'home'));
  return { title: page?.title ?? 'Page not found — NEX3', description: page?.description };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = await loadPage(slug?.join('/') || 'home');
  if (!page) notFound();
  return <SitePage page={page} />;
}
