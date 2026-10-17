'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

export function FaqItem({ question, answer, initialOpen = false, inverse = false }: { question: string; answer: string; initialOpen?: boolean; inverse?: boolean }) {
  return <details className={`nex-faq${inverse ? ' nex-faq-inverse' : ''}`} open={initialOpen || undefined}>
    <summary>{question}<span className="nex-faq-plus" aria-hidden="true" /></summary>
    <div className="nex-faq-answer"><p>{answer}</p></div>
  </details>;
}

export function Carousel({ cards }: { cards: ReactNode[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const select = (index: number) => {
    const el = viewport.current;
    if (!el) return;
    const next = (index + cards.length) % cards.length;
    const card = el.children[next] as HTMLElement;
    el.scrollTo({ left: card.offsetLeft - (el.children[0] as HTMLElement).offsetLeft, behavior: 'smooth' });
    setActive(next);
  };
  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => select(active + 1), 5500);
    return () => clearInterval(timer);
  }, [active, paused]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="nex-carousel" aria-roledescription="carousel" aria-label="NEX3 on-chain use cases"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    <div className="nex-carousel-viewport" ref={viewport} onScroll={() => {
      const el = viewport.current;
      if (!el) return;
      const step = (el.children[0] as HTMLElement)?.getBoundingClientRect().width + 8;
      if (step) setActive(Math.min(cards.length - 1, Math.round(el.scrollLeft / step)));
    }}>
      {cards.map((card, index) => <div key={index} className="nex-carousel-card" role="group" aria-label={`${index + 1} of ${cards.length}`}>{card}</div>)}
    </div>
    <div className="nex-carousel-arrows">
      <button type="button" aria-label="Previous" onClick={() => select(active - 1)}>←</button>
      <button type="button" aria-label="Next" onClick={() => select(active + 1)}>→</button>
    </div>
    <div className="nex-carousel-dots">{cards.map((_, index) => <button type="button" key={index} aria-label={`Scroll to page ${index + 1}`} aria-current={active === index ? 'true' : undefined} onClick={() => select(index)} />)}</div>
  </section>;
}

export function ContactForm({ children, className }: { children: ReactNode; className?: string }) {
  const [status, setStatus] = useState('');
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('Name') || '');
    const email = String(data.get('Email') || '');
    const message = String(data.get('text area') || data.get('Tell us more') || '');
    const referral = String(data.get('Where did you hear about us?') || '');
    const fullMessage = message + (referral ? `\n\nWhere did you hear about us? ${referral}` : '');
    setPending(true);
    setStatus('');
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, message: fullMessage }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send your message. Please try again.');
      if (result.mode === 'email') {
        setDraft(`mailto:${result.email}?subject=${encodeURIComponent('NEX3 enquiry — ' + name)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${fullMessage}`)}`);
        setStatus('Your message is ready. Continue in your email app to send it.');
      } else {
        setStatus('Thank you. Your message has been sent.');
        setDraft('');
        form.reset();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to send your message.');
    } finally { setPending(false); }
  }
  return <form className={className} onSubmit={submit} aria-busy={pending}>
    <fieldset className="nex-form-fields" disabled={pending}>{children}</fieldset>
    {status && <div className="nex-form-status" role="status">{status}{draft && <a href={draft}>Open email app ↗</a>}</div>}
  </form>;
}

const nav = [['Home', '/'], ['Solutions', '/solution'], ['Partner', '/partner'], ['FAQ', '/#faq'], ['Blog', '/blog']];
export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    const site = document.getElementById('nex3-site');
    if (site) site.inert = true;
    document.body.style.overflow = 'hidden';
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
      if (event.key === 'Tab') {
        const links = panel.current?.querySelectorAll<HTMLAnchorElement>('a');
        if (!links?.length) return;
        if (!event.shiftKey && document.activeElement === links[links.length - 1]) { event.preventDefault(); trigger.current?.focus(); }
        if (event.shiftKey && document.activeElement === trigger.current) { event.preventDefault(); links[links.length - 1].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; if (site) site.inert = false; document.removeEventListener('keydown', key); };
  }, [open]);
  return <div className="nex-mobile-nav">
    <button type="button" ref={trigger} className="nex-menu-toggle" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? '×' : '☰'}</button>
    {open && <div id="mobile-menu" className="nex-mobile-panel" ref={panel} role="dialog" aria-modal="true" aria-label="Navigation">
      <nav>{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        <a className="nex-mobile-launch" href="https://demo.nex3.app/">Launch App ↗</a>
      </nav>
    </div>}
  </div>;
}
