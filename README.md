# SNOWMIKU2027非公式カレンダー

SNOWMIKU2027（2027.2.5〜2.7）のメインイベント・LIVE・DigitalStars・ファンメイドライブ・雪ミク電車を、会場別にまとめた非公式カレンダーです。雪ミク電車の在線予測つき。

公開URL:https://realryo1.github.io/sm27calendar/

> 本サイトは非公式です。情報の正確性には留意していますが、最終的な判断は利用者が行ってください。

## 特長

- 会場ごとの時間軸で予定を一覧（ピンチで拡大縮小、予定タップで詳細）
- 公式イベント／ファン主催イベントのバッジ表示、時間未発表のものは「時間仮」として明示
- 雪ミク電車の在線予測
- PWA対応（ホーム画面に追加、オフライン閲覧）

## 構成

ビルド不要の静的サイトです（HTML/CSS/JavaScriptのみ）。

|パス|内容|
|---|---|
|`website/index.html`|ページ本体（title/description/OGPはここに静的に記述）|
|`website/data.js`|イベント・会場・日付・画面の文言、最終更新日時|
|`website/app.js`|カレンダー描画|
|`website/train.js`/`train-view.js`|雪ミク電車の時刻表と在線予測|
|`website/pwa.js`/`sw.js`/`precache.js`/`manifest.webmanifest`|PWA関連|
|`website/style.css`|スタイル|
|`website/delay/`|運行情報の試験ページ（JR北海道・札幌市営地下鉄・新千歳空港。メインページからは未リンク）|
|`worker/`|運行情報を5分ごとに集めて配信するCloudflareWorker（[worker/README.md](worker/README.md)）|
|`document/`|運行情報の調査資料（`tienResearch.md`）と実装・進捗のまとめ（`delayProgress.md`）|
|`tools/`|アイコン・OGP画像の元になるHTML、デプロイスクリプト（`deploy-pages.mjs`）|

## PWA

- オフライン保存するファイルの一覧は`precache.js`（`self.PRECACHE`）。`sw.js`と更新ボタン（`app.js`の`hardRefresh`）が共通で参照します。
- `sw.js`はstale-while-revalidate。`cache:"no-cache"`/`"reload"`のリクエストはネットワークから取得し、成功したらキャッシュも更新します。
- 更新ボタンは全ファイルを取得し直し、1つでも失敗したら何も消さずに中断します（オフラインで真っ白にならないため）。成功したらキャッシュ削除・ServiceWorker登録解除・`sm27-install-dismissed`と`sm27-board-w`（2カラムの分割率）を削除してリロードします。
- `website/delay/`はPWAの対象外で、キャッシュしません。

## 運行情報

- 事業者サイトへはWorkerのCron（5分ごと）だけがアクセスし、ページはWorkerから取得します。
- 事業者の文章は取り込まず、状態・便名・時刻などの事実だけを扱います。企業ロゴは使いません（色のみ使用）。
- 詳細は[document/delayProgress.md](document/delayProgress.md)。

## ローカルで確認

`website/`を静的サーバーで配信。VSCode拡張のLiveServerなどを使用してください。

## 情報の更新

- イベント情報は`website/data.js`を編集します。
- `updatedAt`（最終更新日時）はデプロイ時に自動で書き換わります。

## 画像の形式

`website/image/`のPNG（`favicon-32.png`を除く）はPNG-8（256色、中央値カット・ディザなし）です。オクトリーやディザありでは背景のグラデーションに段差やノイズが出ます。`tools/`で書き出した直後は24bitなので、次の手順で減色します。

```python
fromPILimportImage

im=Image.open("ogp.png").convert("RGB")
im.quantize(256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).save("ogp.png",optimize=True)
```

## デプロイ

Actionsで手動実行するか、VSCodeでF5（「Deploy:push→GitHubPages」）を実行すると、`main`をpushしてGitHubActionsの[deploy-pages.yml](.github/workflows/deploy-pages.yml)を起動し、`website/`がGitHubPagesに公開されます。未コミットの変更があると中断します。

## 注意

- 本プロジェクトはSNOWMIKU公式や初音銀華祭とは無関係です。キャラクターに関する権利は各権利者に帰属します。
- 運行情報の取得について、権利者からの停止の要望があった際には即時停止いたします。

## 問い合わせ

[@realryo1](https://x.com/realryo1) のDM、リプライ

realryo1 アットマーク ジーメール ドット コム（検索避けです）
