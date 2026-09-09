import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Inspect the generated artifact, never the legacy HTML at the repository root.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const origin = 'https://salimyoussefnajim.com';
const publicEmail = 'salim.najim.06@gmail.com'; // Explicitly confirmed by the owner.
const verifyRelease = process.argv.includes('--release');
const routes = ['/', '/about/', '/aerospace/', '/ventures/', '/projects/', '/projects/lumos/', '/achievements/', '/contact/', '/404.html'];
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
  if (verifyRelease) console.log('Verified that the root release files and their recorded hashes match every file in dist/.');
  console.log('External availability, browser behavior, contact delivery, and performance still require their separate checks.');
}
