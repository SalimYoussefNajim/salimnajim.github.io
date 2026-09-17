import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const repo = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(repo, 'package.json'));
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(repo, 'src/scripts/kinetic-study.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function fixture({ reduced = false, saveData = false, mobile = false, observers = true, validPoster = true, sticky = false, largeViewport = true } = {}) {
  const requested = [];
  const raf = new Map();
  const observerList = [];
  let frameId = 0;
  class Element extends EventTarget {
    constructor(tag = 'div') { super(); this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {}; this.textContent = ''; this.value = '0'; this.hidden = false; this.captured = new Set(); }
    appendChild(child) { child.remove(); this.children.push(child); child.parent = this; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); this.parent = undefined; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    removeAttribute(name) { delete this.attributes[name]; if (name === 'hidden') this.hidden = false; }
    querySelector(selector) { return this.children.find((child) => child.selector === selector) || this.children.map((child) => child.querySelector(selector)).find(Boolean) || null; }
    closest(selector) { return this.selector === selector ? this : this.parent?.closest(selector) || null; }
    getBoundingClientRect() { return this.rect || { top: 100, bottom: 600, height: 500, width: 500 }; }
    setPointerCapture(id) { this.captured.add(id); }
    hasPointerCapture(id) { return this.captured.has(id); }
    releasePointerCapture(id) { this.captured.delete(id); }
  }
  class MockImage extends Element {
    constructor(track = true) { super('img'); this.complete = false; this.naturalWidth = 0; this.decodingReady = deferred(); this.track = track; }
    set src(value) { this.url = value; if (this.track) requested.push(this); }
    get src() { return this.url; }
    removeAttribute(name) { super.removeAttribute(name); if (name === 'src') this.url = ''; }
    load() { this.complete = true; this.naturalWidth = 900; this.dispatchEvent(new Event('load')); }
    fail() { this.complete = true; this.dispatchEvent(new Event('error')); }
    decode() { return this.decodingReady.promise; }
  }
  const host = new Element('figure'); host.dataset.kineticActive = '0';
  const story = sticky ? new Element() : null;
  if (story) { story.selector = '[data-kinetic-story]'; story.appendChild(host); }
  const frame = new Element(); frame.selector = '[data-kinetic-frame]'; host.appendChild(frame);
  const poster = new MockImage(false); poster.selector = '[data-kinetic-image]'; poster.complete = true; poster.naturalWidth = validPoster ? 640 : 0; poster.alt = 'Kinetic sculpture'; frame.appendChild(poster);
  const range = new Element('input'); range.selector = '[data-kinetic-range]'; host.appendChild(range);
  const controls = new Element(); controls.selector = '[data-kinetic-controls]'; controls.hidden = true; host.appendChild(controls);
  const status = new Element(); status.selector = '[data-kinetic-status]'; host.appendChild(status);
  const media = new EventTarget(); media.matches = reduced;
  const desktopMedia = new EventTarget(); desktopMedia.matches = largeViewport;
  const connection = new EventTarget(); connection.saveData = saveData;
  const window = new EventTarget(); window.innerHeight = 900; window.scrollY = 0;
  window.matchMedia = (query) => query.includes('max-width') ? { matches: mobile } : query.includes('min-width') ? desktopMedia : media;
  frame.getBoundingClientRect = () => frame.rect || (story?.dataset.kineticEnhanced === 'true'
    ? { top: 140, bottom: 760, height: 620, width: 620 }
    : { top: 100 - window.scrollY, bottom: 600 - window.scrollY, height: 500, width: 500 });
  if (story) story.getBoundingClientRect = () => ({ top: 78 - window.scrollY, bottom: 1518 - window.scrollY, height: 1440, width: 1280 });
  const document = new EventTarget(); document.hidden = false;
  const header = new Element(); header.rect = { top: 0, bottom: 78, height: 78, width: 1280 };
  document.querySelector = (selector) => selector === '.site-header' ? header : null;
  class Observer {
    constructor(callback) { this.callback = callback; observerList.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    trigger(visible) { if (!this.disconnected) this.callback([{ isIntersecting: visible }]); }
  }
  const exports = {};
  vm.runInNewContext(compiled, { exports, window, document, navigator: { connection }, Image: MockImage, AbortController,
    IntersectionObserver: observers ? Observer : undefined,
    requestAnimationFrame: (callback) => { const id = ++frameId; raf.set(id, callback); return id; },
    cancelAnimationFrame: (id) => raf.delete(id),
  });
  let dispose = exports.mountKineticStudy(host);
  async function settle() {
    for (let i = 0; i < 6; i++) await Promise.resolve();
    const callbacks = [...raf.values()]; raf.clear(); callbacks.forEach((callback) => callback());
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }
  const find = (index) => requested.findLast((image) => image.src?.endsWith(`-${String(index).padStart(2, '0')}.webp`));
  async function resolve(index) {
    const image = find(index); assert.ok(image, `Frame ${index} requested`);
    image.load(); image.decodingReady.resolve(); await settle();
  }
  function event(target, type, data) {
    const value = new Event(type, { cancelable: true });
    Object.entries(data || {}).forEach(([key, item]) => Object.defineProperty(value, key, { value: item }));
    target.dispatchEvent(value); return value;
  }
  return { host, frame, poster, range, controls, status, requested, find, resolve, settle, media, desktopMedia, story, connection, window, document, raf, observerList,
    visible: (value = true) => observerList.forEach((observer) => observer.trigger(value)),
    input: (index) => { range.value = String(index); range.dispatchEvent(new Event('input')); },
    scroll: (position) => { window.scrollY = position; window.dispatchEvent(new Event('scroll')); },
    pointer: (type, data) => event(frame, type, { pointerId: 1, button: 0, isPrimary: true, clientX: 0, clientY: 0, ...data }),
    dispose: () => dispose(),
    remount: () => { dispose(); frame.children[0].selector = '[data-kinetic-image]'; dispose = exports.mountKineticStudy(host); },
  };
}

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }

