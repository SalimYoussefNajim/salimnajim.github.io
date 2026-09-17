import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/images', {recursive:true});
if (!process.argv.includes('--social-only')) {
  await sharp('assets/salim-photo.png').resize(826,826,{fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile('public/images/salim.webp');
  await sharp('public/favicon.svg').resize(180,180).png().toFile('public/images/apple-touch-icon.png');
}
const sculpture = await sharp('public/images/kinetic/frame-00.webp').resize(600,600).png().toBuffer();
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#efeee8"/><path d="M50 100h1100M50 553h1100" stroke="#20221f" stroke-opacity=".25"/><g font-family="Arial,Helvetica,sans-serif" fill="#20221f"><text x="50" y="62" font-size="20">Salim Youssef Najim</text><text x="1150" y="62" font-size="15" text-anchor="end">ENGINEERING / WRITING</text><text x="44" y="285" font-size="184" font-weight="700" letter-spacing="-14">SALIM</text><text x="94" y="450" font-size="184" font-weight="700" letter-spacing="-14">NAJIM<tspan fill="#df492c">.</tspan></text><text x="50" y="593" font-size="17">Engineering, books &amp; ideas.</text><text x="1150" y="593" font-size="17" text-anchor="end">salimyoussefnajim.com</text></g><image x="590" y="28" width="620" height="620" href="data:image/png;base64,${sculpture.toString('base64')}"/></svg>`;
await sharp(Buffer.from(og)).png().toFile('public/images/social-preview.png');
await writeFile('public/images/social-preview.svg',og);
console.log('Created editorial identity assets.');
