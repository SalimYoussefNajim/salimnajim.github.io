const views = [
  { slug: 'assembled', name: 'Assembled', alt: 'Studio rendering of an assembled propulsion concept, with a silver fan and layered engine housing.' },
  { slug: 'exploded', name: 'Exploded', alt: 'The same propulsion concept separated along its axis, revealing the fan, compressor stages and rear assembly.' },
  { slug: 'cutaway', name: 'Cutaway', alt: 'A cutaway of the propulsion concept exposes its internal shaft and layered compressor stages.' },
] as const;

/** Decoded studio images keep the study independent of the visitor's GPU. */
export function mountProductStudy(host: HTMLElement): () => void {
  const frame = host.querySelector<HTMLElement>('[data-product-frame]');
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('[data-product-view]')];
  const status = host.querySelector<HTMLElement>('[data-product-status]');
  const viewLabel = host.querySelector<HTMLElement>('[data-product-view-label]');
  let currentLayer = frame?.querySelector<HTMLElement>('.is-active');
  const initialImage = currentLayer?.querySelector<HTMLImageElement>('img');
  if (!frame || !currentLayer || !initialImage || buttons.length !== views.length) return () => {};

  const aborter = new AbortController();
  const { signal } = aborter;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const images = new Map<number, Promise<HTMLImageElement>>();
  const removalTimers = new Set<ReturnType<typeof setTimeout>>();
  let activeView = Number(host.dataset.productActive) || 0;
  let requestedView = activeView;
  let request = 0;
  let disposed = false;
  let near = false;
  let manual = host.dataset.productManual === 'true';
  let hasScrolled = false;
  let scrollFrame = 0;
  let transitionFrame = 0;
  let pendingLayer: HTMLElement | undefined;
  let preloaded = false;
  let firstImageReady = initialImage.complete && initialImage.naturalWidth > 0;
  const sizes = initialImage.sizes || '(max-width: 800px) calc(100vw - 40px), 55vw';

  function setBusy(index = -1): void {
    buttons.forEach((button, position) => {
      if (position === index) button.setAttribute('aria-busy', 'true');
      else button.removeAttribute('aria-busy');
    });
  }
  function announce(message: string, error = false): void {
    if (!status) return;
    status.textContent = message;
    status.dataset.error = String(error);
  }
  function hasCurrentImage(): boolean {
    const image = currentLayer?.querySelector<HTMLImageElement>('img');
    return Boolean(image?.complete && image.naturalWidth > 0);
  }
  function loadImage(index: number): Promise<HTMLImageElement> {
    const cached = images.get(index);
    if (cached) return cached;
    const view = views[index];
    const image = new Image();
    image.width = 1280;
    image.height = 853;
    image.alt = view.alt;
    image.decoding = 'async';
    image.sizes = sizes;
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.addEventListener('load', () => {
        const decoded = typeof image.decode === 'function' ? image.decode() : Promise.resolve();
        void decoded.then(() => {
          if (image.naturalWidth > 0) resolve(image);
          else reject(new Error('Image has no decoded pixels.'));
        }, reject);
      }, { once: true });
      image.addEventListener('error', () => reject(new Error('Image request failed.')), { once: true });
      image.srcset = `/images/propulsion-${view.slug}-640.webp 640w, /images/propulsion-${view.slug}-1280.webp 1280w`;
      image.src = `/images/propulsion-${view.slug}-1280.webp`;
    });
    images.set(index, loaded);
    void loaded.catch(() => { if (images.get(index) === loaded) images.delete(index); });
    return loaded;
  }
  function preload(): void {
    if (disposed || preloaded || !near || !firstImageReady) return;
    preloaded = true;
    void Promise.allSettled([loadImage(1), loadImage(2)]);
  }
  function clearPending(): void {
    cancelAnimationFrame(transitionFrame);
    transitionFrame = 0;
    pendingLayer?.remove();
    pendingLayer = undefined;
  }
  async function showView(index: number, userInitiated = false): Promise<void> {
    if (disposed || !views[index]) return;
    if (userInitiated) {
      manual = true;
      host.dataset.productManual = 'true';
    }
    if (index === requestedView && index !== activeView) return;
    const generation = ++request;
    requestedView = index;
    clearPending();
    setBusy();
    if (index === activeView && hasCurrentImage()) {
      if (userInitiated) announce(`${views[index].name} view shown.`);
      return;
    }
    setBusy(index);
    if (userInitiated) announce(`Loading ${views[index].name.toLowerCase()} view.`);
    try {
      const image = await loadImage(index);
      if (disposed || generation !== request) return;
      const layer = document.createElement('picture');
      layer.className = 'product-study__image';
      layer.dataset.productLayer = String(index);
      // An image may be revisited during an earlier fade. Clone it so the visible
      // layer keeps its own decoded element until the replacement is committed.
      const nextImage = image.cloneNode() as HTMLImageElement;
      if (typeof nextImage.decode === 'function') await nextImage.decode();
      if (disposed || generation !== request) return;
      layer.appendChild(nextImage);
      frame!.appendChild(layer);
      pendingLayer = layer;
      const commit = () => {
        transitionFrame = 0;
        if (disposed || generation !== request) { layer.remove(); return; }
        const previous = currentLayer;
        layer.classList.add('is-active');
        previous?.classList.remove('is-active');
        currentLayer = layer;
        pendingLayer = undefined;
        activeView = index;
        host.dataset.productActive = String(index);
        buttons.forEach((button, position) => button.setAttribute('aria-pressed', String(position === index)));
        if (viewLabel) viewLabel.textContent = `0${index + 1} / ${views[index].name}`;
        setBusy();
        announce(userInitiated ? `${views[index].name} view shown.` : '');
        if (reduced.matches) previous?.remove();
        else {
          const timer = setTimeout(() => { previous?.remove(); removalTimers.delete(timer); }, 280);
          removalTimers.add(timer);
        }
      };
      if (reduced.matches) commit();
      else transitionFrame = requestAnimationFrame(commit);
    } catch {
      if (disposed || generation !== request) return;
      requestedView = activeView;
      setBusy();
      announce(hasCurrentImage()
        ? `This view could not load. The ${views[activeView].name.toLowerCase()} view remains visible.`
        : 'This view could not load. Please try another view.', true);
    }
  }
  function updateFromScroll(): void {
    scrollFrame = 0;
    if (disposed || manual || reduced.matches || !near || !hasScrolled || document.hidden) return;
    const bounds = frame!.getBoundingClientRect();
    if (bounds.height <= 0 || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
    const progress = Math.min(1, Math.max(0, (100 - bounds.top) / (bounds.height * 0.85)));
    const index = Math.min(2, Math.floor(progress * 3));
    if (index !== requestedView) void showView(index);
  }
  function queueScroll(): void {
    if (!disposed && near && !manual && !reduced.matches && !document.hidden && !scrollFrame) scrollFrame = requestAnimationFrame(updateFromScroll);
  }
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
    near = Boolean(entry?.isIntersecting);
    if (near) { preload(); if (hasScrolled) queueScroll(); }
  }, { rootMargin: '160px', threshold: 0 });
  observer?.observe(frame);
  if (!observer) {
    const bounds = frame.getBoundingClientRect();
    near = bounds.top < window.innerHeight + 160 && bounds.bottom > -160;
    preload();
  }
  initialImage.addEventListener('load', () => { firstImageReady = initialImage.naturalWidth > 0; preload(); }, { once: true, signal });
  initialImage.addEventListener('error', () => announce('The study image could not load. Please try another view.', true), { once: true, signal });
  if (initialImage.complete && initialImage.naturalWidth === 0) {
    announce('The study image could not load. Please try another view.', true);
  }
  buttons.forEach((button, index) => {
    button.disabled = false;
    button.addEventListener('click', () => { void showView(index, true); }, { signal });
    button.addEventListener('keydown', (event) => {
      const next = event.key === 'ArrowRight' ? (index + 1) % views.length
        : event.key === 'ArrowLeft' ? (index + views.length - 1) % views.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      buttons[next].focus();
      void showView(next, true);
    }, { signal });
  });
  window.addEventListener('scroll', () => {
    hasScrolled = true;
    if (!observer) {
      const bounds = frame!.getBoundingClientRect();
      near = bounds.top < window.innerHeight + 160 && bounds.bottom > -160;
      preload();
    }
    queueScroll();
  }, { passive: true, signal });
  window.addEventListener('resize', () => { if (hasScrolled) queueScroll(); }, { passive: true, signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(scrollFrame); scrollFrame = 0; }
    else if (hasScrolled) queueScroll();
  }, { signal });
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    if (reduced.matches && !manual) {
      request++;
      requestedView = activeView;
      clearPending();
      setBusy();
    }
    if (!reduced.matches && hasScrolled) queueScroll();
  }, { signal });

  return () => {
    if (disposed) return;
    disposed = true;
    request++;
    aborter.abort();
    observer?.disconnect();
    cancelAnimationFrame(scrollFrame);
    clearPending();
    removalTimers.forEach((timer) => clearTimeout(timer));
    frame.querySelectorAll<HTMLElement>('[data-product-layer]').forEach((layer) => { if (layer !== currentLayer) layer.remove(); });
    setBusy();
  };
}
