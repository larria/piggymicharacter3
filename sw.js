const RELEASE='809e72c2cae0b06a3570ccf00508dffbcfba2026f9103b66cfe5c7da0587dcca';
const PREFIX=`piggy-learning-${encodeURIComponent(self.registration.scope)}-`;
const CACHE=PREFIX+RELEASE;
// Resolve app assets relative to the service worker scope so the app works both at the domain root and under a sub-path (e.g. GitHub Pages).
const base=new URL(self.registration.scope).pathname;
const url=path=>new URL(path.replace(/^\//,''),self.location.origin+base).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const response=await fetch(url('cards/manifest.json'),{cache:'no-store'});
  if(!response.ok)throw new Error('Card manifest unavailable');
  const cards=await response.clone().json();
  if(!Array.isArray(cards)||!cards.every(card=>Number.isSafeInteger(card.id)&&card.id>=0&&/^c\d+\.(jpg|jpeg|png|webp|avif|tif|tiff)$/i.test(card.file)))throw new Error('Invalid card manifest');
  await cache.addAll([url(''), url('index.html'),url('app.png'),url('favicon.ico'),url('manifest.webmanifest'),url('hanzi/manifest.json'),...cards.map(card=>url(`cards/${card.file}`)),...['bgm-main','bgm-sunny-30s','bgm-sunny-fast-27s','bgm-result-5s','sfx_celebrate','sfx_click','sfx_correct','sfx_unlock','sfx_wrong'].map(n=>url(`audio/${n}.mp3`))]);
  await cache.put(url('cards/manifest.json'),response);
  const html=await(await fetch(url(''))).text();
  const urls=[...html.matchAll(/(?:src|href)="([^" ]*\/assets\/[^" ]+)"/g)].map(m=>new URL(m[1],url('')).href);
  await cache.addAll(urls);
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  // Refresh the generated catalog even when only image assets changed between builds.
  const cache=await caches.open(CACHE);
  try {
    const response=await fetch(url('cards/manifest.json'),{cache:'no-store'});
    if(!response.ok)throw new Error('Card manifest unavailable');
    const cards=await response.clone().json();
    await cache.addAll(cards.map(card=>url(`cards/${card.file}`)));
    await cache.put(url('cards/manifest.json'),response);
  }catch{/* Installed resources remain usable offline. */}
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  if(!new URL(event.request.url).pathname.startsWith(base))return;
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(saved=>saved||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
    return response;
  })));
});
