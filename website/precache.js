// 公開先。デプロイ時に deploy-pages.yml が書き換える（"app"：新しいドメイン（Vercel）、"pages"：github.io）。手元は "dev"。
// index.html（マニフェスト）・nav.js（サイドバー）・pwa.js（引っ越しの案内）・sw.js（保存する範囲）が見る。index.html では最初に読み込む
self.SM27_SITE = "dev";

// オフライン用に保存するファイルの一覧（sw.js と、更新ボタンの取得対象で共用）
// ファイルを追加・削除したときはここを更新し、sw.js の VERSION を上げる。
self.PRECACHE = [
  "./",
  "index.html",
  "base.css",
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
];

// 画像の一覧（{ パス: 版 }）。コードとは別の長持ちのキャッシュ（sm27-img）に持ち、更新ボタンでも版が同じなら取り直さない。
// 画像を置き換えたら、その行の版を上げる（上げないと端末に古い画像が残る）。追加・削除したときは、この一覧と sw.js の VERSION を更新する。
self.PRECACHE_IMAGES = {
  "favicon.ico": 1,
  "image/favicon-32.png": 1,
  "image/icon-maskable-512.png": 1,
  "image/souchou.png": 1,
};

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
