const CACHE='gram-arogya-v1.5.8-qr-render2'; const ASSETS=['/','/index.html','/css/style.css','/js/app.js','/images/sunita-tai.webp','/images/gram-arogya-connect-logo.png','/manifest.webmanifest','/doctor.html','/js/doctor.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))))});
