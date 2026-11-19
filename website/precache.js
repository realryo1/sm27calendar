// 公開先。デプロイ時に tools/split-sites.sh が書き換える（"app"：新しいドメイン（Vercel）、"pages"：github.io）。手元は "dev"。
// index.html（マニフェスト）・nav.js（サイドバー）・pwa.js（PWA と引っ越しの案内）・app.js（更新ボタン）が見る。index.html では最初に読み込む。
// github.io は PWA を外している（保存はしない）が、更新ボタンが取得する一覧としてこのファイルを使う
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
  "image/yukimiku_h_2027.png": 1,
  "image/yukimiku_y_2027.png": 1,
};
// 引っ越しの案内（github.io と手元）で表示する新しいアイコン（Vercel ではデプロイ時に image/app/ を削除するため含めない）
if (self.SM27_SITE !== "app") self.PRECACHE_IMAGES["image/app/icon-maskable-512.png"] = 1;
// github.io はマニフェストを消している（tools/split-sites.sh）ので、更新ボタンで取得しない
if (self.SM27_SITE === "pages") self.PRECACHE = self.PRECACHE.filter((p) => !p.endsWith(".webmanifest"));

// グッズ（goods/）と会場マップ（map/。データと一覧の部品は goods/ のもの）。サイドバーから開く。
// github.io ではサイドバーを出さないので、更新ボタンでも取得しない
self.PRECACHE_GOODS = [
  "goods/",
  "goods/index.html",
  "goods/common.css",
  "goods/list.css",
  "goods/goods.css",
  "goods/embed.js",
  "goods/data-2027.js",
  "goods/data-2026fix.js",
  "goods/goodslist.js",
  "goods/wishlist.js",
  "goods/goods.js",
  "map/",
  "map/index.html",
  "map/map.css",
  "map/map.js",
];
if (self.SM27_SITE !== "pages") self.PRECACHE.push(...self.PRECACHE_GOODS);
