import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';

const source = new URL('../assets/icon-source/piggy-original.png', import.meta.url);
const destination = new URL('../public/', import.meta.url);
await mkdir(destination, {recursive: true});
for (const [name, size] of [['app.png', 512], ['app-192.png', 192], ['apple-touch-icon.png', 180], ['favicon.png', 32]]) {
  await sharp(source.pathname).rotate().resize(size, size, {fit: 'contain', background: '#ffffff'})
    .flatten({background: '#ffffff'}).png({compressionLevel: 9, palette: true, colours: 256, dither: 1})
    .toFile(new URL(name, destination).pathname);
}
