import {describe, it, expect} from 'vitest';
import {mkdtemp, writeFile, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import config, {stampRelease, RELEASE_MARKER} from '../vite.config';

describe('production release and icon contracts', () => {
  it('injects exactly package.json version', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    expect(config.define?.__APP_VERSION__).toBe(JSON.stringify(pkg.version));
  });
  it('hashes assets and canonical worker source deterministically; rejects missing/duplicate markers', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'piggy-release-'));
    const root = pathToFileURL(directory + '/');
    const worker = new URL('sw.js', root);
    try {
      await writeFile(new URL('index.html', root), 'same semver application');
      await writeFile(worker, RELEASE_MARKER + '\n// A');
      const a = await stampRelease(root);
      await writeFile(worker, RELEASE_MARKER + '\n// A');
      expect(await stampRelease(root)).toBe(a);
      await writeFile(worker, RELEASE_MARKER + '\n// B');
      expect(await stampRelease(root)).not.toBe(a);
      await writeFile(worker, RELEASE_MARKER + '\n// A');
      await writeFile(new URL('index.html', root), 'changed asset');
      expect(await stampRelease(root)).not.toBe(a);
      await writeFile(worker, '// missing');
      await expect(stampRelease(root)).rejects.toThrow('exactly one');
      await writeFile(worker, RELEASE_MARKER + RELEASE_MARKER);
      await expect(stampRelease(root)).rejects.toThrow('exactly one');
    } finally { await rm(directory, {recursive: true, force: true}); }
  });
  it('keeps original nonpublic and installs opaque correctly sized any-purpose icons', async () => {
    const original = await sharp(new URL('../assets/icon-source/piggy-original.png', import.meta.url).pathname).metadata();
    expect([original.width, original.height]).toEqual([1254, 1254]);
    for (const [name, size] of [['app.png', 512], ['app-192.png', 192], ['apple-touch-icon.png', 180], ['favicon.png', 32]] as const) {
      const metadata = await sharp(new URL('../public/' + name, import.meta.url).pathname).metadata();
      expect([metadata.width, metadata.height, metadata.hasAlpha]).toEqual([size, size, false]);
    }
    const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
    expect(manifest.icons.map((icon: {sizes: string}) => icon.sizes)).toEqual(['512x512', '192x192']);
    expect(manifest.icons.every((icon: {purpose: string, src: string}) => icon.purpose === 'any' && icon.src.startsWith('./'))).toBe(true);
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    for (const name of ['favicon.png', 'apple-touch-icon.png', 'manifest.webmanifest']) expect(html).toContain('%BASE_URL%' + name);
  });
});
