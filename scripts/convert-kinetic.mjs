import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// Converts only locally rendered, original geometry. No downloaded 3D asset.
const source = resolve(process.argv[2] || '../../work/kinetic-v5');
const destination = resolve('public/images/kinetic');
await mkdir(destination, { recursive: true });
const records = [];
const mobileRecords = [];
for (let frame = 0; frame < 36; frame += 1) {
  const name = `frame-${String(frame).padStart(2, '0')}`;
  const input = join(source, `${name}.png`);
  const metadata = await sharp(input).metadata();
  if (metadata.width !== 900 || metadata.height !== 900 || !metadata.hasAlpha) {
    throw new Error(`${name}: expected a 900 × 900 transparent source render`);
  }
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 5) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
  }
  const margin = Math.min(left, top, info.width - 1 - right, info.height - 1 - bottom);
  if (margin < 48) throw new Error(`${name} must retain at least 48 px of transparent framing`);
  const result = await sharp(input).webp({ quality: 82, alphaQuality: 100, effort: 4 }).toFile(join(destination, `${name}.webp`));
  records.push({ frame, file: `${name}.webp`, width: 900, height: 900, bytes: result.size, margin });
  const mobileFile = `mobile-${String(frame).padStart(2, '0')}.webp`;
  const mobileResult = await sharp(input).resize(480, 480, { kernel: 'lanczos3' }).webp({ quality: 86, alphaQuality: 95, effort: 4 }).toFile(join(destination, mobileFile));
  mobileRecords.push({ frame, file: mobileFile, width: 480, height: 480, bytes: mobileResult.size });
}
const first = join(source, 'frame-00.png');
for (const width of [480, 640]) {
  await sharp(first).resize(width, width, { kernel: 'lanczos3' }).webp({ quality: 90, alphaQuality: 100, effort: 4 }).toFile(join(destination, `poster-${width}.webp`));
}
const totalBytes = records.reduce((total, item) => total + item.bytes, 0);
if (totalBytes > 2_000_000) throw new Error(`Sequence exceeds 2 MB: ${totalBytes}`);
const mobileTotalBytes = mobileRecords.reduce((total, item) => total + item.bytes, 0);
const manifest = { frames: 36, width: 900, height: 900, totalBytes, mobileWidth: 480, mobileHeight: 480, mobileTotalBytes, minimumMargin: Math.min(...records.map(item => item.margin)), records, mobileRecords };
await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ ...manifest, records: undefined, mobileRecords: undefined }, null, 2));
