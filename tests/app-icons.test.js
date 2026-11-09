import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';

test('index.html and chieunayuonggi/index.html define complete app icons and manifests', async () => {
  const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const drinksHtml = await readFile(new URL('../chieunayuonggi/index.html', import.meta.url), 'utf8');

  // Verify homepage tags
  assert.match(indexHtml, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/);
  assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32x32\.png">/);
  assert.match(indexHtml, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png">/);
  assert.match(indexHtml, /<link rel="manifest" href="\/manifest\.webmanifest">/);

  // Verify chieunayuonggi tags
  assert.match(drinksHtml, /<link rel="icon" type="image\/svg\+xml" href="\/favicon-drinks\.svg">/);
  assert.match(drinksHtml, /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-drinks-32x32\.png">/);
  assert.match(drinksHtml, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon-drinks\.png">/);
  assert.match(drinksHtml, /<link rel="manifest" href="\/manifest-drinks\.webmanifest">/);
});

test('public icon assets exist, are non-empty, and manifests are well-formed', async () => {
  const files = [
    'favicon.svg',
    'favicon.ico',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'manifest.webmanifest',
    'favicon-drinks.svg',
    'favicon-drinks-32x32.png',
    'apple-touch-icon-drinks.png',
    'icon-drinks-192.png',
    'icon-drinks-512.png',
    'manifest-drinks.webmanifest',
  ];

  for (const file of files) {
    const url = new URL(`../public/${file}`, import.meta.url);
    assert.ok(existsSync(url), `File public/${file} should exist`);
    const fileStat = await stat(url);
    assert.ok(fileStat.size > 0, `File public/${file} should not be empty`);
  }

  // Validate manifests
  const mainManifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(mainManifest.short_name, 'Luncher');
  assert.equal(mainManifest.start_url, '/');
  assert.ok(Array.isArray(mainManifest.icons) && mainManifest.icons.length >= 2);

  const drinksManifest = JSON.parse(await readFile(new URL('../public/manifest-drinks.webmanifest', import.meta.url), 'utf8'));
  assert.equal(drinksManifest.short_name, 'Chiều uống gì');
  assert.equal(drinksManifest.start_url, '/chieunayuonggi');
  assert.ok(Array.isArray(drinksManifest.icons) && drinksManifest.icons.length >= 2);

  // Validate favicon.ico structure
  const icoBuffer = await readFile(new URL('../public/favicon.ico', import.meta.url));
  assert.equal(icoBuffer.readUInt16LE(0), 0);
  assert.equal(icoBuffer.readUInt16LE(2), 1); // ICO type
  assert.equal(icoBuffer.readUInt16LE(4), 1); // 1 image
});
