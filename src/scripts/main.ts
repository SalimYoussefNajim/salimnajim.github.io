const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
const menu = document.querySelector<HTMLDialogElement>('#mobile-menu');
const close = document.querySelector<HTMLButtonElement>('.menu-close');
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
