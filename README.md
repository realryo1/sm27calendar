# SNOWMIKU2027 非公式カレンダー

SNOW MIKU 2027（2027.2.5〜2.7）のメインイベント・LIVE・Digital Stars・ファンメイドライブ・雪ミク電車を、会場別にまとめた非公式カレンダーです。雪ミク電車の在線予測つき。

公開URL: https://realryo1.github.io/sm27calendar/

> 本サイトは非公式です。情報の正確性には留意していますが、最終的な判断は利用者が行ってください。

## 特長

- 会場ごとの時間軸で予定を一覧（ピンチで拡大縮小、予定タップで詳細）
- 公式イベント／ファン主催イベントのバッジ表示、時間未発表のものは「時間仮」として明示
- 雪ミク電車の在線予測
- PWA 対応（ホーム画面に追加、オフライン閲覧）

## 構成

ビルド不要の静的サイトです（HTML / CSS / JavaScript のみ）。

| パス | 内容 |
| --- | --- |
| `website/index.html` | ページ本体（title / description / OGP はここに静的に記述） |
| `website/data.js` | イベント・会場・日付・画面の文言、最終更新日時 |
| `website/app.js` | カレンダー描画 |
| `website/train.js` / `train-view.js` | 雪ミク電車の時刻表と在線予測 |
| `website/pwa.js` / `sw.js` / `manifest.webmanifest` | PWA 関連 |
| `website/style.css` | スタイル |
| `website/delay/` | 運行情報の試験ページ（JR北海道・札幌市営地下鉄・新千歳空港。メインページからは未リンク） |
| `worker/` | 運行情報を5分ごとに集めて配信する Cloudflare Worker（[worker/README.md](worker/README.md)） |
| `document/` | 運行情報の調査資料（`tienResearch.md`）と実装・進捗のまとめ（`delayProgress.md`） |
| `tools/` | アイコン・OGP 画像の元になる HTML |

## ローカルで確認

`website/` を任意の静的サーバーで配信してください。Service Worker を使うため、`file://` ではなく HTTP 経由で開きます。

```sh
cd website
python -m http.server 8000
# http://localhost:8000/
```

## 情報の更新

- イベント情報の追加・修正は `website/data.js` を編集します。
- サイト名や説明文を変える場合は、`index.html` の title / meta タグも合わせて直してください。
- `updatedAt`（最終更新日時）はデプロイ時に自動で書き換えられます。

## 画像の形式

`website/image/` の PNG（`favicon-32.png` を除く）は PNG-8（256色）に減色しています。中央値カット（MEDIANCUT）でディザなしの設定です。オクトリーや、ディザありの減色では、背景のグラデーションに段差やノイズが出ました。

`tools/` で書き出した直後の画像は減色前（24bit）になるので、置き換えるときは次の手順で減色してください。

```python
from PIL import Image

im = Image.open("ogp.png").convert("RGB")
im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save("ogp.png", optimize=True)
```

## デプロイ

GitHub Actions の `Deploy website to GitHub Pages`（[deploy-pages.yml](.github/workflows/deploy-pages.yml)）を手動実行すると、`website/` が GitHub Pages に公開されます。

## 注意

- 公開リポジトリのため、公式サイトの保存データ（`official/`）はコミットしません。利用してよいのはカラーパレットや事実情報のみです。
- 本プロジェクトは SNOW MIKU 公式や初音銀華祭とは無関係です。キャラクターに関する権利は各権利者に帰属します。

## 問い合わせ

[@realryo1](https://x.com/realryo1)