{
  const f = fixture();
  check(!f.controls.hidden, 'Progressive enhancement reveals the native control');
  check(f.requested.length === 0, 'No sequence downloads until intersection');
  check(f.raf.size === 0, 'No idle animation loop');
  f.visible();
  check(f.requested.length === 2, 'Visibility warms only two adjacent frames at the start');
  check(f.host.dataset.kineticActive === '0', 'Intersection alone retains the poster');
  f.input(12);
  check(f.frame.children[0] === f.poster && f.range.value === '12', 'Current image remains visible while requested frame loads');
  f.find(12).load(); await f.settle();
  check(f.host.dataset.kineticActive === '0', 'Load event cannot replace image before decode');
  f.find(12).decodingReady.resolve(); await f.settle();
  check(f.host.dataset.kineticActive === '12', 'Decoded selected frame replaces the poster');
  check(f.frame.children.length === 1 && f.frame.children[0].naturalWidth > 0, 'Exactly one valid image remains in the frame');
  check(f.range.getAttribute('aria-valuetext') === 'View 13 of 36', 'Native range exposes understandable view number');
  f.scroll(100); await f.settle();
  check(f.host.dataset.kineticActive === '12' && f.raf.size === 0, 'Manual interaction stops automatic motion');
  f.dispose();
}
{
  const f = fixture({ saveData: true }); f.visible();
  f.input(7); f.input(18);
  await f.resolve(18); await f.resolve(7);
  check(f.host.dataset.kineticActive === '18', 'A stale slow response never replaces a newer selection');
  f.input(24); f.find(24).fail(); await f.settle();
  check(f.host.dataset.kineticActive === '18' && f.range.value === '18', 'Failed request retains the current frame and restores the control');
  check(f.status.dataset.error === 'true' && f.status.textContent.includes('Try rotating again'), 'Failure is recoverable and explained');
  f.input(24); await f.resolve(24);
  check(f.host.dataset.kineticActive === '24' && f.status.dataset.error === 'false', 'A failed frame can be retried');
  f.input(28); f.input(24); await f.resolve(28);
  check(f.host.dataset.kineticActive === '24', 'Returning to the current frame invalidates a pending replacement');
  f.dispose();
}
for (const preference of [{ reduced: true }, { saveData: true }]) {
  const f = fixture(preference); f.visible(); f.scroll(100); await f.settle();
  check(f.requested.length === 0 && f.raf.size === 0, 'Reduced motion or data saving has no speculative requests or automatic motion');
  f.input(35); await f.resolve(35);
  check(f.host.dataset.kineticActive === '35' && f.requested.length === 1, 'Explicit native control remains usable with preferences enabled');
  f.dispose();
}
{
  const f = fixture({ mobile: true, saveData: true }); f.visible(); f.input(5);
  check(f.find(5).src.endsWith('/mobile-05.webp') && f.find(5).width === 480, 'Phone layout requests the compact sequence');
  await f.resolve(5); f.remount(); f.visible(); f.scroll(100); await f.settle();
  check(f.host.dataset.kineticActive === '5' && f.range.value === '5' && f.host.dataset.kineticManual === 'true', 'BFcache remount preserves the current image and manual choice');
  f.dispose();
}
{
  const f = fixture(); f.visible(); f.scroll(150); await f.settle();
  const target = Number(f.range.value);
  check(target > 0 && f.host.dataset.kineticManual !== 'true', 'Scrolling visibly requests another frame without locking manual mode');
  f.media.matches = true; f.media.dispatchEvent(new Event('change'));
  await f.resolve(target);
  check(f.host.dataset.kineticActive === '0' && f.range.value === '0', 'Enabling reduced motion cancels an automatic pending selection');
  f.dispose();
}
{
  const f = fixture(); f.visible();
  for (let index = 4; index < 35; index++) f.input(index);
  check(f.requested.length === 4, 'Rapid dragging never exceeds four outstanding request/decode slots');
  await f.resolve(1);
  check(Boolean(f.find(34)), 'The newest request jumps ahead of obsolete queued work');
  check(!f.find(30), 'Superseded queued frames are not downloaded');
  f.visible(false); await f.resolve(34);
  check(f.host.dataset.kineticActive === '0', 'Offscreen completion cannot mutate the current visual');
  const count = f.requested.length; f.scroll(200); await f.settle();
  check(f.requested.length === count && f.raf.size === 0, 'Offscreen study starts no extra work');
  f.visible();
  check(f.host.dataset.kineticActive === '34', 'Returning to view commits the still-requested decoded image');
  f.dispose();
}
{
  const f = fixture({ saveData: true }); f.visible();
  for (let index = 1; index <= 14; index++) { f.input(index); await f.resolve(index); }
  const before = f.requested.length;
  f.input(13); await f.settle();
  check(f.requested.length === before && f.host.dataset.kineticActive === '13', 'Recently decoded frames are reused without another image');
  f.input(1);
  check(f.requested.length === before + 1, 'Distant old decoded images are evicted from the bounded cache');
  f.dispose();
}
{
  const f = fixture({ saveData: true }); f.visible();
  f.pointer('pointerdown'); f.pointer('pointermove', { clientX: 3, clientY: 30 });
  check(f.requested.length === 0 && f.host.dataset.kineticManual !== 'true', 'Vertical touch movement remains native and does not rotate');
  f.pointer('pointerdown'); const movement = f.pointer('pointermove', { clientX: 150, clientY: 2 });
  check(!movement.defaultPrevented && Number(f.range.value) > 0 && f.frame.captured.has(1), 'Horizontal intent rotates without preventing native scroll events');
  f.pointer('pointercancel');
  check(!f.frame.captured.has(1) && !f.frame.dataset.dragging, 'Pointer cancellation releases drag state');
  const count = f.requested.length;
  f.pointer('pointerdown'); f.pointer('pointerleave'); f.pointer('pointermove', { clientX: 200 });
  check(f.requested.length === count, 'A pointer that leaves before dragging cannot rotate later on hover');
  f.dispose();
}
{
  const f = fixture(); f.visible();
  f.input(6); f.input(19);
  f.connection.saveData = true; f.connection.dispatchEvent(new Event('change'));
  await f.resolve(1);
  check(Boolean(f.find(19)), 'Changing data preference keeps an explicit selection at the front of the queue');
  await f.resolve(19);
  check(f.host.dataset.kineticActive === '19', 'Explicit selection completes after a live preference change');
  f.dispose();
}
{
  const f = fixture({ saveData: true }); f.visible(); f.input(8);
  f.find(8).load(); f.find(8).decodingReady.reject(new Error('Invalid encoded image')); await f.settle();
  check(f.frame.children[0] === f.poster && f.status.dataset.error === 'true', 'A decode failure leaves the valid poster visible');
  f.input(9); f.document.hidden = true; f.document.dispatchEvent(new Event('visibilitychange')); await f.resolve(9);
  check(f.host.dataset.kineticActive === '0', 'A hidden document does not commit visual changes');
  f.document.hidden = false; f.document.dispatchEvent(new Event('visibilitychange'));
  check(f.host.dataset.kineticActive === '9', 'A decoded explicit view is restored when the page becomes visible');
  f.dispose();
}
{
  const f = fixture({ saveData: true }); f.visible(); f.input(22); const image = f.find(22);
  image.load(); f.dispose(); image.decodingReady.resolve(); await f.settle();
  check(f.host.dataset.kineticActive === '0' && f.raf.size === 0, 'A late decode after disposal cannot update the viewer');
  check(image.src === '' && f.observerList[0].disconnected, 'Disposal releases active image requests and observer');
  const count = f.requested.length; f.input(30); f.scroll(100); await f.settle();
  check(f.requested.length === count, 'Disposed listeners no longer start requests');
}
{
  const f = fixture({ observers: false, saveData: true }); f.input(3); await f.resolve(3);
  check(f.host.dataset.kineticActive === '3', 'Manual interaction works without IntersectionObserver');
  f.dispose();
}
{
  const f = fixture({ validPoster: false, saveData: true }); f.visible();
  check(f.status.dataset.error === 'true', 'An initially broken poster is reported');
  f.input(0); await f.resolve(0);
  check(f.frame.children[0].naturalWidth > 0 && f.status.dataset.error === 'false', 'The initial frame can be retried without a page reload');
  f.dispose();
}
{
  const f = fixture({ saveData: true }); f.visible(); f.input(1); await f.resolve(1);
  const current = f.frame.children[0];
  f.poster.fail(); await f.settle();
  check(f.frame.children[0] === current && f.status.dataset.error === 'false', 'Late poster failure cannot report an error after a successful replacement');
  f.poster.load(); await f.settle();
  f.input(2); await f.resolve(2); f.input(1); await f.settle();
  check(f.frame.children[0] === current && f.host.dataset.kineticActive === '1', 'Late poster load cannot replace the current decoded cache entry');
  f.dispose();
}

