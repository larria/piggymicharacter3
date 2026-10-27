import {createServer} from 'node:http';
import {readFile, stat, mkdir, cp, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const project = fileURLToPath(new URL('../', import.meta.url));
const fixture = resolve(project, 'reports/browser-verification/pwa-ab');
const [command, label = 'A'] = process.argv.slice(2);
if (command === 'capture') {
  if (!['A', 'B'].includes(label)) throw new Error('capture label must be A or B');
  // Vite-only build after the normal checked build; mutate output only, never app/SW source.
  const result = spawnSync('npx', ['vite', 'build'], {cwd: project, stdio: 'inherit'});
  if (result.status !== 0) process.exit(result.status ?? 1);
  await mkdir(fixture, {recursive: true});
  const target = resolve(fixture, label);
  try { await stat(target); throw new Error(`${target} already exists; refuse to overwrite baseline`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await cp(resolve(project, 'dist'), target, {recursive: true});
  // Distinct index + SW bytes exercise same-semver updates; marker is fixture-only.
  const marker = `\n<!-- isolated PWA fixture ${label} -->\n`;
  const html = resolve(target, 'index.html');
  await writeFile(html, (await readFile(html, 'utf8')) + marker);
  const worker = resolve(target, 'sw.js');
  const source = await readFile(worker, 'utf8');
  if ((source.match(/const RELEASE='[a-f0-9]{64}';/g) ?? []).length !== 1) {
    throw new Error('Fixture requires exactly one stamped production RELEASE');
  }
  const {createHash} = await import('node:crypto');
  const release = createHash('sha256').update(source).update(marker).digest('hex');
  await writeFile(worker, source.replace(/const RELEASE='[a-f0-9]{64}';/, `const RELEASE='${release}';`) + `\n// isolated fixture ${label}\n`);
  console.log(`Captured ${label}: ${target}, release ${release}`);
} else if (command === 'serve') {
  let active = label;
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg'};
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'POST' && url.pathname === '/__fixture/swap') {
        const next = url.searchParams.get('build');
        if (!['legacy', 'A', 'B'].includes(next)) { res.writeHead(400).end('Invalid build'); return; }
        await stat(resolve(fixture, next, 'index.html'));
        active = next; res.writeHead(200).end(`Serving ${active}`); return;
      }
      if (url.pathname === '/__fixture/status') { res.end(active); return; }
      if (!url.pathname.startsWith('/piggymicharacter3/')) { res.writeHead(404).end(); return; }
      const root = resolve(fixture, active);
      const relative = decodeURIComponent(url.pathname.slice('/piggymicharacter3/'.length)) || 'index.html';
      const file = resolve(root, relative);
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      res.writeHead(200, {'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store'});
      res.end(await readFile(file));
    } catch { res.writeHead(404).end('Not found'); }
  });
  server.listen(Number(process.env.PORT || 4178), '127.0.0.1', () => console.log(`PWA fixture ${active}: http://localhost:${server.address().port}/piggymicharacter3/`));
} else {
  console.log('node scripts/pwa-ab-fixture.mjs capture A|B\nnode scripts/pwa-ab-fixture.mjs serve legacy|A|B\nSwap: POST /__fixture/swap?build=B (same origin, no restart)');
}
