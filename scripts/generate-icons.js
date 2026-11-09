import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');
const assetsDir = path.resolve(__dirname, 'assets');

export function resizeWithSips(sourcePath, targetPath, size) {
  execFileSync('/usr/bin/sips', ['-s', 'format', 'png', '-z', String(size), String(size), sourcePath, '--out', targetPath], {
    stdio: 'pipe',
  });
}

export function makeIcoFromPng(pngBuffer, size = 32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const dir = Buffer.alloc(16);
  dir.writeUInt8(size === 256 ? 0 : size, 0);
  dir.writeUInt8(size === 256 ? 0 : size, 1);
  dir.writeUInt8(0, 2);
  dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(pngBuffer.length, 8);
  dir.writeUInt32LE(22, 12);

  return Buffer.concat([header, dir, pngBuffer]);
}

export function createSvgFavicon(png64Buffer) {
  const base64 = png64Buffer.toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <clipPath id="squircle">
      <rect width="64" height="64" rx="14" ry="14" />
    </clipPath>
  </defs>
  <image href="data:image/png;base64,${base64}" width="64" height="64" clip-path="url(#squircle)" />
</svg>
`;
}

export function generateAllIcons(destDir = publicDir) {
  fs.mkdirSync(destDir, { recursive: true });

  const luncherSource = path.join(assetsDir, 'luncher-source.jpg');
  const drinksSource = path.join(assetsDir, 'drinks-source.jpg');

  // 1. Luncher Icons (Bento Box)
  resizeWithSips(luncherSource, path.join(destDir, 'apple-touch-icon.png'), 180);
  resizeWithSips(luncherSource, path.join(destDir, 'icon-512.png'), 512);
  resizeWithSips(luncherSource, path.join(destDir, 'icon-192.png'), 192);
  resizeWithSips(luncherSource, path.join(destDir, 'favicon-32x32.png'), 32);

  const luncher32 = fs.readFileSync(path.join(destDir, 'favicon-32x32.png'));
  fs.writeFileSync(path.join(destDir, 'favicon.ico'), makeIcoFromPng(luncher32, 32));

  const tempLuncher64 = path.join(destDir, 'temp-luncher-64.png');
  resizeWithSips(luncherSource, tempLuncher64, 64);
  const luncher64 = fs.readFileSync(tempLuncher64);
  fs.writeFileSync(path.join(destDir, 'favicon.svg'), createSvgFavicon(luncher64), 'utf8');
  fs.unlinkSync(tempLuncher64);

  // 2. Drinks Icons (Boba Cup)
  resizeWithSips(drinksSource, path.join(destDir, 'apple-touch-icon-drinks.png'), 180);
  resizeWithSips(drinksSource, path.join(destDir, 'icon-drinks-512.png'), 512);
  resizeWithSips(drinksSource, path.join(destDir, 'icon-drinks-192.png'), 192);
  resizeWithSips(drinksSource, path.join(destDir, 'favicon-drinks-32x32.png'), 32);

  const tempDrinks64 = path.join(destDir, 'temp-drinks-64.png');
  resizeWithSips(drinksSource, tempDrinks64, 64);
  const drinks64 = fs.readFileSync(tempDrinks64);
  fs.writeFileSync(path.join(destDir, 'favicon-drinks.svg'), createSvgFavicon(drinks64), 'utf8');
  fs.unlinkSync(tempDrinks64);

  // 3. Web App Manifests
  const manifest = {
    name: 'Luncher · Trưa nay ăn gì?',
    short_name: 'Luncher',
    description: 'Luncher — vòng quay chọn món trưa, không lặp món trong tuần.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f1ea',
    theme_color: '#faf7f2',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  fs.writeFileSync(path.join(destDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const drinksManifest = {
    name: 'Luncher · Chiều nay uống gì?',
    short_name: 'Chiều uống gì',
    description: 'Luncher — vòng quay chọn quán trà sữa cho buổi chiều, không cần tạo nhóm.',
    start_url: '/chieunayuonggi',
    display: 'standalone',
    background_color: '#f6f1ea',
    theme_color: '#faf7f2',
    icons: [
      { src: '/icon-drinks-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-drinks-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-drinks-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  fs.writeFileSync(path.join(destDir, 'manifest-drinks.webmanifest'), JSON.stringify(drinksManifest, null, 2) + '\n', 'utf8');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Generating all icons in public/...');
  generateAllIcons();
  console.log('Icons generated successfully.');
}