{
  const f = fixture({ sticky: true });
  check(f.story.dataset.kineticEnhanced === 'true' && f.raf.size === 0, 'Eligible desktop enhances the wrapper without an idle animation');
  f.visible(); await f.resolve(1); await f.resolve(2);
  f.scroll(309); await f.settle(); await f.resolve(18);
  check(f.host.dataset.kineticActive === '18', 'Middle of the sticky interval selects the middle of the sequence');
  f.scroll(618); await f.settle(); await f.resolve(35);
  check(f.host.dataset.kineticActive === '35', 'The final frame arrives before the normal sticky interval ends');
  check(f.frame.getBoundingClientRect().top >= 78 && f.frame.getBoundingClientRect().bottom <= f.window.innerHeight, 'Progress is measured from the story while the frame remains fully visible');
  f.input(18); f.scroll(400); await f.settle();
  check(f.host.dataset.kineticActive === '18', 'Manual selection takes precedence within the sticky story');
  f.media.matches = true; f.media.dispatchEvent(new Event('change'));
  check(!f.story.dataset.kineticEnhanced, 'Live reduced-motion preference removes the extended sticky layout');
  f.media.matches = false; f.media.dispatchEvent(new Event('change'));
  check(f.story.dataset.kineticEnhanced === 'true', 'Re-enabling motion restores eligible desktop enhancement');
  f.desktopMedia.matches = false; f.desktopMedia.dispatchEvent(new Event('change'));
  check(!f.story.dataset.kineticEnhanced, 'A shorter or narrower viewport returns to ordinary document flow');
  f.desktopMedia.matches = true; f.desktopMedia.dispatchEvent(new Event('change'));
  f.connection.saveData = true; f.connection.dispatchEvent(new Event('change'));
  check(!f.story.dataset.kineticEnhanced, 'Data saving removes the extended sticky layout');
  f.connection.saveData = false; f.connection.dispatchEvent(new Event('change')); f.dispose();
  check(!f.story.dataset.kineticEnhanced, 'Disposal removes the enhanced layout flag');
  f.remount();
  check(f.story.dataset.kineticEnhanced === 'true' && f.host.dataset.kineticActive === '18', 'BFcache remount restores eligible layout and retains the selected image');
  f.dispose();
}
for (const preference of [{ reduced: true }, { saveData: true }, { largeViewport: false }]) {
  const f = fixture({ sticky: true, ...preference });
  check(!f.story.dataset.kineticEnhanced, 'Ineligible motion, connection or viewport starts without sticky enhancement');
  f.dispose();
}

console.log(`Kinetic study state harness: ${checks} checks passed. Covers lifecycle, loading, preferences and interaction state; browser visual quality and physical-device performance require separate review.`);
