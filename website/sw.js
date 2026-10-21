// オフライン閲覧用の Service Worker
// 初回に全ファイルを保存し、以降はキャッシュから即表示しつつ裏で最新に更新する（stale-while-revalidate）。
// ファイルを追加・削除したときは PRECACHE を更新し、VERSION を上げる。
const VERSION = "v3";
const CACHE = `sm27-${VERSION}`;
const PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "data.js",
  "app.js",
  "train.js",
  "train-view.js",
  "pwa.js",
  "manifest.webmanifest",
  "favicon.ico",
  "image/favicon-32.png",
  "image/icon-180.png",
  "image/icon-192.png",
  "image/icon-512.png",
  "image/souchou.png",
];
// フォント（Google Fonts）も保存してオフラインで使う
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("sm27-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // ?at= などのクエリ付きでもページ本体はキャッシュを使う
      const key = sameOrigin && req.mode === "navigate" ? "index.html" : req;
      const cached = await cache.match(key, { ignoreSearch: req.mode === "navigate" });
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
