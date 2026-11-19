#!/usr/bin/env bash
# 公開先ごとに分ける（deploy-pages.yml と、手元の試験 tools/test-sites.mjs で共用）。
# 使い方：APP_URL=https://… bash tools/split-sites.sh <新しいドメイン用のフォルダ> <github.io用のフォルダ>
#   1つ目のフォルダ（website/ の写し）をそのまま新しいドメイン用に書き換え、2つ目に github.io 用を作る。
# precache.js の SM27_SITE（サイドバー・保存する範囲・引っ越しの案内）・新ドメインの manifest.webmanifest の id（"/"）を書き換える。
# 新しいドメインのアイコン（image/app/）があれば image/ の同じ名前のファイルに上書きする（github.io は今のアイコンのまま。
# github.io では引っ越しの案内に新しいアイコンを出すので image/app/ を残す）。
# github.io は OGP とインストール（マニフェスト）を消し、sw.js を解除用（tools/sw-pages.js）に差し替える（PWA は新しいドメインだけ）。
# canonical（両方）と引っ越しの案内の行き先（data.js の migrate.appUrl）が APP_URL と同じか確かめる
set -euo pipefail
APP="$1"
PAGES="$2"
TOOLS="$(cd "$(dirname "$0")" && pwd)"
: "${APP_URL:?APP_URL を指定してください}"

rm -rf "$PAGES"
cp -r "$APP" "$PAGES"
sed -i 's#"id": "/sm27calendar/"#"id": "/"#' "$APP/manifest.webmanifest"
grep -q '"id": "/"' "$APP/manifest.webmanifest"
sed -i 's/^self.SM27_SITE = "dev";/self.SM27_SITE = "app";/' "$APP/precache.js"
sed -i 's/^self.SM27_SITE = "dev";/self.SM27_SITE = "pages";/' "$PAGES/precache.js"
grep -q 'SM27_SITE = "app"' "$APP/precache.js"
grep -q 'SM27_SITE = "pages"' "$PAGES/precache.js"
grep -q "appUrl: \"${APP_URL}\"" "$PAGES/data.js"
sed -i '/<!-- OGP:start -->/,/<!-- OGP:end -->/d; /<!-- PWA:start -->/,/<!-- PWA:end -->/d' "$PAGES/index.html"
! grep -q -E 'property="og:|name="twitter:|<link rel="manifest"' "$PAGES/index.html"
rm -f "$PAGES/manifest.webmanifest" "$PAGES/manifest-dev.webmanifest"
cp "$TOOLS/sw-pages.js" "$PAGES/sw.js"
grep -q "rel=\"canonical\" href=\"${APP_URL}\"" "$APP/index.html"
grep -q "rel=\"canonical\" href=\"${APP_URL}\"" "$PAGES/index.html"
grep -q "og:url\" content=\"${APP_URL}\"" "$APP/index.html"
if [ -d "$APP/image/app" ]; then cp "$APP"/image/app/* "$APP/image/"; fi
rm -rf "$APP/image/app"
echo "split-sites: OK"
