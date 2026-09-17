import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

// Inspect the generated artifact, never the legacy HTML at the repository root.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const origin = 'https://salimyoussefnajim.com';
const publicEmail = 'salim.najim.06@gmail.com'; // Explicitly confirmed by the owner.
const verifyRelease = process.argv.includes('--release');
const routes = ['/', '/about/', '/aerospace/', '/ventures/', '/projects/', '/projects/lumos/', '/books/', '/achievements/', '/contact/', '/404.html'];
const errors = new Set();
const fail = (where, message) => errors.add(`${where}: ${message}`);
if (process.argv.slice(2).some(argument => argument !== '--release')) {
  console.error('Usage: npm run check:site -- [--release]');
  process.exit(1);
}
if (!existsSync(dist)) {
  console.error('No dist/ artifact. Run npm run build first.');
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
function decode(value = '') {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (_, entity) => {
    if (entity[0] === '#') {
      const point = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : '';
    }
    return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' })[entity.toLowerCase()];
  });
}
function attributes(raw) {
  const result = {};
  for (const match of raw.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}
function tags(html) {
  const markup = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<(?:script|style)\b[^>]*>)[\s\S]*?<\/(?:script|style)>/gi, '$1');
  return [...markup.matchAll(/<([a-z][\w:-]*)\b([^>]*?)>/gi)].map(match => ({
    name: match[1].toLowerCase(), attrs: attributes(match[2])
  }));
}
function routeFor(file) {
  const relative = path.relative(dist, file).split(path.sep).join('/');
  return `/${relative}`.replace(/index\.html$/, '');
}
function localFile(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return null; }
  const candidate = path.resolve(dist, `.${pathname}`);
  if (candidate !== dist && !candidate.startsWith(`${dist}${path.sep}`)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const index = path.join(candidate, 'index.html');
  return existsSync(index) && statSync(index).isFile() ? index : null;
}

const files = walk(dist);
const pages = new Map(files.filter(file => file.endsWith('.html')).map(file => {
  const html = readFileSync(file, 'utf8');
  const elements = tags(html);
  return [file, { html, elements, ids: new Set(elements.map(tag => tag.attrs.id).filter(Boolean)) }];
}));
const seenTitles = new Map();
const seenDescriptions = new Map();
let checkedReferences = 0;
const studyImageMetrics = [];
const kineticImageMetrics = [];
const bookImageMetrics = [];
let checkedBooks = 0;
let checkedBookFormats = 0;

function checkReference(raw, from, label, checkFragment = true) {
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return;
  if (/^mailto:/i.test(raw)) {
    const recipient = decodeURIComponent(raw.slice(7).split('?')[0]);
    if (recipient.toLowerCase() !== publicEmail) fail(from, `unapproved email: ${recipient}`);
    return;
  }
  if (/^(tel:)/i.test(raw)) { fail(from, 'unverified phone contact'); return; }
  if (/^javascript:/i.test(raw)) { fail(from, `${label} uses javascript: URL`); return; }
  let url;
  try { url = new URL(raw, new URL(from, origin)); }
  catch { fail(from, `invalid ${label}: ${raw}`); return; }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) return;
  checkedReferences++;
  const target = localFile(url);
  if (!target) { fail(from, `missing ${label}: ${raw}`); return; }
  if (checkFragment && url.hash && pages.has(target)) {
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); }
    catch { fail(from, `invalid fragment: ${raw}`); return; }
    if (!pages.get(target).ids.has(id)) fail(from, `missing anchor: ${raw}`);
  }
}

