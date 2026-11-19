// github.io 用の解除だけの Service Worker。デプロイ時に tools/split-sites.sh が github.io の sw.js をこれに差し替える。
// すでに入っている端末で sm27- のキャッシュを消し、この登録を解除して、開いているページを読み込み直す
// （sw.js を消すだけでは、古い Service Worker が残って古いカレンダーを出し続けるため）。同じオリジンの運行情報には触れない。
// fetch を扱わないので、解除までの間もページはネットワークから取得する。
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("sm27-")).map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      await Promise.all(clients.map((c) => c.navigate(c.url).catch(() => {})));
    })()
  );
});
