const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
const menu = document.querySelector<HTMLDialogElement>('#mobile-menu');
const close = document.querySelector<HTMLButtonElement>('.menu-close');
if (toggle && menu && typeof menu.showModal === 'function') {
  toggle.hidden = false;
  document.querySelector<HTMLElement>('.fallback-menu')?.setAttribute('hidden', '');
}
const closeMenu = (restoreFocus = true) => { menu?.close(); toggle?.setAttribute('aria-expanded','false'); document.body.classList.remove('menu-open'); if (restoreFocus) toggle?.focus(); };
toggle?.addEventListener('click', () => { menu?.showModal(); toggle.setAttribute('aria-expanded','true'); document.body.classList.add('menu-open'); });
close?.addEventListener('click', () => closeMenu());
menu?.addEventListener('cancel', (event) => { event.preventDefault(); closeMenu(); });
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu(false)));
window.matchMedia('(max-width: 800px)').addEventListener('change', ({ matches }) => {
  if (!matches && menu?.open) {
    closeMenu(false);
    document.querySelector<HTMLAnchorElement>('.site-header .brand')?.focus();
  }
});
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reduced.matches && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
  }), { threshold: 0.08 });
  document.querySelectorAll<HTMLElement>('.reveal').forEach(el => { el.classList.add('will-reveal'); reveal.observe(el); });
  reduced.addEventListener('change', ({ matches }) => {
    if (matches) {
      reveal.disconnect();
      document.querySelectorAll('.will-reveal').forEach(el => el.classList.add('is-visible'));
    }
  });
}
const steps = document.querySelectorAll<HTMLButtonElement>('[data-energy-step]');
document.querySelectorAll<HTMLElement>('[data-energy-detail]').forEach(panel => { panel.hidden = panel.dataset.energyDetail !== '0'; });
steps.forEach(step => { step.disabled = false; });
steps.forEach(step => step.addEventListener('click', () => {
  const id = step.dataset.energyStep;
  steps.forEach(button => button.setAttribute('aria-pressed', String(button === step)));
  document.querySelectorAll<HTMLElement>('[data-energy-detail]').forEach(panel => { panel.hidden = panel.dataset.energyDetail !== id; });
}));
steps.forEach((step, index) => step.addEventListener('keydown', (event) => {
  const positions: Record<string, number> = {
    ArrowRight: (index + 1) % steps.length,
    ArrowDown: (index + 1) % steps.length,
    ArrowLeft: (index - 1 + steps.length) % steps.length,
    ArrowUp: (index - 1 + steps.length) % steps.length,
    Home: 0,
    End: steps.length - 1
  };
  const position = positions[event.key];
  if (position === undefined) return;
  event.preventDefault();
  steps[position]?.focus();
  steps[position]?.click();
}));
export {};

// Chapter copy follows the document scroll even when 3D is unavailable.
const story = document.querySelector<HTMLElement>('[data-experience]');
const storyStage = story?.querySelector<HTMLElement>('[data-experience-stage]');
if (story && storyStage) {
  const panels = [...story.querySelectorAll<HTMLElement>('[data-chapter-copy]')];
  const chapterButtons = [...story.querySelectorAll<HTMLButtonElement>('[data-chapter-target]')];
  const shortScreen = window.matchMedia('(max-height: 560px)');
  let queued = 0;
  let enabled = false;
  let activeChapter = -1;
  const setChapter = (chapter: number) => {
    if (chapter === activeChapter) return;
    activeChapter = chapter;
    story.dataset.chapter = String(chapter);
    panels.forEach((panel, index) => {
      panel.inert = enabled && index !== chapter;
      if (enabled && index !== chapter) panel.setAttribute('aria-hidden', 'true');
      else panel.removeAttribute('aria-hidden');
    });
    chapterButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === chapter)));
  };
  const updateStory = () => {
    queued = 0;
    if (!enabled) return;
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, rect.height - storyStage.clientHeight);
    const progress = Math.min(1, Math.max(0, (72 - rect.top) / distance));
    setChapter(Math.min(2, Math.floor(progress * 3)));
  };
  const queueStory = () => {
    if (enabled && !queued && !document.hidden) queued = requestAnimationFrame(updateStory);
  };
  const configureStory = () => {
    enabled = !reduced.matches && !shortScreen.matches;
    story.classList.toggle('is-enhanced', enabled);
    activeChapter = -1;
    if (enabled) updateStory();
    else setChapter(0);
  };
  chapterButtons.forEach((button, index) => button.addEventListener('click', () => {
    if (!enabled) return;
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, rect.height - storyStage.clientHeight);
    const progress = [0, 0.5, 0.94][index] ?? 0;
    window.scrollTo({ top: window.scrollY + rect.top - 72 + distance * progress, behavior: 'smooth' });
  }));
  window.addEventListener('scroll', queueStory, { passive: true });
  window.addEventListener('resize', queueStory, { passive: true });
  window.addEventListener('pageshow', configureStory);
  reduced.addEventListener('change', configureStory);
  shortScreen.addEventListener('change', configureStory);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queueStory(); });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(queued); queued = 0; });
  configureStory();
}
