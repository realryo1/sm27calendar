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
|`tools/`|アイコン・OGP画像の元になるHTML、デプロイスクリプト（`deploy-pages.mjs`）|

## PWA

- オフライン保存するファイルの一覧は`precache.js`（`self.PRECACHE`）。`sw.js`と更新ボタン（`app.js`の`hardRefresh`）が共通で参照します。
- `sw.js`はstale-while-revalidate。`cache:"no-cache"`/`"reload"`のリクエストはネットワークから取得し、成功したらキャッシュも更新します。
- デプロイ時に`index.html`から読み込むJS/CSSへ`?v=`（デプロイ時刻）を付けます。更新ボタンで読み込み直したとき、ブラウザが直前のページの古いファイルを使い回さないようにするためです。`sw.js`は`?v=`を外したURLでキャッシュします。
- 更新ボタンは全ファイルを取得し直し、1つでも失敗したら何も消さずに中断します（オフラインで真っ白にならないため）。成功したらキャッシュ削除・ServiceWorker登録解除・`sm27-install-dismissed`と`sm27-board-w`（2カラムの分割率）を削除してリロードします。

## 姉妹プロジェクト

[北海道運行情報](https://github.com/realryo1/hokkaido_delay)（https://realryo1.github.io/hokkaido_delay/、試験版）。札幌・新千歳空港・小樽まわりの交通の運行情報をまとめた非公式ページです。もとはこのリポジトリの`website/delay/`と`worker/`で作っていたもので、2026-10-27に別リポジトリに分けました。

- デザインをそろえるため、向こうの`website/base.css`は、このリポジトリの`style.css`の配色・フォント・背景・フッターを写したものです。`style.css`のそれらを変えたら、向こうも直します。
- 手元では`hokkaido_delay/`に置いて作業しています（`.gitignore`済みの別リポジトリ）。

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

Actionsで手動実行するか、VSCodeでF5（「Deploy:push→GitHubPages」）を実行すると、`main`をpushしてGitHubActionsの[deploy-pages.yml](.github/workflows/deploy-pages.yml)を起動し、`website/`がGitHubPagesに公開されます。未コミットの変更があると中断します。F5の場合は、公開URLの`data.js`が新しくなる（CDNに反映される）まで待ってから完了と表示します。

## 注意

- 本プロジェクトはSNOWMIKU公式や初音銀華祭とは無関係です。キャラクターに関する権利は各権利者に帰属します。

## 問い合わせ

[@realryo1](https://x.com/realryo1) のDM、リプライ

realryo1 アットマーク ジーメール ドット コム（検索避けです）
