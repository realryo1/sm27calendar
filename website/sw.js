// オフライン閲覧用の Service Worker
// 初回に全ファイルを保存し、以降はキャッシュから即表示しつつ裏で最新に更新する（stale-while-revalidate）。
// ファイルを追加・削除したときは precache.js を更新し、VERSION を上げる。
const VERSION = "v32";
const CACHE = `sm27-${VERSION}`;
importScripts("precache.js"); // self.PRECACHE（保存するファイルの一覧）・self.SM27_SITE（公開先）
const PRECACHE = self.PRECACHE;
// フォント（Google Fonts）も保存してオフラインで使う。大きくて変わらないので、版を付けない別のキャッシュに持ち、
// 版の更新でも更新ボタン（app.js の hardRefresh）でも消さない
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
const FONT_CACHE = "sm27-fonts";
// ほしいものリストのライブラリ（cdnjs の qrcode-generator・html2canvas）も保存してオフラインで使う。
// URL に版が入っていて中身が変わらないので、キャッシュにあれば取りに行かない。フォントと同じく版の更新でも更新ボタンでも消さない
const LIB_HOSTS = ["cdnjs.cloudflare.com"];
const LIB_CACHE = "sm27-lib";
// 画像（precache.js の PRECACHE_IMAGES）は { パス: 版 } で、版を付けた URL を鍵に別のキャッシュへ持つ。版が同じなら取り直さず、版の更新でも更新ボタンでも消さない
const IMG_CACHE = "sm27-img";
const IMAGES = self.PRECACHE_IMAGES || {};
const imgKey = (path) => new URL(`${path}?v=${IMAGES[path]}`, self.registration.scope).href;
const IMG_PATHS = new Map(Object.keys(IMAGES).map((p) => [new URL(p, self.registration.scope).pathname, p]));
async function fetchImage(cache, path) {
  const res = await fetch(path, { cache: "reload" });
  if (!res.ok) throw new Error(`fetch failed: ${path}`);
  await cache.put(imgKey(path), res.clone());
  return res;
}
// 版が変わった画像・新しい画像だけ取得し、一覧にない画像と古い版は消す
async function syncImages() {
  const cache = await caches.open(IMG_CACHE);
  const keep = new Set(Object.keys(IMAGES).map(imgKey));
  await Promise.all((await cache.keys()).filter((r) => !keep.has(r.url)).map((r) => cache.delete(r)));
  await Promise.all(Object.keys(IMAGES).map(async (p) => ((await cache.match(imgKey(p))) ? null : fetchImage(cache, p))));
}

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([caches.open(CACHE).then((c) => c.addAll(PRECACHE)), syncImages()]).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("sm27-") && k !== CACHE && k !== FONT_CACHE && k !== LIB_CACHE && k !== IMG_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && LIB_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(LIB_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()); // SRI 付き・crossOrigin で読むので CORS の応答（opaque は保存しない）
        return res;
      })
    );
    return;
  }
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;
  // delay/ は姉妹プロジェクト（運行情報）への転送ページ。キャッシュを通すとカレンダーが返るので、そのまま取得させる
  if (sameOrigin && url.pathname.includes("/delay/")) return;
  // test_ で始まるフォルダは試験ページ（グッズマップなど）。PWA の対象外で、キャッシュを通すとカレンダーが返るので、そのまま取得させる
  if (sameOrigin && url.pathname.includes("/test_")) return;
  // github.io ではグッズマップを保存しない（precache.js）。サイドバーを出さないので、直接開かれたときもそのまま取得させる
  if (sameOrigin && self.SM27_SITE === "pages" && url.pathname.includes("/goodsmap/")) return;

  // 画像は版つきのキャッシュにあればそれを返し、なければ取得して保存する
  if (sameOrigin && IMG_PATHS.has(url.pathname)) {
    const path = IMG_PATHS.get(url.pathname);
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => (await cache.match(imgKey(path))) || fetchImage(cache, path).catch(() => fetch(req)))
    );
    return;
  }

  // index.html はデプロイのたびに自サイトのファイルへ ?v=（版）を付けて読み込む（deploy-pages.yml）。キャッシュは版を外した URL で持つ
  const plain = sameOrigin ? url.origin + url.pathname : req;
  event.respondWith(
    caches.open(sameOrigin ? CACHE : FONT_CACHE).then(async (cache) => {
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
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(plain, res.clone());
          return res;
        } catch (err) {
          // ページ自体の再読み込み（Ctrl+R は no-cache の navigate）はオフラインなら保存済みを返す。
          // それ以外（更新ボタンの取得など）は失敗させる（オフラインで更新が成功したことにならないように）
          if (req.mode !== "navigate") throw err;
          const page = url.pathname.endsWith("/") ? new URL("index.html", url).href : plain;
          const hit = await cache.match(page, { ignoreSearch: true });
          if (hit) return hit;
          throw err;
        }
      }
      // ?at= などのクエリ付きでもページ本体はキャッシュを使う。ページはフォルダごとの index.html（カレンダーと goodsmap/。iframe もここを通る）
      const key = sameOrigin && req.mode === "navigate" && url.pathname.endsWith("/") ? new URL("index.html", url).href : plain;
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
