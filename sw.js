// Flèchemania – réseau d'abord (sans cache HTTP), repli sur le cache hors ligne
const V='fileclat-v7',CORE=['./','./index.html','./manifest.json','./niveaux.json','./gen-niveaux.js','./vendor/three.module.min.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>fetch(new Request(u,{cache:'reload'})).then(n=>{if(n.ok)return c.put(u,n)}).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('fileclat')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 const nav=r.mode==='navigate';
 e.respondWith(fetch(new Request(r.url,{cache:'reload',credentials:'same-origin'})).then(n=>{if(n.ok){const c=n.clone();caches.open(V).then(x=>x.put(nav?'./index.html':r,c))}return n}).catch(()=>caches.match(nav?'./index.html':r).then(m=>m||caches.match('./index.html'))))});
