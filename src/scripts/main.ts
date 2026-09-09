const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
const menu = document.querySelector<HTMLDialogElement>('#mobile-menu');
const close = document.querySelector<HTMLButtonElement>('.menu-close');
const closeMenu = () => { menu?.close(); toggle?.setAttribute('aria-expanded','false'); document.body.classList.remove('menu-open'); toggle?.focus(); };
toggle?.addEventListener('click', () => { menu?.showModal(); toggle.setAttribute('aria-expanded','true'); document.body.classList.add('menu-open'); });
close?.addEventListener('click', closeMenu);
menu?.addEventListener('cancel', (event) => { event.preventDefault(); closeMenu(); });
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reduced.matches && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
  }), { threshold: 0.08 });
  document.querySelectorAll<HTMLElement>('.reveal').forEach(el => { el.classList.add('will-reveal'); reveal.observe(el); });
}
const steps = document.querySelectorAll<HTMLButtonElement>('[data-energy-step]');
document.querySelectorAll<HTMLElement>('[data-energy-detail]').forEach(panel => { panel.hidden = panel.dataset.energyDetail !== '0'; });
steps.forEach(step => { step.disabled = false; });
steps.forEach(step => step.addEventListener('click', () => {
  const id = step.dataset.energyStep;
  steps.forEach(button => button.setAttribute('aria-pressed', String(button === step)));
  document.querySelectorAll<HTMLElement>('[data-energy-detail]').forEach(panel => { panel.hidden = panel.dataset.energyDetail !== id; });
}));
export {};
