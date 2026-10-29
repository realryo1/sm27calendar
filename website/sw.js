// オフライン閲覧用の Service Worker
// 初回に全ファイルを保存し、以降はキャッシュから即表示しつつ裏で最新に更新する（stale-while-revalidate）。
// ファイルを追加・削除したときは precache.js を更新し、VERSION を上げる。
const VERSION = "v16";
const CACHE = `sm27-${VERSION}`;
importScripts("precache.js"); // self.PRECACHE（保存するファイルの一覧）
const PRECACHE = self.PRECACHE;
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
  // delay/ は姉妹プロジェクト（運行情報）への転送ページ。キャッシュを通すとカレンダーが返るので、そのまま取得させる
  if (sameOrigin && url.pathname.includes("/delay/")) return;
  // test_ で始まるフォルダは試験ページ（グッズマップなど）。PWA の対象外で、キャッシュを通すとカレンダーが返るので、そのまま取得させる
  if (sameOrigin && url.pathname.includes("/test_")) return;

  // index.html はデプロイのたびに自サイトのファイルへ ?v=（版）を付けて読み込む（deploy-pages.yml）。キャッシュは版を外した URL で持つ
  const plain = sameOrigin ? url.origin + url.pathname : req;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // マニフェストは常にネットワーク優先にする（古い内容を返すと、インストール済みアプリの表示設定などの更新が遅れるため）
      if (sameOrigin && url.pathname.endsWith(".webmanifest")) {
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return cache.match(req);
        }
      }
      // ページからの最新確認（cache: no-cache / reload）はキャッシュを返さず、取得できたらキャッシュも更新する
      if (sameOrigin && (req.cache === "no-cache" || req.cache === "reload")) {
        const res = await fetch(req);
        if (res.ok) cache.put(plain, res.clone());
        return res;
      }
      // ?at= などのクエリ付きでもページ本体はキャッシュを使う
      const key = sameOrigin && req.mode === "navigate" ? "index.html" : plain;
      const cached = await cache.match(key, { ignoreSearch: sameOrigin });
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
