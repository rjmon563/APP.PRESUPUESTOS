// Primero la red (para recibir siempre la última versión), pero sin esperar de más:
// si la red tarda más de ESPERA_RED ms o no hay cobertura, se usa la copia guardada.
const CACHE_NAME = "presupro-v18";
const ESPERA_RED = 3500;
const FILES = ["./", "./index.html", "./app.js",
  "./styles.css", "./partes.js", "./sistemas.js", "./uso.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];
// Librerías de PDF: pesadas, se guardan aparte para que, si fallan, no impidan guardar lo demás
const LIBS = ["./libs/html2pdf.bundle.min.js", "./libs/jspdf.umd.min.js"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(FILES).catch(() => {});
    await Promise.all(LIBS.map(u => cache.add(u).catch(() => {})));
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function redPrimero(e) {
  const req = e.request;
  const cache = await caches.open(CACHE_NAME);
  // ignoreSearch: la página pide app.js?v=N y lo precargado es app.js
  const copia = await cache.match(req, { ignoreSearch: true });
  const red = fetch(req, { cache: "no-cache" }).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  e.waitUntil(red.catch(() => {})); // si se responde con la copia, la actualización termina en segundo plano
  if (!copia) return red;
  const limite = new Promise(r => setTimeout(() => r(copia), ESPERA_RED));
  return Promise.race([red.catch(() => copia), limite]);
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== location.origin) return; // fuentes y demás van por su cuenta
  e.respondWith(redPrimero(e));
});
