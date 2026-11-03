// 公開先。デプロイ時に deploy-pages.yml が書き換える（"app"：新しいドメイン（Vercel）、"pages"：github.io）。手元は "dev"。
// index.html（マニフェスト）・nav.js（サイドバー）・pwa.js（引っ越しの案内）・sw.js（保存する範囲）が見る。index.html では最初に読み込む
self.SM27_SITE = "dev";

// オフライン用に保存するファイルの一覧（sw.js と、更新ボタンの取得対象で共用）
// ファイルを追加・削除したときはここを更新し、sw.js の VERSION を上げる。
self.PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "precache.js",
  "util.js",
  "data.js",
  "nav.js",
  "app.js",
  "train.js",
  "train-view.js",
  "pwa.js",
  "manifest.webmanifest",
  "favicon.ico",
  "image/favicon-32.png",
  "image/icon-maskable-512.png",
  "image/souchou.png",
];

// グッズマップ（マップ・グッズ一覧。サイドバーから開く）。github.io ではサイドバーを出さないので保存しない（sw.js もキャッシュを通さない）
self.PRECACHE_GOODSMAP = [
  "goodsmap/",
  "goodsmap/index.html",
  "goodsmap/goodsmap.css",
  "goodsmap/goods.css",
  "goodsmap/data-2027.js",
  "goodsmap/data-2026fix.js",
  "goodsmap/goodslist.js",
  "goodsmap/wishlist.js",
  "goodsmap/goodsmap.js",
  "goodsmap/goods.js",
];
if (self.SM27_SITE !== "pages") self.PRECACHE.push(...self.PRECACHE_GOODSMAP);
