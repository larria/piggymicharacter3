const RELEASE='1a12d0d73761828795accf7644112b14ca337939ae3b23f056af96892f145916';
const PREFIX=`piggy-learning-${encodeURIComponent(self.registration.scope)}-`;
const CACHE=PREFIX+RELEASE;
const META=PREFIX+'lineage';
// Resolve assets and window checks relative to this registration, including sub-path installs.
const base=new URL(self.registration.scope).pathname;
const url=path=>new URL(path.replace(/^\//,''),self.registration.scope).href;
const lineageURL=url('__sw_lineage__');
const inScope=value=>{const parsed=new URL(value);return parsed.origin===self.location.origin&&parsed.pathname.startsWith(base);};
const windows=async()=> (await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(client=>inScope(client.url));
const readLineage=async()=>{const saved=await(await caches.open(META)).match(lineageURL);return saved? saved.json():null;};
const validCache=name=>typeof name==='string'&&name.startsWith(PREFIX)&&name!==META;
const validCards=cards=>Array.isArray(cards)&&cards.every(card=>Number.isSafeInteger(card.id)&&card.id>=0&&/^c\d+\.(jpg|jpeg|png|webp|avif|tif|tiff)$/i.test(card.file));
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const response=await fetch(url('cards/manifest.json'),{cache:'no-store'});
  if(!response.ok)throw new Error('Card manifest unavailable');
  const cards=await response.clone().json();
  if(!validCards(cards))throw new Error('Invalid card manifest');
  // Entry documents must bypass the HTTP cache during installation.
  const entry=await fetch(url(''),{cache:'no-store'});
  if(!entry.ok)throw new Error('App entry unavailable');
  const html=await entry.clone().text();
  await cache.put(url(''),entry);
  const index=await fetch(url('index.html'),{cache:'no-store'});
  if(!index.ok)throw new Error('App entry unavailable');
  await cache.put(url('index.html'),index);
  await cache.addAll([url('app.png'),url('app-192.png'),url('apple-touch-icon.png'),url('favicon.png'),url('favicon.ico'),url('manifest.webmanifest'),url('hanzi/manifest.json'),...cards.map(card=>url(`cards/${card.file}`)),...['bgm-main','bgm-sunny-30s','bgm-sunny-fast-27s','bgm-result-5s','sfx_celebrate','sfx_click','sfx_correct','sfx_unlock','sfx_wrong'].map(n=>url(`audio/${n}.mp3`))]);
  await cache.put(url('cards/manifest.json'),response);
  const urls=[...html.matchAll(/(?:src|href)="([^" ]*\/assets\/[^" ]+)"/g)].map(m=>new URL(m[1],url('')).href).filter(inScope);
  await cache.addAll(urls);
  // Intentionally wait for explicit user consent; never skip waiting on install.
})()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='SKIP_WAITING')return;
  const port=event.ports?.[0];
  if(!port)return; // Activation requires the acknowledged request protocol.
  event.waitUntil((async()=>{
    try{
      const open=await windows();
      if(open.length!==1||open[0].id!==event.source?.id){
        port.postMessage({ok:false,error:'请先关闭其他小猪学习窗口，再重试更新。'});
        return;
      }
      port.postMessage({ok:true});
      await self.skipWaiting();
    }catch(error){port.postMessage({ok:false,error:error instanceof Error?error.message:'Unable to activate update.'});}
  })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=(await caches.keys()).filter(validCache);
  const stored=await readLineage();
  const legacy=keys.filter(key=>key!==CACHE);
  // Cache creation order includes failed/waiting installs, not activation history.
  const previous=stored?.active===CACHE?(validCache(stored.previous)?stored.previous:null):validCache(stored?.active)?stored.active:legacy.length===1?legacy[0]:null;
  await(await caches.open(META)).put(lineageURL,new Response(JSON.stringify({active:CACHE,previous}),{headers:{'Content-Type':'application/json'}}));
  // Ambiguous legacy history is deliberately retained rather than guessed/deleted.
  if((stored||legacy.length<=1)&&(await windows()).length<=1){
    for(const key of keys)if(key!==CACHE&&key!==previous)await caches.delete(key);
  }
  await self.clients.claim();
})()));
const hashedAsset=request=>request.mode!=='navigate'&&new RegExp('^'+base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'assets/[^/]+-[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9.]+$').test(new URL(request.url).pathname)&&!new URL(request.url).pathname.endsWith('.html');
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!inScope(event.request.url))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const saved=await cache.match(event.request);
    if(saved)return saved;
    if(hashedAsset(event.request)){
      const lineage=await readLineage();
      if(validCache(lineage?.previous)&&lineage.previous!==CACHE){
        const old=await(await caches.open(lineage.previous)).match(event.request);
        if(old)return old;
      }
    }
    const request=event.request;
    const path=new URL(request.url).pathname;
    const response=await fetch(request,request.mode==='navigate'||path===base||path===base+'index.html'?{cache:'no-store'}:undefined);
    if(response.ok){const copy=response.clone();event.waitUntil(cache.put(request,copy));}
    return response;
  })());
});
