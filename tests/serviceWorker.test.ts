import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
const scope='https://example.test/app/';
const prefix=`piggy-learning-${encodeURIComponent(scope)}-`;
function harness(release='B', stores=new Map<string,Map<string,Response>>()) {
  const handlers:Record<string,(event:any)=>void>={};
  let clients=[{id:'one',url:scope}];
  let skips=0;
  const calls:any[]=[];
  const key=(request:any)=>typeof request==='string'?request:request.url;
  const caches={
    keys:async()=>[...stores.keys()],
    delete:async(name:string)=>stores.delete(name),
    open:async(name:string)=>{
      if(!stores.has(name))stores.set(name,new Map());
      const store=stores.get(name)!;
      return {match:async(request:any)=>store.get(key(request))?.clone(),put:async(request:any,response:Response)=>{store.set(key(request),response.clone());},addAll:async(urls:string[])=>{for(const url of urls)store.set(url,new Response('asset'));}};
    },
  };
  const self={registration:{scope},location:{origin:'https://example.test'},clients:{matchAll:async()=>clients,claim:async()=>{}},skipWaiting:async()=>{skips++;},addEventListener:(type:string,fn:any)=>{handlers[type]=fn;}};
  vm.runInNewContext(source.replace("const RELEASE='v9';",`const RELEASE='${release}';`),{self,caches,URL,Response,fetch:async(request:any,options:any)=>{calls.push({url:key(request),options});return new Response(key(request).endsWith('cards/manifest.json')?'[]':'<script src="/app/assets/main-abcdefgh.js"></script>');}});
  async function dispatch(type:string,data:any={}){
    const pending:Promise<any>[]=[];
    let response:Promise<Response>|undefined;
    handlers[type]({...data,waitUntil:(promise:Promise<any>)=>pending.push(promise),respondWith:(promise:Promise<Response>)=>{response=promise;}});
    const result=response?await response:undefined;
    await Promise.all(pending);
    return result;
  }
  async function message(id='one',channel=true){const ack:any[]=[];await dispatch('message',{data:{type:'SKIP_WAITING'},source:{id},ports:channel?[{postMessage:(value:any)=>{ack.push(value);expect(skips).toBe(0);}}]:[]});return ack;}
  return {stores,calls,dispatch,message,setClients:(value:typeof clients)=>{clients=value;},skips:()=>skips};
}
const cache=(body:string,path=scope+'assets/main-abcdefgh.js')=>new Map([[path,new Response(body)]]);
describe('service worker safe lifecycle',()=>{
  it('keeps the canonical build marker exactly once',()=>{expect(source.split("const RELEASE='v9';")).toHaveLength(2);});
  it('installs without automatic takeover and fetches entries without HTTP cache',async()=>{
    const h=harness();await h.dispatch('install');expect(h.skips()).toBe(0);
    for(const path of [scope,scope+'index.html'])expect(h.calls.find(call=>call.url===path).options.cache).toBe('no-store');
    for(const icon of ['app.png','app-192.png','apple-touch-icon.png','favicon.png','favicon.ico'])expect(h.stores.get(prefix+'B')?.has(scope+icon)).toBe(true);
  });
  it('acknowledges explicit single-window requests before skipping',async()=>{const h=harness();expect(await h.message()).toEqual([{ok:true}]);expect(h.skips()).toBe(1);});
  it('rejects another same-scope window including uncontrolled windows',async()=>{
    const h=harness();h.setClients([{id:'one',url:scope},{id:'two',url:scope+'learn'}]);
    expect(await h.message()).toEqual([{ok:false,error:'请先关闭其他小猪学习窗口，再重试更新。'}]);expect(h.skips()).toBe(0);
  });
  it('ignores other scopes but refuses missing channel and wrong source',async()=>{
    const h=harness();h.setClients([{id:'one',url:scope},{id:'two',url:'https://example.test/other/'}]);
    await h.message('one',false);expect(h.skips()).toBe(0);
    expect(await h.message('other')).toEqual([{ok:false,error:'请先关闭其他小猪学习窗口，再重试更新。'}]);expect(h.skips()).toBe(0);
    expect(await h.message()).toEqual([{ok:true}]);
  });
  it('retains actual activated predecessor, not a newer waiting cache, and only cleans its scope',async()=>{
    const stores=new Map([[prefix+'A',cache('A')],['unrelated',cache('other')]]);
    await harness('A',stores).dispatch('activate');
    stores.set(prefix+'waiting',cache('waiting'));
    const h=harness('B',stores);await h.dispatch('activate');
    expect(stores.has(prefix+'A')).toBe(true);expect(stores.has(prefix+'waiting')).toBe(false);expect(stores.has('unrelated')).toBe(true);
    expect(await(await h.dispatch('fetch',{request:new Request(scope+'assets/main-abcdefgh.js')}))!.text()).toBe('A');
    await harness('C',stores).dispatch('activate');expect(stores.has(prefix+'A')).toBe(false);expect(stores.has(prefix+'B')).toBe(true);
  });
  it('migrates an unambiguous legacy cache without deleting it',async()=>{
    const h=harness('B',new Map([[prefix+'v9',cache('legacy')]]));await h.dispatch('activate');
    expect(await(await h.dispatch('fetch',{request:new Request(scope+'assets/main-abcdefgh.js')}))!.text()).toBe('legacy');
  });
  it('preserves ambiguous legacy caches without guessing fallback',async()=>{
    const h=harness('B',new Map([[prefix+'old1',cache('old1')],[prefix+'old2',cache('old2')]]));await h.dispatch('activate');
    expect(h.stores.has(prefix+'old1')).toBe(true);expect(h.stores.has(prefix+'old2')).toBe(true);
    expect(await(await h.dispatch('fetch',{request:new Request(scope+'assets/main-abcdefgh.js')}))!.text()).not.toBe('old2');
  });
  it('does not clean older caches while multiple scoped windows remain',async()=>{
    const stores=new Map([[prefix+'A',cache('A')]]);await harness('A',stores).dispatch('activate');stores.set(prefix+'older',cache('older'));
    const h=harness('B',stores);h.setClients([{id:'one',url:scope},{id:'two',url:scope}]);await h.dispatch('activate');expect(stores.has(prefix+'older')).toBe(true);
  });
  it('never falls back for HTML or unversioned resources',async()=>{
    const stores=new Map([[prefix+'A',new Map(['index.html','assets/main.js','cards/manifest.json','assets/page-abcdefgh.html'].map(path=>[scope+path,new Response('old')] as [string,Response]))]]);
    const h=harness('B',stores);await h.dispatch('activate');
    for(const path of ['index.html','assets/main.js','cards/manifest.json','assets/page-abcdefgh.html'])expect(await(await h.dispatch('fetch',{request:new Request(scope+path)}))!.text()).not.toBe('old');
    expect(h.calls.find(call=>call.url===scope+'index.html').options.cache).toBe('no-store');
  });
});
