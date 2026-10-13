const CACHE = "taupunkt-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./css/style.css",
  "./vendor/katex/katex.min.css", "./vendor/katex/katex.min.js",
  "./js/util.js", "./js/store.js", "./js/physics.js", "./js/data.js", "./js/mcq.js", "./js/gens.js", "./js/charts.js",
  "./js/tab-karte.js", "./js/lab-wall.js", "./js/lab-glaser.js", "./js/lab-extra.js", "./js/tab-labor.js", "./js/tab-formeln.js",
  "./js/tab-ueben.js", "./js/glaser-drill.js", "./js/tab-pruefung.js", "./js/tab-fortschritt.js", "./js/app.js",
  "./data/cards.json", "./data/formulas.json", "./data/symbols.json", "./data/modules.json",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
