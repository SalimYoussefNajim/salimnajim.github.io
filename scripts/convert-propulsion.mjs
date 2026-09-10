import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// Run after rendering the three original Blender scenes to a scratch directory.
const source = resolve(process.argv[2] || 'work/propulsion-renders');
const destination = resolve('public/images');
await mkdir(destination, { recursive: true });
for (const view of ['assembled', 'exploded', 'cutaway']) {
  const input = join(source, `${view}.png`);
  const metadata = await sharp(input).metadata();
  if (!metadata.hasAlpha || metadata.width !== 1280 || metadata.height !== 853) {
    throw new Error(`${input} must be an original 1280 × 853 RGBA render`);
  }
  for (const [width, height] of [[640, 427], [1280, 853]]) {
    const output = join(destination, `propulsion-${view}-${width}.webp`);
    await sharp(input)
      .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
      .webp({ quality: 92, alphaQuality: 100, effort: 6 })
      .toFile(output);
    console.log(`${output}: ${(await stat(output)).size} bytes`);
  }
}