for (const route of routes) {
  if (!localFile(new URL(route, origin))) fail(route, 'required route missing');
}
for (const [file, page] of pages) {
  const route = routeFor(file);
  const { html, elements } = page;
  const meta = name => elements.find(tag => tag.name === 'meta' && (tag.attrs.name === name || tag.attrs.property === name))?.attrs.content;
  const canonical = elements.find(tag => tag.name === 'link' && tag.attrs.rel === 'canonical')?.attrs.href;
  const isRedirect = elements.some(tag => tag.name === 'meta' && tag.attrs['http-equiv']?.toLowerCase() === 'refresh');
  // Legacy redirect documents need a canonical and valid destination, but are not content pages.
  if (isRedirect) {
    if (!canonical) fail(route, 'redirect missing canonical');
    else checkReference(canonical, route, 'canonical');
    const redirect = elements.find(tag => tag.attrs['http-equiv']?.toLowerCase() === 'refresh')?.attrs.content;
    const target = redirect?.match(/url\s*=\s*(.+)$/i)?.[1].replace(/^['"]|['"]$/g, '');
    if (!target) fail(route, 'redirect missing destination');
    else checkReference(target, route, 'redirect');
  } else {
    const title = decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
    const description = meta('description')?.trim();
    if (!title) fail(route, 'missing title');
    if (!description) fail(route, 'missing meta description');
    for (const [value, seen, name] of [[title, seenTitles, 'title'], [description, seenDescriptions, 'description']]) {
      if (value && seen.has(value)) fail(route, `duplicate ${name} with ${seen.get(value)}`);
      else if (value) seen.set(value, route);
    }
    if (canonical !== `${origin}${route}`) fail(route, `canonical must equal ${origin}${route}; received ${canonical}`);
    for (const name of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      if (!meta(name)) fail(route, `missing ${name}`);
    }
    if (meta('og:url') !== canonical) fail(route, 'og:url differs from canonical');
    if (meta('og:title') !== title || meta('twitter:title') !== title) fail(route, 'social title differs from page title');
    if (meta('og:description') !== description || meta('twitter:description') !== description) fail(route, 'social description differs from page description');
    for (const name of ['og:image', 'twitter:image']) {
      if (meta(name)) {
        if (!meta(name).startsWith(`${origin}/`)) fail(route, `${name} must use the production origin`);
        checkReference(meta(name), route, name, false);
      }
    }
    if (elements.filter(tag => tag.name === 'h1').length !== 1) fail(route, 'expected exactly one h1');
    if (!elements.some(tag => tag.name === 'main')) fail(route, 'missing main landmark');
    if (!elements.find(tag => tag.name === 'html')?.attrs.lang) fail(route, 'missing document language');
    if (route === '/404.html' && !meta('robots')?.includes('noindex')) fail(route, '404 must be noindex');
  }
  const ids = elements.map(tag => tag.attrs.id).filter(Boolean);
  for (const id of new Set(ids)) if (ids.filter(value => value === id).length > 1) fail(route, `duplicate id: ${id}`);
  for (const { name, attrs } of elements) {
    if (attrs.href !== undefined) {
      if (name === 'a' && !attrs.href.trim()) fail(route, 'empty link destination');
      if (name === 'a' && attrs.href === '#') fail(route, 'placeholder # link');
      checkReference(attrs.href, route, 'link');
    }
    for (const key of ['src', 'poster']) if (attrs[key]) checkReference(attrs[key], route, key, false);
    for (const key of ['srcset', 'imagesrcset']) {
      if (attrs[key] && !attrs[key].includes('data:')) {
        for (const candidate of attrs[key].split(',')) checkReference(candidate.trim().split(/\s+/)[0], route, key, false);
      }
    }
    if (name === 'img' && attrs.alt === undefined) fail(route, 'image missing alt attribute');
    if (name === 'form' && attrs.action) checkReference(attrs.action, route, 'form action', false);
    if (name === 'a' && attrs.target === '_blank' && !/\bnoopener\b/.test(attrs.rel ?? '')) fail(route, 'new-tab link missing noopener');
  }
  const publicText = decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' '));
  if (/\b(?:CGPA|GPA)\b|President['’]?s\s+List|\b3\.94\b|\bnational\s+rank(?:ing)?\b|ranked\s+22/i.test(publicText)) fail(route, 'academic statistics or honors forbidden by owner');
  if (/lorem ipsum|your-email@|hello@example\.com|\[insert\s|TODO:/i.test(publicText)) fail(route, 'unfinished placeholder copy');
  for (const address of publicText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) {
    if (address.toLowerCase() !== publicEmail) fail(route, `unapproved public email: ${address}`);
  }
  if (/ai-07vr\.onrender\.com|id=["'](?:loginModal|registerModal|chatBox)["']/.test(html)) fail(route, 'legacy AI/account experience included in release');
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(script[1]).type === 'application/ld+json') {
      try { JSON.parse(script[2]); } catch { fail(route, 'invalid structured data JSON'); }
    }
  }
}

// The homepage and aerospace study deliberately use decoded images, so a GPU
// fallback must not accidentally return through an old scene component.
for (const route of ['/', '/aerospace/']) {
  const page = pages.get(localFile(new URL(route, origin)));
  if (!page) continue;
  if (page.elements.some(({ name, attrs }) => name === 'canvas'
    || Object.keys(attrs).some(key => /^data-(?:scene|experience)(?:-|$)/.test(key)))) {
    fail(route, 'canvas or legacy WebGL scene markup is forbidden in the image study');
  }
  if (route === '/') {
    if (page.elements.filter(({ attrs }) => 'data-kinetic-study' in attrs).length !== 1) {
      fail(route, 'expected exactly one kinetic image study');
    }
    const poster = page.elements.filter(({ name, attrs }) => name === 'img' && 'data-kinetic-image' in attrs);
    if (poster.length !== 1 || !poster[0].attrs.alt?.trim() || !/^\/images\/kinetic\/(?:poster-(?:480|640)|frame-00)\.webp$/.test(poster[0].attrs.src ?? '')) {
      fail(route, 'kinetic study requires a described static first-frame image');
    }
    const rotation = page.elements.filter(({ name, attrs }) => name === 'input' && 'data-kinetic-range' in attrs);
    if (rotation.length !== 1 || rotation[0].attrs.type !== 'range' || !rotation[0].attrs['aria-label']?.trim()
      || rotation[0].attrs.min !== '0' || rotation[0].attrs.max !== '35') {
      fail(route, 'kinetic study requires a named native range covering all 36 views');
    }
    continue;
  }
  if (page.elements.filter(({ attrs }) => 'data-product-study' in attrs).length !== 1) {
    fail(route, 'expected exactly one propulsion image study');
  }
  const controls = [...page.html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)]
    .map(match => ({ attrs: attributes(match[1]), label: decode(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() }))
    .filter(({ attrs }) => 'data-product-view' in attrs);
  if (controls.length !== 3) fail(route, 'expected exactly three named propulsion view buttons');
  for (const [index, name] of ['Assembled', 'Exploded', 'Cutaway'].entries()) {
    const matching = controls.filter(({ attrs }) => attrs['data-product-view'] === String(index));
    if (matching.length !== 1 || matching[0].label !== name || 'hidden' in matching[0].attrs
      || (matching[0].attrs['aria-label'] !== undefined && matching[0].attrs['aria-label'] !== name)) {
      fail(route, `view ${index} must have one visible, named ${name} button`);
    }
  }
}

// Fully decode the real assets. Metadata and plausible filenames alone cannot
// establish that an image loads or that the exported silhouette is intact.
async function checkTransparentImage(relative, width, height, maxBytes) {
  const file = path.join(dist, relative);
  if (!existsSync(file)) { fail(relative, 'required study image missing'); return null; }
  try {
    const bytes = statSync(file).size;
    if (bytes > maxBytes) fail(relative, `image exceeds ${maxBytes} byte limit (${bytes} bytes)`);
    const image = sharp(file, { failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== 'webp') fail(relative, 'image must be encoded as WebP');
    if (!metadata.hasAlpha) fail(relative, 'image must retain an alpha channel');
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== width || info.height !== height) {
      fail(relative, `decoded dimensions must be ${width}×${height}; received ${info.width}×${info.height}`);
    }
    let left = info.width;
    let top = info.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        // Include even the faintest antialiased edge in the silhouette.
        if (data[(y * info.width + x) * info.channels + info.channels - 1] === 0) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    const margin = Math.min(left, top, info.width - 1 - right, info.height - 1 - bottom);
    if (right < 0) fail(relative, 'image is fully transparent and contains no visible study');
    else if (margin < 2) fail(relative, `visible silhouette needs at least 2 transparent pixels on every edge; smallest margin is ${margin}px`);
    return { relative, bytes, margin };
  } catch (error) {
    fail(relative, `study image could not be decoded: ${error.message}`);
    return null;
  }
}
for (const view of ['assembled', 'exploded', 'cutaway']) {
  for (const [width, height] of [[640, 427], [1280, 853]]) {
    const result = await checkTransparentImage(`images/propulsion-${view}-${width}.webp`, width, height, 300_000);
    if (result) studyImageMetrics.push(result);
  }
}
for (const [prefix, width, budget] of [['frame', 900, 2_000_000], ['mobile', 480, 1_500_000]]) {
  const sequence = [];
  for (let frame = 0; frame < 36; frame++) {
    const relative = `images/kinetic/${prefix}-${String(frame).padStart(2, '0')}.webp`;
    const result = await checkTransparentImage(relative, width, width, 100_000);
    if (result) sequence.push(result);
  }
  const bytes = sequence.reduce((sum, image) => sum + image.bytes, 0);
  if (bytes > budget) fail(`images/kinetic/${prefix}`, `36-frame sequence exceeds ${budget} byte budget (${bytes} bytes)`);
  kineticImageMetrics.push(...sequence);
}
for (const width of [480, 640]) {
  const result = await checkTransparentImage(`images/kinetic/poster-${width}.webp`, width, width, 100_000);
  if (result) kineticImageMetrics.push(result);
}

// This catalogue was confirmed in the owner's KDP bookshelf. Check the public
// content and real format destinations, without publishing account URLs or
// treating a retail price or unverified cover as permanent book metadata.
const expectedCovers = new Map();
const normalizeText = value => decode(value).replace(/\s+/g, ' ').trim();
try {
  const { books } = await import(pathToFileURL(path.join(root, 'src/data/books.ts')).href);
  if (!Array.isArray(books) || books.length !== 11) throw new Error('expected the 11 confirmed catalogue entries');
  const page = pages.get(localFile(new URL('/books/', origin)));
  const publicText = normalizeText((page?.html ?? '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' '));
  const links = new Set((page?.elements ?? []).filter(tag => tag.name === 'a').map(tag => tag.attrs.href));
  const ids = new Set();
  const titles = new Set();
  const formatAsins = new Set();
  for (const book of books) {
    if (!book.id || ids.has(book.id)) fail('/books/', `missing or duplicated catalogue id: ${book.id}`);
    ids.add(book.id);
    const fullTitle = `${book.title ?? ''} ${book.subtitle ?? ''}`.trim();
    if (!book.title?.trim() || titles.has(fullTitle)) fail('/books/', `missing or duplicated book title: ${fullTitle}`);
    titles.add(fullTitle);
    for (const text of [book.title, book.subtitle].filter(Boolean)) {
      if (!publicText.includes(normalizeText(text))) fail('/books/', `confirmed title text missing from visible content: ${text}`);
    }
    if (!Array.isArray(book.formats) || book.formats.length < 1) fail('/books/', `no confirmed format for ${fullTitle}`);
    for (const format of book.formats ?? []) {
      if (!/^[A-Z0-9]{10}$/.test(format.asin ?? '') || formatAsins.has(format.asin)) {
        fail('/books/', `invalid or duplicated format ASIN for ${fullTitle}`);
      }
      formatAsins.add(format.asin);
      if (format.url !== `https://www.amazon.com/dp/${format.asin}` || !links.has(format.url)) {
        fail('/books/', `missing confirmed Amazon format destination for ${fullTitle}: ${format.url}`);
      }
      checkedBookFormats++;
    }
    if (book.cover) {
      if (!/^\/images\/books\/[a-z0-9-]+\.(?:webp|jpe?g|png)$/.test(book.cover.src ?? '')) {
        fail('/books/', `book cover must reference a local published asset: ${fullTitle}`);
      } else expectedCovers.set(book.cover.src.slice(1), book.cover);
    }
    checkedBooks++;
  }
  if (checkedBookFormats !== 29) fail('/books/', `expected 29 confirmed format destinations; received ${checkedBookFormats}`);
  if ([...links].some(link => /https?:\/\/(?:[^/]*\.)?kdp\.amazon\./i.test(link ?? ''))) {
    fail('/books/', 'private KDP account links must not be published');
  }
} catch (error) {
  fail('/books/', `could not verify confirmed catalogue: ${error.message}`);
}
const bookImages = files.filter(file => path.relative(dist, file).split(path.sep).join('/').startsWith('images/books/')
  && /\.(?:webp|jpe?g|png)$/i.test(file));
for (const relative of expectedCovers.keys()) {
  if (!existsSync(path.join(dist, relative))) fail(relative, 'confirmed book cover asset missing');
}
for (const file of bookImages) {
  const relative = path.relative(dist, file).split(path.sep).join('/');
  try {
    const bytes = statSync(file).size;
    if (bytes > 300_000) fail(relative, `book image exceeds 300 KB (${bytes} bytes)`);
    const image = sharp(file, { failOn: 'warning' });
    const metadata = await image.metadata();
    const { info } = await image.raw().toBuffer({ resolveWithObject: true });
    if (!['webp', 'jpeg', 'png'].includes(metadata.format)) fail(relative, 'unsupported cover image encoding');
    if (info.width < 160 || info.height < 160 || info.width > 2048 || info.height > 3072) {
      fail(relative, `book cover must be a usable bounded image; received ${info.width}×${info.height}`);
    }
    const expected = expectedCovers.get(relative);
    if (expected && (info.width !== expected.width || info.height !== expected.height)) {
      fail(relative, `cover dimensions differ from declared ${expected.width}×${expected.height}`);
    }
    bookImageMetrics.push({ relative, bytes, width: info.width, height: info.height });
  } catch (error) {
    fail(relative, `book image could not be decoded: ${error.message}`);
  }
}

for (const file of files.filter(file => file.endsWith('.css'))) {
  const route = `/${path.relative(dist, file).split(path.sep).join('/')}`;
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/g)) {
    if (!match[2].startsWith('#')) checkReference(match[2], route, 'CSS asset', false);
  }
}
const contact = pages.get(localFile(new URL('/contact/', origin)))?.html ?? '';
if (!contact.includes(publicEmail) || !contact.includes(`mailto:${publicEmail}`)) fail('/contact/', 'confirmed public email must be visible and clickable');
const readRequired = filename => {
  const full = path.join(dist, filename);
  if (!existsSync(full)) { fail(filename, 'required release file missing'); return ''; }
  return readFileSync(full, 'utf8');
};
if (readRequired('CNAME').trim() !== 'salimyoussefnajim.com') fail('CNAME', 'custom domain changed');
if (!readRequired('ads.txt').includes('google.com, pub-6974115975105547, DIRECT, f08c47fec0942fa0')) fail('ads.txt', 'existing AdSense publisher entry changed');
readRequired('.nojekyll');
const robots = readRequired('robots.txt');
if (/Disallow:\s*\/\s*$/im.test(robots)) fail('robots.txt', 'production crawl is blocked');
if (!robots.includes(`${origin}/sitemap.xml`)) fail('robots.txt', 'missing production sitemap reference');
const sitemap = readRequired('sitemap.xml');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decode(match[1]));
for (const route of routes.filter(route => route !== '/404.html')) {
  if (!sitemapUrls.includes(`${origin}${route}`)) fail('sitemap.xml', `missing ${route}`);
}
for (const url of sitemapUrls) {
  if (!url.startsWith(`${origin}/`)) fail('sitemap.xml', `non-production URL: ${url}`);
  checkReference(url, '/sitemap.xml', 'sitemap URL', false);
}
try {
  const manifest = JSON.parse(readRequired('site.webmanifest'));
  if (!manifest.name) fail('site.webmanifest', 'missing name');
  if (manifest.start_url) checkReference(manifest.start_url, '/site.webmanifest', 'start URL');
  for (const icon of manifest.icons ?? []) checkReference(icon.src, '/site.webmanifest', 'manifest icon', false);
} catch { fail('site.webmanifest', 'invalid JSON'); }

// Pages publishes committed root files. A valid dist/ alone does not prove that
// those published files correspond to the source that was just checked.
if (verifyRelease) {
  const manifestFile = path.join(root, '.release-files.json');
  const info = lstatSync(manifestFile, { throwIfNoEntry: false });
  if (!info?.isFile() || info.isSymbolicLink()) {
    fail('.release-files.json', 'missing or invalid release manifest; run release:stage after building');
  } else {
    try {
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
      if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error('unsupported manifest format');
      const expected = new Map(files.map(file => [path.relative(dist, file).split(path.sep).join('/'), file]));
      const recorded = new Set();
      const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
      const realRoot = realpathSync(root);
      for (const entry of manifest.files) {
        // Only exact paths discovered inside the build may be inspected in root.
        // Manifest input can never direct reads outside the checkout.
        if (!entry || !expected.has(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) {
          fail('.release-files.json', `obsolete or invalid entry: ${String(entry?.path)}`);
          continue;
        }
        if (recorded.has(entry.path)) fail('.release-files.json', `duplicate entry: ${entry.path}`);
        recorded.add(entry.path);
        const builtHash = digest(expected.get(entry.path));
        if (entry.sha256 !== builtHash) fail(entry.path, 'release manifest is stale relative to dist/; run release:stage');
        const target = path.join(root, ...entry.path.split('/'));
        let current = root;
        let safe = true;
        for (const segment of entry.path.split('/')) {
          current = path.join(current, segment);
          const targetInfo = lstatSync(current, { throwIfNoEntry: false });
          if (!targetInfo || targetInfo.isSymbolicLink()) {
            fail(entry.path, 'release path is missing or contains a symbolic link');
            safe = false;
            break;
          }
          const resolved = realpathSync(current);
          if (!resolved.startsWith(`${realRoot}${path.sep}`)) {
            fail(entry.path, 'resolved release path escapes the checkout');
            safe = false;
            break;
          }
        }
        if (safe && (!lstatSync(target).isFile() || digest(target) !== builtHash)) fail(entry.path, 'published root file differs from the verified build');
      }
      for (const relative of expected.keys()) if (!recorded.has(relative)) fail(relative, 'build file is absent from the release manifest');
    } catch (error) { fail('.release-files.json', `could not verify release: ${error.message}`); }
  }
}

if (errors.size) {
  console.error(`Site verification failed (${errors.size}):\n${[...errors].map(error => `  - ${error}`).join('\n')}`);
  process.exitCode = 1;
} else {
  const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
  console.log(`Site verification passed: ${pages.size} HTML pages, ${checkedReferences} internal references, ${(bytes / 1024 / 1024).toFixed(2)} MB total artifact.`);
  console.log('Verified routes, local assets, anchors, metadata, contact identity, domain, sitemap, manifest, and excluded academic claims.');
  console.log(`Verified ${studyImageMetrics.length} propulsion WebPs: exact dimensions, alpha, full decoding, 300 KB file limits, and unclipped silhouettes (smallest margin ${Math.min(...studyImageMetrics.map(image => image.margin))}px).`);
  console.log(`Verified ${kineticImageMetrics.length} kinetic WebPs: exact dimensions, alpha, full decoding, bounded sequence sizes, and unclipped silhouettes (smallest margin ${Math.min(...kineticImageMetrics.map(image => image.margin))}px).`);
  console.log(`Verified ${checkedBooks} confirmed book entries, ${checkedBookFormats} Amazon format destinations, and ${bookImageMetrics.length} fully decoded local book image assets.`);
  console.log('Verified the home kinetic study has a named rotation range, aerospace has three named propulsion views, and both use image fallbacks without canvas or legacy WebGL scene markup.');
  if (verifyRelease) console.log('Verified that the root release files and their recorded hashes match every file in dist/.');
  console.log('External availability, browser behavior, contact delivery, and performance still require their separate checks.');
}
