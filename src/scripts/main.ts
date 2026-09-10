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
export {};
