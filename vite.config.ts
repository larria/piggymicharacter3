import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export default defineConfig({base:'/piggymicharacter3/',plugins:[react(),{
  name:'release-worker-version',
  apply:'build',
  async closeBundle(){
    const root=new URL('./dist/',import.meta.url),hash=createHash('sha256');
    async function visit(directory:URL,prefix=''){
      const entries=await readdir(directory,{withFileTypes:true});
      entries.sort((a,b)=>a.name.localeCompare(b.name));
      for(const entry of entries){const path=prefix+entry.name,file=new URL(entry.name,directory);if(entry.isDirectory())await visit(new URL(entry.name+'/',directory),path+'/');else if(path!=='sw.js'){hash.update(path+'\0');hash.update(await readFile(file));}}
    }
    await visit(root);
    const worker=new URL('sw.js',root),source=await readFile(worker,'utf8');
    await writeFile(worker,source.replace("const RELEASE='v9';",`const RELEASE='${hash.digest('hex')}';`));
  }
}]});
