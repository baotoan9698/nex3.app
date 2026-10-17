'use client';

import { useEffect } from 'react';
import loops from '@/content/loops.json';

type MotionValues = {
  opacity?: number; x?: number | string; y?: number | string;
  scale?: number; rotate?: number; rotateX?: number; rotateY?: number;
  skewX?: number; skewY?: number; transformPerspective?: number;
  transition?: { delay?: number; duration?: number; type?: string; damping?: number; stiffness?: number };
};
type Appearance = { initial: MotionValues; animate: MotionValues };

function frame(value: MotionValues): Keyframe {
  const unit = (n: number | string | undefined) => typeof n === 'number' ? `${n}px` : (n || '0px');
  return {
    opacity: value.opacity ?? 1,
    transform: [
      value.transformPerspective ? `perspective(${value.transformPerspective}px)` : '',
      `translate3d(${unit(value.x)}, ${unit(value.y)}, 0)`,
      `scale(${value.scale ?? 1})`,
      `rotate(${value.rotate ?? 0}deg)`,
      `rotateX(${value.rotateX ?? 0}deg)`,
      `rotateY(${value.rotateY ?? 0}deg)`,
      `skew(${value.skewX ?? 0}deg, ${value.skewY ?? 0}deg)`,
    ].filter(Boolean).join(' '),
  };
}

/** Replaces Framer's runtime with native viewport observation and WAAPI. */
export function MotionRuntime({ animations, pageKey }: { animations: Record<string, unknown>; pageKey: string }) {
  useEffect(() => {
    const root = document.getElementById('nex3-site');
    if (!root) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const playing: Animation[] = [];
    const prepared = new WeakMap<Element, { frames: Keyframe[]; options: KeyframeAnimationOptions }>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        const config = prepared.get(element);
        element.style.visibility = '';
        if (config && !reduced.matches) {
          const animation = element.animate(config.frames, config.options);
          playing.push(animation);
          animation.onfinish = () => { animation.cancel(); element.style.opacity = ''; };
        }
        observer.unobserve(element);
      }
    }, { threshold: 0.03, rootMargin: '0px 0px -15px 0px' });

    root.querySelectorAll<HTMLElement>('[data-nex-reveal]').forEach(element => {
      if (reduced.matches || element.closest('.nex-carousel')) return;
      // These overlays are controlled continuously by ArchitectureScroll.
      // A one-shot reveal would paint unreached icons purple prematurely.
      if (element.closest('#product [data-framer-name="Icon"]') || element.matches('#product [data-framer-name="Fill"]')) return;
      const id = element.dataset.framerAppearId;
      const variants = id ? animations[id] as Record<string, Appearance> | undefined : undefined;
      // The HTML already encodes the breakpoint-specific initial transform.
      const original = element.dataset.nexInitial || '';
      const initialStyle = document.createElement('div').style;
      initialStyle.cssText = original;
      const breakpoints = animations.__breakpoints as { hash: string; mediaQuery: string }[] | undefined;
      const matching = breakpoints?.find(item => variants?.[item.hash] && matchMedia(item.mediaQuery).matches);
      const appearance = (matching ? variants?.[matching.hash] : undefined) ?? variants?.default;
      const initial = { opacity: initialStyle.opacity || 0, transform: initialStyle.transform || 'translateY(30px)', filter: initialStyle.filter || 'none' };
      const target = appearance ? frame(appearance.animate) : { opacity: 1, transform: 'none' };
      target.filter = 'none';
      const transition = appearance?.animate.transition;
      prepared.set(element, {
        frames: [initial, target],
        options: {
          duration: (transition?.duration ?? 0.8) * 1000,
          delay: Math.min(transition?.delay ?? 0, 1.5) * 1000,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'both',
        },
      });
      // Visibility does not affect document flow; responsive hidden variants
      // can still be observed when a visitor resizes the window.
      element.style.opacity = '0';
      observer.observe(element);
    });

    // Original floating illustrations: retain their author-defined displacement,
    // duration and bezier curve; animate the individual translate property so
    // centered transforms and entry animations can run independently.
    const loopObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const animation = loopAnimations.get(entry.target);
        if (entry.isIntersecting) animation?.play(); else animation?.pause();
      });
    });
    const loopAnimations = new Map<Element, Animation>();
    if (!reduced.matches) Object.entries(loops).forEach(([classname, config]) => {
      root.querySelectorAll<HTMLElement>(`.${classname}`).forEach(element => {
        const target = config.target as MotionValues;
        const transition = config.transition as { duration?: number; ease?: number[]; delay?: number };
        if (!target.x && !target.y && !target.rotate && (target.scale === undefined || target.scale === 1)) return;
        const animation = element.animate([
          { translate: '0px 0px', scale: '1', rotate: '0deg' },
          { translate: `${target.x || 0}px ${target.y || 0}px`, scale: String(target.scale ?? 1), rotate: `${target.rotate || 0}deg` },
        ], { duration: (transition.duration || 2.8) * 1000, delay: (transition.delay || 0) * 1000,
          iterations: Infinity, direction: 'alternate', easing: transition.ease ? `cubic-bezier(${transition.ease.join(',')})` : 'ease-in-out' });
        animation.pause();
        playing.push(animation);
        loopAnimations.set(element, animation);
        loopObserver.observe(element);
      });
    });

    const explore = (event: Event) => {
      const target = (event.target as HTMLElement).closest('[data-nex-explore]');
      if (!target) return;
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      document.getElementById('product')?.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth' });
    };
    root.addEventListener('click', explore);
    root.addEventListener('keydown', explore);
    const header = root.querySelector<HTMLElement>('[class*="framer-6r59am-container"]');
    const scroll = () => header?.classList.toggle('nex-header-scrolled', window.scrollY > 30);
    window.addEventListener('scroll', scroll, { passive: true });
    scroll();
    return () => {
      observer.disconnect();
      loopObserver.disconnect();
      playing.forEach(animation => animation.cancel());
      root.querySelectorAll<HTMLElement>('[data-nex-reveal]').forEach(element => { element.style.opacity = ''; });
      root.removeEventListener('click', explore);
      root.removeEventListener('keydown', explore);
      window.removeEventListener('scroll', scroll);
    };
  }, [animations, pageKey]);
  return null;
}
