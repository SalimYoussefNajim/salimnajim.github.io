import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/images', {recursive:true});
const socialOnly = process.argv.includes('--social-only');
if (!socialOnly) {
  await sharp('assets/salim-photo.png').resize(826,826,{fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile('public/images/salim.webp');
  await sharp('public/favicon.svg').resize(180,180).png().toFile('public/images/apple-touch-icon.png');
}
// Embed the original Blender artwork so the editable SVG has no external image dependency.
const propulsion = await sharp('public/images/propulsion-assembled-1280.webp')
  .resize(640, 427, { fit: 'inside', withoutEnlargement: true })
  .png()
  .toBuffer();
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="social-title">
  <title id="social-title">Salim Youssef Najim — Engineering. In perspective.</title>
  <defs>
    <radialGradient id="light" cx=".77" cy=".48" r=".57"><stop stop-color="#202b36"/><stop offset=".5" stop-color="#101720"/><stop offset="1" stop-color="#080b10"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#080b10"/>
  <rect width="1200" height="630" fill="url(#light)"/>
  <image x="620" y="133" width="540" height="360" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${propulsion.toString('base64')}"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="72" y="94" fill="#e5ebf1" font-size="24" font-weight="500" letter-spacing="-.5">Salim Youssef Najim</text>
    <text x="67" y="272" fill="#f5f7fa" font-size="84" font-weight="600" letter-spacing="-4">Engineering.</text>
    <text x="67" y="366" fill="#bcc9d6" font-size="78" font-weight="500" letter-spacing="-3.8">In perspective.</text>
    <text x="72" y="560" fill="#9eacbb" font-size="18" letter-spacing="-.1">Aerospace Engineering · Selected work</text>
    <text x="1128" y="560" fill="#9eacbb" font-size="17" letter-spacing="-.1" text-anchor="end">salimyoussefnajim.com</text>
  </g>
  <path d="M72 510h1056" stroke="#d6e3ec" stroke-opacity=".14"/>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/images/social-preview.png');
await writeFile('public/images/social-preview.svg',og);
console.log(socialOnly ? 'Created V4 social preview only.' : 'Created portrait, icons and V4 social preview.');
