const CACHE = "english3000-v72";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./words.js",
  "./manifest.json",
  "./icon.svg",
  "./images/strawberry.png",
  "./images/boss-monster1.png",
  "./images/boss-monster2.png",
  "./images/learned-dragon.jpg",
  "./images/avatar-haohao.png",
  "./images/pets/shadow-cat.png",
  "./images/pets/meteor.png",
  "./images/pets/rag-bear.png",
  "./images/pets/patch-bear.png",
  "./images/pets/lolli-bunny.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
