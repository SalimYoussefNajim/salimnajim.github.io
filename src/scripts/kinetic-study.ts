const FRAME_COUNT = 36;
// Six retained images plus at most four active decodes bound this component's
// live image references to ten. The browser manages its own resource cache.
const CACHE_LIMIT = 6;
const REQUEST_LIMIT = 4;
type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
type Load = { image: HTMLImageElement; started: boolean; cancel: () => void };

/** Event-driven image sequence: no WebGL, timer, idle render loop or full-sequence preload. */
export function mountKineticStudy(host: HTMLElement): () => void {
  const frame = host.querySelector<HTMLElement>('[data-kinetic-frame]');
  const range = host.querySelector<HTMLInputElement>('[data-kinetic-range]');
  const controls = host.querySelector<HTMLElement>('[data-kinetic-controls]');
  const status = host.querySelector<HTMLElement>('[data-kinetic-status]');
  let visibleImage = frame?.querySelector<HTMLImageElement>('[data-kinetic-image]');
  if (!frame || !range || !visibleImage) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const desktopStory = window.matchMedia('(min-width: 1100px) and (min-height: 740px)');
  const story = host.closest<HTMLElement>('[data-kinetic-story]');
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  const constrained = () => Boolean(connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType || ''));
  const aborter = new AbortController();
  const { signal } = aborter;
  const cache = new Map<number, HTMLImageElement>();
  const loads = new Map<number, Load>();
  let queue: number[] = [];
  let running = 0;
  let disposed = false;
  let near = false;
  let raf = 0;
  let hasScrolled = false;
  let active = Math.min(FRAME_COUNT - 1, Math.max(0, Number(host.dataset.kineticActive) || 0));
  let desired = active;
  let manual = host.dataset.kineticManual === 'true';
  let lastDirection = 1;
  let pointer: { id: number; x: number; y: number; start: number; dragging: boolean } | undefined;

  function syncStory(): void {
    if (!story) return;
    if (!disposed && desktopStory.matches && !reduced.matches && !constrained()) story.dataset.kineticEnhanced = 'true';
    else delete story.dataset.kineticEnhanced;
  }
  syncStory();

  function announce(message = '', error = false): void {
    if (!status) return;
    status.textContent = message;
    status.dataset.error = String(error);
  }
  function syncRange(index: number): void {
    range!.value = String(index);
    range!.setAttribute('aria-valuetext', `View ${index + 1} of ${FRAME_COUNT}`);
  }
  function trimCache(): void {
    for (const [index] of cache) {
      if (cache.size <= CACHE_LIMIT) break;
      if (index !== active && index !== desired) cache.delete(index);
    }
  }
  function remember(index: number, image: HTMLImageElement): void {
    cache.delete(index);
    cache.set(index, image);
    trimCache();
  }
  function commit(index: number, image: HTMLImageElement): void {
    if (disposed || index !== desired || !near || document.hidden) return;
    if (image !== visibleImage) {
      frame!.appendChild(image);
      visibleImage?.remove();
      visibleImage = image;
    }
    active = index;
    host.dataset.kineticActive = String(index);
    frame!.removeAttribute('aria-busy');
    syncRange(index);
    announce();
    remember(index, image);
  }
  function forgetQueued(): void {
    queue.forEach((index) => loads.delete(index));
    queue = [];
  }
  function enqueue(index: number, priority = false): void {
    if (index < 0 || index >= FRAME_COUNT || cache.has(index)) return;
    if (!loads.has(index)) {
      const image = new Image();
      image.width = mobile ? 480 : 900;
      image.height = image.width;
      image.alt = visibleImage!.alt;
      image.className = 'kinetic-study__image';
      image.dataset.kineticImage = '';
      image.decoding = 'async';
      image.draggable = false;
      loads.set(index, { image, started: false, cancel: () => {} });
      queue.push(index);
    }
    if (priority && queue.includes(index)) queue = [index, ...queue.filter((item) => item !== index)];
  }
  function neighbors(): void {
    if (reduced.matches || constrained() || !near || document.hidden) return;
    // Only a small window around the requested frame is speculative work.
    [lastDirection, lastDirection * 2, -lastDirection].forEach((offset) => enqueue(desired + offset));
  }
  function pump(): void {
    if (disposed || !near || document.hidden) return;
    while (running < REQUEST_LIMIT && queue.length > 0) {
      const index = queue.shift()!;
      const job = loads.get(index);
      if (!job) continue;
      job.started = true;
      running++;
      let finished = false;
      const complete = (success: boolean): void => {
        if (finished) return;
        finished = true;
        job.image.removeEventListener('load', onLoad);
        job.image.removeEventListener('error', onError);
        loads.delete(index);
        running--;
        if (disposed) return;
        if (success) {
          remember(index, job.image);
          commit(index, job.image);
        } else if (index === desired) {
          desired = active;
          syncRange(active);
          frame!.removeAttribute('aria-busy');
          announce('This view could not load. The current view remains in place. Try rotating again.', true);
        }
        pump();
      };
      const onError = () => complete(false);
      const onLoad = () => {
        const decoded = typeof job.image.decode === 'function' ? job.image.decode() : Promise.resolve();
        void decoded.then(() => complete(job.image.naturalWidth > 0), onError);
      };
      job.cancel = () => {
        complete(false);
        job.image.removeAttribute('src');
      };
      job.image.addEventListener('load', onLoad, { once: true });
      job.image.addEventListener('error', onError, { once: true });
      job.image.src = `/images/kinetic/${mobile ? 'mobile' : 'frame'}-${String(index).padStart(2, '0')}.webp`;
    }
  }
  function select(index: number, userInitiated = false): void {
    if (disposed || !Number.isFinite(index)) return;
    index = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(index)));
    if (userInitiated) {
      manual = true;
      host.dataset.kineticManual = 'true';
    }
    lastDirection = index >= desired ? 1 : -1;
    desired = index;
    syncRange(index);
    forgetQueued();
    const ready = cache.get(index);
    if (ready) commit(index, ready);
    else if (index !== active || !visibleImage?.naturalWidth) {
      frame!.setAttribute('aria-busy', 'true');
      enqueue(index, true);
    } else frame!.removeAttribute('aria-busy');
    neighbors();
    pump();
  }
  function updateFromScroll(): void {
    raf = 0;
    if (disposed || manual || reduced.matches || constrained() || !near || document.hidden || !hasScrolled) return;
    const bounds = frame!.getBoundingClientRect();
    if (bounds.height <= 0 || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
    let start: number;
    let end: number;
    if (story?.dataset.kineticEnhanced === 'true') {
      // Measure the normal-flow wrapper, not the moving sticky child. This keeps
      // the complete sequence aligned with the interval the object stays in view.
      const storyBounds = story.getBoundingClientRect();
      const headerHeight = document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect().height || 78;
      start = window.scrollY + storyBounds.top - headerHeight;
      end = start + storyBounds.height - window.innerHeight + headerHeight;
    } else {
      const top = window.scrollY + bounds.top;
      start = Math.max(0, top - window.innerHeight * 0.65);
      end = top + bounds.height * 0.4;
    }
    const progress = Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start)));
    const index = Math.round(progress * (FRAME_COUNT - 1));
    if (index !== desired) select(index);
  }
  function queueScroll(): void {
    if (!raf && near && !disposed && !manual && !reduced.matches && !constrained() && !document.hidden) raf = requestAnimationFrame(updateFromScroll);
  }
  function setVisible(isVisible: boolean): void {
    near = isVisible;
    if (!near) {
      cancelAnimationFrame(raf);
      raf = 0;
      forgetQueued();
      return;
    }
    if (cache.has(desired)) commit(desired, cache.get(desired)!);
    else if (desired !== active) enqueue(desired, true);
    neighbors();
    pump();
  }
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
    setVisible(Boolean(entry?.isIntersecting));
  }, { threshold: 0 });
  observer?.observe(frame);
  function checkVisibility(): void {
    const bounds = frame!.getBoundingClientRect();
    setVisible(bounds.bottom > 0 && bounds.top < window.innerHeight);
  }
  if (!observer) checkVisibility();

  if (visibleImage.complete && visibleImage.naturalWidth > 0) remember(active, visibleImage);
  visibleImage.addEventListener('load', (event) => {
    const image = event.currentTarget as HTMLImageElement;
    if (visibleImage === image && image.naturalWidth > 0) remember(active, image);
  }, { once: true, signal });
  visibleImage.addEventListener('error', (event) => {
    if (visibleImage === event.currentTarget) announce('The study image could not load. Use the rotation control to try another view.', true);
  }, { once: true, signal });
  if (visibleImage.complete && !visibleImage.naturalWidth) announce('The study image could not load. Use the rotation control to try another view.', true);
  controls?.removeAttribute('hidden');
  syncRange(active);
  range.addEventListener('input', () => select(Number(range.value), true), { signal });

  frame.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, start: desired, dragging: false };
  }, { passive: true, signal });
  frame.addEventListener('pointermove', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { pointer = undefined; return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      pointer.dragging = true;
      frame!.dataset.dragging = 'true';
      try { frame!.setPointerCapture(event.pointerId); } catch { /* Pointer may have ended during native scroll. */ }
    }
    select(pointer.start + dx / Math.max(240, frame!.getBoundingClientRect().width) * (FRAME_COUNT - 1), true);
  }, { passive: true, signal });
  const releasePointer = () => {
    if (pointer && frame!.hasPointerCapture(pointer.id)) frame!.releasePointerCapture(pointer.id);
    pointer = undefined;
    delete frame!.dataset.dragging;
  };
  frame.addEventListener('pointerup', releasePointer, { signal });
  frame.addEventListener('pointercancel', releasePointer, { signal });
  window.addEventListener('pointerup', releasePointer, { signal });
  window.addEventListener('pointercancel', releasePointer, { signal });
  frame.addEventListener('pointerleave', () => { if (!pointer?.dragging) pointer = undefined; }, { signal });
  frame.addEventListener('lostpointercapture', () => { pointer = undefined; delete frame!.dataset.dragging; }, { signal });
  window.addEventListener('scroll', () => {
    hasScrolled = true;
    if (!observer) checkVisibility();
    queueScroll();
  }, { passive: true, signal });
  window.addEventListener('resize', () => {
    if (!observer) checkVisibility();
    if (hasScrolled) queueScroll();
  }, { passive: true, signal });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!document.hidden) setVisible(near);
    else forgetQueued();
  }, { signal });
  function preferencesChanged(): void {
    syncStory();
    cancelAnimationFrame(raf);
    raf = 0;
    if (!manual && (reduced.matches || constrained())) {
      desired = active;
      syncRange(active);
      frame!.removeAttribute('aria-busy');
    }
    forgetQueued();
    if (manual && (desired !== active || !visibleImage?.naturalWidth)) {
      enqueue(desired, true);
      pump();
    }
    if (!manual && !reduced.matches && !constrained() && hasScrolled) queueScroll();
  }
  reduced.addEventListener('change', preferencesChanged, { signal });
  desktopStory.addEventListener('change', preferencesChanged, { signal });
  connection?.addEventListener('change', preferencesChanged, { signal });

  return () => {
    if (disposed) return;
    disposed = true;
    syncStory();
    aborter.abort();
    observer?.disconnect();
    cancelAnimationFrame(raf);
    releasePointer();
    queue = [];
    [...loads.values()].forEach((job) => job.cancel());
    loads.clear();
    cache.clear();
    frame.removeAttribute('aria-busy');
    // The last valid image and manual preference stay in DOM for BFcache remount.
  };
}
