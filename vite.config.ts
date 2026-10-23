import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {readFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export default defineConfig({plugins:[react(),{
  name:'card-catalog-worker-version',
  apply:'build',
  async closeBundle(){
    const manifest=await readFile(new URL('./public/cards/manifest.json',import.meta.url));
    const version=createHash('sha256').update(manifest).digest('hex');
    await appendFile(new URL('./dist/sw.js',import.meta.url),`\n// Card catalog version: ${version}\n`);
  }
}]});