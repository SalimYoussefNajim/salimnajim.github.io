import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// This prepares files locally. It never runs Git, contacts GitHub, or deploys.
const root = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const dist = path.join(root, 'dist');
const manifestPath = path.join(root, '.release-files.json');
const dryRun = process.argv.includes('--dry-run');
const argumentsAllowed = process.argv.slice(2).every(argument => argument === '--dry-run');
const protectedDirectories = new Set([
  '.git', '.github', '.agents', '.codex', '.astro', 'src', 'scripts', 'docs',
  'node_modules', 'public', 'dist', 'assets', 'css', 'js', 'work', 'tests'
]);
const bootstrapFiles = new Set(['index.html', 'projects.html', 'salim.html', 'dashboard.html', 'CNAME', 'ads.txt']);
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const reject = message => { throw new Error(message); };

function validateRelative(relative) {
  if (typeof relative !== 'string' || !relative || relative !== relative.trim() || relative.includes('\\') || /[\x00-\x1f<>:"|?*]/.test(relative)) reject(`Unsafe release path: ${String(relative)}`);
  if (path.posix.isAbsolute(relative) || path.win32.isAbsolute(relative) || path.posix.normalize(relative) !== relative) reject(`Release path must be normalized and relative: ${relative}`);
  const segments = relative.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || /[. ]$/.test(segment) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))) reject(`Unsafe release path segment: ${relative}`);
  const first = segments[0].toLowerCase();
  if (protectedDirectories.has(first) || (first.startsWith('.') && relative !== '.nojekyll')) reject(`Protected repository path: ${relative}`);
  if (/^(package(?:-lock)?\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|astro\.config\..+|eslint\.config\..+|tsconfig(?:\..+)?\.json|readme(?:\..+)?|license(?:\..+)?|agents\.md)$/i.test(first)) reject(`Protected configuration/document: ${relative}`);
  return relative;
}

function checkedPath(base, relative) {
  validateRelative(relative);
  const target = path.resolve(base, ...relative.split('/'));
  if (!target.startsWith(`${base}${path.sep}`)) reject(`Release path escapes its directory: ${relative}`);
  let current = base;
  for (const [index, segment] of relative.split('/').entries()) {
    current = path.join(current, segment);
    const info = lstatSync(current, { throwIfNoEntry: false });
    if (!info) continue;
    if (info.isSymbolicLink()) reject(`Symbolic links are not allowed in release paths: ${relative}`);
    if (index < relative.split('/').length - 1 && !info.isDirectory()) reject(`Release parent is not a directory: ${relative}`);
    if (index === relative.split('/').length - 1 && !info.isFile()) reject(`Release destination is not a regular file: ${relative}`);
    const resolved = realpathSync(current);
    if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) reject(`Resolved release path escapes its directory: ${relative}`);
  }
  return target;
}

function inputFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    validateRelative(relative);
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) reject(`Build artifact contains a symbolic link: ${relative}`);
    if (entry.isDirectory()) return inputFiles(full, relative);
    if (!entry.isFile()) reject(`Build artifact contains a non-file: ${relative}`);
    checkedPath(dist, relative);
    return [{ path: relative, sha256: sha256(full) }];
  });
}

function readManifest() {
  const info = lstatSync(manifestPath, { throwIfNoEntry: false });
  if (!info) return [];
  if (!info.isFile() || info.isSymbolicLink()) reject('Release manifest must be a regular local file.');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files)) reject('Unsupported .release-files.json format.');
  const seen = new Set();
  for (const entry of manifest.files) {
    if (!entry || typeof entry !== 'object' || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) reject('Invalid release manifest entry.');
    validateRelative(entry.path);
    checkedPath(root, entry.path);
    const folded = entry.path.toLowerCase();
    if (seen.has(folded)) reject(`Duplicate/case-colliding manifest path: ${entry.path}`);
    seen.add(folded);
  }
  return manifest.files;
}

