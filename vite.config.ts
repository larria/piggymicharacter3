import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export const RELEASE_MARKER = "const RELEASE='v9';";

export async function stampRelease(root: URL) {
  const worker = new URL('sw.js', root);
  const source = await readFile(worker, 'utf8');
  if (source.split(RELEASE_MARKER).length !== 2) {
    throw new Error('Service worker must contain exactly one canonical release marker: ' + RELEASE_MARKER);
  }
  const hash = createHash('sha256');
  async function visit(directory: URL, prefix = '') {
    const entries = await readdir(directory, {withFileTypes: true});
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const path = prefix + entry.name;
      const file = new URL(entry.name, directory);
      if (entry.isDirectory()) await visit(new URL(entry.name + '/', directory), path + '/');
      else {
        // Hash canonical worker source, never the already-stamped result.
        hash.update(path + '\0');
        hash.update(path === 'sw.js' ? source : await readFile(file));
      }
    }
  }
  await visit(root);
  const release = hash.digest('hex');
  await writeFile(worker, source.replace(RELEASE_MARKER, `const RELEASE='${release}';`));
  return release;
}

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')) as {version: string};
export default defineConfig({
  base: '/piggymicharacter3/',
  define: {__APP_VERSION__: JSON.stringify(pkg.version)},
  plugins: [react(), {
    name: 'release-worker-version',
    apply: 'build',
    async closeBundle() { await stampRelease(new URL('./dist/', import.meta.url)); },
  }],
});
