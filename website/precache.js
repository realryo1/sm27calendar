// オフライン用に保存するファイルの一覧（sw.js と、更新ボタンの取得対象で共用）
// ファイルを追加・削除したときはここを更新し、sw.js の VERSION を上げる。
self.PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "precache.js",
  "data.js",
  "app.js",
  "train.js",
  "train-view.js",
  "pwa.js",
  "manifest.webmanifest",
  "favicon.ico",
  "image/favicon-32.png",
  "image/icon-512.png",
  "image/icon-maskable-512.png",
  "image/souchou.png",
];
