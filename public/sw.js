const CACHE='piggy-island-v2';
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const response=await fetch('/cards/manifest.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Card manifest unavailable');
  const cards=await response.clone().json();
  if(!Array.isArray(cards)||!cards.every(card=>Number.isSafeInteger(card.id)&&card.id>=0&&/^c\d+\.(jpg|jpeg|png|webp|avif|tif|tiff)$/i.test(card.file)))throw new Error('Invalid card manifest');
  await cache.addAll(['/', '/index.html','/app.png','/favicon.ico','/manifest.webmanifest',...cards.map(card=>`/cards/${card.file}`),...['bgm_main','sfx_celebrate','sfx_click','sfx_correct','sfx_unlock','sfx_wrong'].map(n=>`/audio/${n}.mp3`)]);
  await cache.put('/cards/manifest.json',response);
  const html=await(await fetch('/')).text();
  const urls=[...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(m=>m[1]);
  await cache.addAll(urls);
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);
  // Refresh the generated catalog even when only image assets changed between builds.
  const cache=await caches.open(CACHE);
  try {
    const response=await fetch('/cards/manifest.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Card manifest unavailable');
    const cards=await response.clone().json();
    await cache.addAll(cards.map(card=>`/cards/${card.file}`));
    await cache.put('/cards/manifest.json',response);
  }catch{/* Installed resources remain usable offline. */}
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(saved=>saved||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
    return response;
  })));
});
