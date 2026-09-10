import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const repo = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(repo, 'package.json'));
const ts = require('typescript');
const source = fs.readFileSync(path.join(repo, 'src/scripts/product-study.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture({ reduced = false, observers = true, initialValid = true, frameTop = 170.45, frameHeight = 396.5, viewportHeight = 900, headerHeight = 72 } = {}) {
  const requested = [];
  const raf = new Map();
  const observerList = [];
  let nextFrame = 1;
  class Element extends EventTarget {
    constructor(tag = 'div') {
      super();
      this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {};
      this.className = ''; this.textContent = ''; this.disabled = false;
      this.classList = {
        contains: (name) => this.className.split(' ').includes(name),
        add: (name) => { if (!this.classList.contains(name)) this.className += ` ${name}`; },
        remove: (name) => { this.className = this.className.split(' ').filter((value) => value !== name).join(' '); },
      };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    getAttribute(name) { return this.attributes[name]; }
    appendChild(child) { child.remove(); this.children.push(child); child.parent = this; return child; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); this.parent = undefined; }
    focus() { this.focused = true; }
    click() { this.dispatchEvent(new Event('click')); }
    getBoundingClientRect() { return this.rect || { top: 120, bottom: 600, height: 480, width: 720 }; }
    matches(selector) {
      if (selector === '.is-active') return this.classList.contains('is-active');
      if (selector === 'img') return this.tagName === 'IMG';
      if (selector === '[data-product-layer]') return this.dataset.productLayer !== undefined;
      return this.selector === selector;
    }
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  class MockImage extends Element {
    constructor(track = true) {
      super('img'); this.complete = false; this.naturalWidth = 0;
      this.decodingReady = deferred(); this.tracked = track;
      if (track) requested.push(this);
    }
    load() { this.complete = true; this.naturalWidth = 1280; this.dispatchEvent(new Event('load')); }
    fail() { this.complete = true; this.dispatchEvent(new Event('error')); }
    decode() { return this.tracked ? this.decodingReady.promise : Promise.resolve(); }
    cloneNode() {
      const image = new MockImage(false);
      Object.assign(image, { complete: this.complete, naturalWidth: this.naturalWidth, src: this.src, srcset: this.srcset, sizes: this.sizes, alt: this.alt });
      return image;
    }
  }
  const host = new Element('figure'); host.dataset.productActive = '0';
  const frame = new Element(); frame.selector = '[data-product-frame]'; host.appendChild(frame);
  const initialLayer = new Element('picture'); initialLayer.dataset.productLayer = '0'; initialLayer.className = 'product-study__image is-active'; frame.appendChild(initialLayer);
  const initialImage = new MockImage(false); initialImage.complete = true; initialImage.naturalWidth = initialValid ? 1280 : 0; initialImage.sizes = '55vw'; initialLayer.appendChild(initialImage);
  const buttons = Array.from({ length: 3 }, (_, index) => {
    const button = new Element('button'); button.selector = '[data-product-view]'; button.dataset.productView = String(index); button.disabled = true;
    button.setAttribute('aria-pressed', String(index === 0)); host.appendChild(button); return button;
  });
  const status = new Element('span'); status.selector = '[data-product-status]'; host.appendChild(status);
  const label = new Element('span'); label.selector = '[data-product-view-label]'; host.appendChild(label);
  const media = new EventTarget(); media.matches = reduced;
  const window = new EventTarget(); window.innerHeight = viewportHeight; window.scrollY = 0; window.matchMedia = () => media;
  frame.getBoundingClientRect = () => frame.rect || { top: frameTop - window.scrollY, bottom: frameTop + frameHeight - window.scrollY, height: frameHeight, width: 720 };
  const header = new Element('header'); header.rect = { top: 0, bottom: headerHeight, height: headerHeight };
  const document = new EventTarget(); document.hidden = false; document.createElement = (tag) => new Element(tag);
  document.querySelector = (selector) => selector === '.site-header' ? header : null;
  class Observer {
    constructor(callback) { this.callback = callback; observerList.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    trigger(visible = true) { if (!this.disconnected) this.callback([{ isIntersecting: visible }]); }
  }
  const exports = {};
  const context = { exports, document, window, Image: MockImage, AbortController, Event, setTimeout, clearTimeout,
    requestAnimationFrame: (callback) => { const id = nextFrame++; raf.set(id, callback); return id; },
    cancelAnimationFrame: (id) => raf.delete(id), IntersectionObserver: observers ? Observer : undefined };
  vm.runInNewContext(compiled, context);
  let dispose = exports.mountProductStudy(host);
  async function settle() {
    for (let turn = 0; turn < 8; turn++) await Promise.resolve();
    const callbacks = [...raf.values()]; raf.clear(); callbacks.forEach((callback) => callback());
    for (let turn = 0; turn < 8; turn++) await Promise.resolve();
  }
  const find = (slug) => requested.findLast((image) => image.src?.includes(`-${slug}-`));
  async function resolve(slug) { const image = find(slug); assert.ok(image, `${slug} was requested`); image.load(); image.decodingReady.resolve(); await settle(); }
  return { host, frame, buttons, status, requested, observerList, media, window, find, settle, resolve, raf,
    visible: () => observerList.forEach((observer) => observer.trigger()),
    scroll: () => window.dispatchEvent(new Event('scroll')),
    scrollTo: (position) => { window.scrollY = position; window.dispatchEvent(new Event('scroll')); },
    dispose: () => dispose(),
    remount: () => { dispose(); dispose = exports.mountProductStudy(host); },
  };
}

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }

{
  const f = fixture();
  check(f.buttons.every((button) => !button.disabled), 'Native buttons enabled after initialization');
  check(f.requested.length === 0, 'No alternative downloads before the viewer is near');
  f.visible(); await f.settle();
  check(f.requested.length === 2, 'Two alternatives requested once near the viewer');
  check(f.host.dataset.productActive === '0', 'Visibility alone does not advance the model');
  f.buttons[1].click();
  check(f.host.dataset.productActive === '0', 'Current image retained while another loads');
  const exploded = f.find('exploded'); exploded.load(); await f.settle();
  check(f.host.dataset.productActive === '0', 'Load event alone does not bypass decode');
  exploded.decodingReady.resolve(); await f.settle();
  check(f.host.dataset.productActive === '1', 'Decoded exploded image committed');
  check(f.buttons[1].getAttribute('aria-pressed') === 'true', 'Visible view matches pressed state');
  f.buttons[2].click(); f.find('cutaway').fail(); await f.settle();
  check(f.host.dataset.productActive === '1', 'Failed replacement retains valid visible image');
  check(f.status.dataset.error === 'true' && f.status.textContent.includes('remains visible'), 'Failure gives useful status');
  f.scrollTo(60); await f.settle();
  check(f.host.dataset.productActive === '1', 'Manual selection disables automatic switching');
  f.remount(); f.visible(); f.scroll(); await f.settle();
  check(f.host.dataset.productActive === '1', 'Manual preference and current view survive remount/BFcache');
  f.dispose();
}
{
  const f = fixture(); f.visible();
  f.buttons[1].click(); f.buttons[2].click();
  await f.resolve('cutaway'); await f.resolve('exploded');
  check(f.host.dataset.productActive === '2', 'Slower stale response never overwrites later selection');
  check(f.frame.querySelectorAll('.is-active').length === 1, 'Only one active image after raced responses');
  f.dispose();
}
{
  const f = fixture(); f.visible(); f.buttons[1].click(); f.buttons[0].click(); await f.resolve('exploded');
  check(f.host.dataset.productActive === '0', 'Selecting current view cancels an in-flight replacement');
  f.dispose();
}
{
  const f = fixture({ reduced: true }); f.visible();
  f.scrollTo(60); await f.settle();
  check(f.host.dataset.productActive === '0' && f.raf.size === 0, 'Reduced motion has no automatic scroll transition');
  const event = new Event('keydown', { cancelable: true }); Object.defineProperty(event, 'key', { value: 'End' });
  f.buttons[0].dispatchEvent(event); await f.resolve('cutaway');
  check(f.host.dataset.productActive === '2' && f.buttons[2].focused, 'Keyboard End selects and focuses cutaway under reduced motion');
  check(f.frame.querySelectorAll('[data-product-layer]').length === 1, 'Reduced motion replaces without retained fade layers');
  f.dispose();
}
{
  const f = fixture(); f.visible(); f.scrollTo(60); await f.settle();
  await f.resolve('cutaway');
  check(f.host.dataset.productActive === '2', 'Actual visible scroll can select cutaway automatically');
  check(f.host.dataset.productManual !== 'true', 'Automatic progression does not lock manual preference');
  f.dispose();
}
for (const scenario of [
  { name: 'Desktop', frameTop: 170.45, frameHeight: 396.5, viewportHeight: 900, positions: [10, 30, 60] },
  { name: 'Wide laptop with 60px interval', frameTop: 148, frameHeight: 447, viewportHeight: 900, positions: [5, 22, 42] },
  { name: 'Laptop with 47px interval', frameTop: 135, frameHeight: 447, viewportHeight: 900, positions: [5, 17, 33] },
  { name: 'Phone', frameTop: 487, frameHeight: 245, viewportHeight: 844, positions: [20, 140, 280] },
]) {
  const f = fixture(scenario); f.visible();
  await f.resolve('exploded'); await f.resolve('cutaway');
  check(f.host.dataset.productActive === '0', `${scenario.name}: decoded alternatives do not advance before scrolling`);
  for (const [index, position] of scenario.positions.entries()) {
    f.scrollTo(position); await f.settle(); await f.settle();
    const bounds = f.frame.getBoundingClientRect();
    check(f.host.dataset.productActive === String(index), `${scenario.name}: scroll reveals ${['assembled', 'exploded', 'cutaway'][index]} in sequence`);
    check(bounds.top >= 88 && bounds.bottom <= scenario.viewportHeight - 24, `${scenario.name}: the entire image remains visible for view ${index + 1}`);
  }
  f.dispose();
}
{
  const f = fixture(); f.visible();
  await f.resolve('exploded'); await f.resolve('cutaway');
  f.scrollTo(150); await f.settle(); await f.settle();
  check(f.host.dataset.productActive === '0', 'A fast scroll past the fully visible interval does not start a late change behind the header');
  f.dispose();
}
{
  const f = fixture({ frameTop: 487, frameHeight: 245, viewportHeight: 370 }); f.visible();
  await f.resolve('exploded'); await f.resolve('cutaway');
  f.scrollTo(390); await f.settle(); await f.settle();
  check(f.host.dataset.productActive === '0', 'Short landscape interval keeps the assembled image stable');
  f.buttons[2].click(); await f.settle();
  check(f.host.dataset.productActive === '2' && f.host.dataset.productManual === 'true', 'Short landscape viewport retains working manual view selection');
  f.dispose();
}
{
  const f = fixture(); f.visible(); f.buttons[1].click(); f.dispose(); await f.resolve('exploded');
  check(f.host.dataset.productActive === '0' && f.raf.size === 0, 'Late decode after disposal cannot mutate the study');
}
{
  const f = fixture(); f.visible(); f.scrollTo(60); await f.settle();
  f.media.matches = true; f.media.dispatchEvent(new Event('change')); await f.resolve('cutaway');
  check(f.host.dataset.productActive === '0', 'Enabling reduced motion cancels an automatic pending image change');
  f.dispose();
}
{
  const f = fixture(); f.visible();
  f.scrollTo(35); await f.settle();
  f.find('exploded').fail(); await f.settle();
  check(f.status.dataset.error === 'true', 'Failed automatic view change exposes an error');
  f.scrollTo(60); await f.settle(); await f.resolve('cutaway');
  check(f.host.dataset.productActive === '2' && f.status.dataset.error === 'false' && f.status.textContent === '', 'Successful automatic replacement clears stale error status');
  f.dispose();
}
{
  const f = fixture({ observers: false });
  check(f.requested.length === 2, 'Missing observers safely preload only a nearby viewer');
  f.buttons[1].click(); await f.resolve('exploded');
  check(f.host.dataset.productActive === '1', 'Manual study works without IntersectionObserver');
  f.dispose();
}
{
  const f = fixture({ initialValid: false }); f.visible();
  check(f.requested.length === 0, 'Alternatives wait for initial successful image');
  check(f.status.dataset.error === 'true' && f.status.textContent.includes('could not load'), 'An initial failure before script initialization is announced');
  f.buttons[0].click(); await f.resolve('assembled');
  check(f.host.dataset.productActive === '0' && f.frame.querySelector('.is-active').querySelector('img').naturalWidth > 0, 'Assembled button can retry an initially failed image');
  check(f.status.dataset.error === 'false', 'Successful retry clears the initial error');
  f.dispose();
}

console.log(`Product study state harness: ${checks} checks passed. This verifies DOM lifecycle and decoded-image state, not visual quality or physical-device performance.`);
