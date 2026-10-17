'use client';

import { useEffect } from 'react';

const desktopVariants = ['framer-v-16vo0c9', 'framer-v-1ikofib', 'framer-v-pgu32m'];
const tabletVariants = ['framer-v-tj0ynh', 'framer-v-6e0jup', 'framer-v-p5qm4u'];

/** The original architecture artwork is a three-position vertical strip.
 * Its exported HTML contains all three drawings; scroll must select the strip
 * position as well as update the connecting line and icon overlays.
 */
export function ArchitectureScroll() {
  useEffect(() => {
    const section = document.getElementById('product');
    if (!section) return;
    const rows = ['timeline1', 'timeline2', 'timeline3'].map(id => section.querySelector<HTMLElement>(`#${id}`));
    if (rows.some(row => !row)) return;
    const steps = rows as HTMLElement[];
    const artwork = [...section.querySelectorAll<HTMLElement>('.framer-kKgAQ, .framer-FgFaD')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const transitions = new Map<HTMLElement, Animation>();
    const layerEntries = new Map<HTMLElement, string>();
    artwork.forEach(panel => {
      panel.querySelectorAll<HTMLElement>('[data-framer-name]').forEach(layer => {
        // Framer exports the collapsed entry pose even when opacity is already
        // 1. Those layers still need to unfold to y=0 once their drawing enters.
        const initial = layer.dataset.nexLayerInitial || layer.style.transform;
        if (/^layer \d+$/i.test(layer.dataset.framerName || '') && layer.style.willChange.includes('transform') && initial && initial !== 'none' && !initial.includes('%')) {
          layer.dataset.nexLayerInitial = initial;
          layerEntries.set(layer, initial);
          layer.style.transform = 'none';
        }
      });
    });
    let active = -1;
    let requestedFrame = 0;
    let disposed = false;

    section.dataset.nexArchitecture = '';

    function selectStage(index: number) {
      if (index === active) return;
      for (const panel of artwork) {
        const tablet = panel.classList.contains('framer-FgFaD');
        const variants = tablet ? tabletVariants : desktopVariants;
        const strip = panel.querySelector<HTMLElement>(tablet ? '.framer-14i66z2' : '.framer-66biz4');
        const drawings = strip ? [...strip.children] as HTMLElement[] : [];
        const previousPositions = drawings.map(drawing => drawing.getBoundingClientRect().top);
        panel.classList.remove(...variants);
        panel.classList.add(variants[index]);
        panel.dataset.framerName = `${tablet ? 'Tablet' : 'Desktop'} ${index + 1}`;
        panel.dataset.nexStage = String(index + 1);
        const nextPositions = drawings.map(drawing => drawing.getBoundingClientRect().top);
        drawings.forEach((drawing, i) => {
          transitions.get(drawing)?.cancel();
          drawing.setAttribute('aria-hidden', String(i !== index));
          const delta = previousPositions[i] - nextPositions[i];
          if (active >= 0 && delta && panel.getBoundingClientRect().width && !reduced.matches) {
            const transition = drawing.animate([
              { transform: `translateY(${delta}px)` },
              { transform: 'translateY(0)' },
            ], { duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)' });
            transitions.set(drawing, transition);
          }
        });
        if (!reduced.matches && panel.getBoundingClientRect().width) {
          layerEntries.forEach((initial, layer) => {
            if (!drawings[index]?.contains(layer)) return;
            transitions.get(layer)?.cancel();
            transitions.set(layer, layer.animate([
              { transform: initial }, { transform: 'none' },
            ], { duration: 900, easing: 'cubic-bezier(.16, 1, .3, 1)' }));
          });
        }
      }
      active = index;
      section!.dataset.nexStage = String(index + 1);
    }

    function update() {
      requestedFrame = 0;
      const threshold = window.innerHeight * 0.5;
      let stage = 0;
      steps.forEach((row, index) => {
        const icon = row.querySelector<HTMLElement>('[data-framer-name="Icon"]');
        const iconRect = icon?.getBoundingClientRect();
        const reached = (iconRect ? iconRect.top + iconRect.height / 2 : row.getBoundingClientRect().top) <= threshold;
        row.dataset.nexReached = String(reached);
        if (reached) stage = index;
        const bar = row.querySelector<HTMLElement>('[data-framer-name="Progress bar"]');
        const fill = bar?.querySelector<HTMLElement>('[data-framer-name="Fill"]');
        if (bar && fill) {
          const rect = bar.getBoundingClientRect();
          const progress = Math.max(0, Math.min(1, (threshold - rect.top) / Math.max(rect.height, 1)));
          fill.style.transform = `scaleY(${progress})`;
          fill.style.transformOrigin = 'top';
          fill.style.opacity = '1';
          bar.dataset.nexProgress = progress.toFixed(3);
        }
      });
      selectStage(stage);
    }

    function schedule() {
      if (!disposed && !requestedFrame) requestedFrame = requestAnimationFrame(update);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(section);
    steps.forEach(row => resize.observe(row));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.fonts.ready.then(schedule);
    update();
    return () => {
      disposed = true;
      cancelAnimationFrame(requestedFrame);
      resize.disconnect();
      transitions.forEach(animation => animation.cancel());
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return null;
}