try {
  if (!argumentsAllowed) reject('Usage: npm run release:stage -- [--dry-run]');
  if (!existsSync(dist) || !lstatSync(dist).isDirectory() || lstatSync(dist).isSymbolicLink() || realpathSync(dist) !== dist) reject('dist/ must be a real directory inside this checkout. Run npm run build first.');
  const verification = spawnSync(process.execPath, [path.join(root, 'scripts', 'check-site.mjs')], { cwd: root, stdio: 'inherit' });
  if (verification.error) reject(`Could not verify build: ${verification.error.message}`);
  if (verification.status !== 0) reject('The generated site did not pass verification; nothing was staged.');

  const previous = readManifest();
  const incoming = inputFiles(dist).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (!incoming.length) reject('Refusing to stage an empty build.');
  const priorByPath = new Map(previous.map(entry => [entry.path, entry]));
  const nextByPath = new Map(incoming.map(entry => [entry.path, entry]));
  const nextByFolded = new Map();
  for (const entry of incoming) {
    const folded = entry.path.toLowerCase();
    if (nextByFolded.has(folded)) reject(`Case-colliding build path: ${entry.path}`);
    nextByFolded.set(folded, entry.path);
  }
  for (const entry of previous) {
    if (nextByFolded.has(entry.path.toLowerCase()) && nextByFolded.get(entry.path.toLowerCase()) !== entry.path) reject(`Generated path casing changed: ${entry.path}. Resolve this explicitly before staging.`);
  }
  const stale = previous.filter(entry => !nextByPath.has(entry.path));

  // Finish every path/content check before the first write or deletion.
  for (const entry of incoming) {
    const target = checkedPath(root, entry.path);
    if (!existsSync(target)) continue;
    const currentHash = sha256(target);
    const prior = priorByPath.get(entry.path);
    if (currentHash === entry.sha256) continue;
    if (prior && currentHash !== prior.sha256) reject(`Generated file has local edits: ${entry.path}. Preserve or resolve them before staging.`);
    if (!prior && !bootstrapFiles.has(entry.path)) reject(`Refusing to overwrite an unmanaged file: ${entry.path}`);
  }
  for (const entry of stale) {
    const target = checkedPath(root, entry.path);
    if (existsSync(target) && sha256(target) !== entry.sha256) reject(`Stale generated file has local edits: ${entry.path}. It will not be deleted.`);
  }
  console.log(`${dryRun ? 'Dry run' : 'Local release staging'}: ${incoming.length} generated files; ${stale.length} obsolete recorded files.`);
  if (dryRun) {
    for (const entry of stale) console.log(`Would remove recorded file: ${entry.path}`);
    console.log('No files changed. Run npm run release:stage when ready to prepare the local release diff.');
  } else {
    for (const entry of incoming) {
      const source = checkedPath(dist, entry.path);
      const target = checkedPath(root, entry.path);
      if (sha256(source) !== entry.sha256) reject(`Build changed during staging: ${entry.path}. Rebuild and retry.`);
      if (existsSync(target) && sha256(target) === entry.sha256) continue;
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
    for (const entry of stale) {
      const target = checkedPath(root, entry.path);
      if (existsSync(target)) {
        if (sha256(target) !== entry.sha256) reject(`Stale file changed during staging: ${entry.path}. It will not be deleted.`);
        unlinkSync(target); // Individual manifest-owned files only; never recursive deletion.
      }
    }
    const temporaryManifest = path.join(root, `.release-files.${randomUUID()}.tmp`);
    writeFileSync(temporaryManifest, `${JSON.stringify({ version: 1, files: incoming }, null, 2)}\n`, { flag: 'wx' });
    renameSync(temporaryManifest, manifestPath);
    console.log('Generated files and .release-files.json are ready for review. No Git action or deployment was performed.');
  }
} catch (error) {
  console.error(`Release staging stopped: ${error.message}`);
  process.exitCode = 1;
}
