# SNOWMIKU2027非公式カレンダー

SNOWMIKU2027（2027.2.4〜2.7）のメインイベント・LIVE・DigitalStars・チ・カ・ホ・ファンメイドライブ・雪ミク電車を、会場別にまとめた非公式カレンダーです。雪ミク電車の在線予測つき。

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
|`website/util.js`|共通の小さな関数（エスケープ・改行・時刻・曜日）。グッズマップも`../util.js`を読む|
|`website/nav.js`|サイドバー（マップ・グッズ・運行情報への切り替え。github.ioでは出さない。下の「サイドバー」）|
|`website/train.js`/`train-view.js`|雪ミク電車の時刻表と在線予測|
|`website/pwa.js`/`sw.js`/`precache.js`/`manifest.webmanifest`|PWA関連（`precache.js`には公開先`SM27_SITE`も。下の「公開先」）。github.ioの引っ越しの案内は`pwa.js`|
|`website/style.css`|スタイル（ページの隙間は`:root`の`--gap`の1か所で決める。グッズマップも同じ値を使う）|
|`website/delay/`|姉妹プロジェクト（運行情報）への転送ページ（旧URL）|
|`website/goodsmap/`|グッズ・出展ブースマップの試験ページ（`?page=goods`でグッズ一覧。どちらの品も♡でほしいものリストに入れられ、PDFに印刷できる（`wishlist.js`）。売り場ごとにまとめ、企業ブースの品に公式・企業のタグ。既定は2027年の会場の略図＋チ・カ・ホのタブ。`?year=2026`で前年の見本。`noindex`。カレンダーからはサイドバーで開く（github.ioでは出さない））|
|`document/`|タスクリスト（`sm27progress.md`）、グッズ・出展ブースマップ・グッズ一覧の構成・仕様・注意（`goodsmap.md`）|
|`tools/`|アイコン・OGP画像の元になるHTML（新しいドメインのアイコンと、共通のfavicon（`?favicon`）は`icon-app.html`、その案の見比べは`iconnew.html`）、ブースマップのエディタ（`goodsmap-editor.html`）、デプロイスクリプト（`deploy-pages.mjs`）|

## PWA

- オフライン保存するファイルの一覧は`precache.js`（`self.PRECACHE`）。`sw.js`と更新ボタン（`app.js`の`hardRefresh`）が共通で参照します。
- `sw.js`はstale-while-revalidate。`cache:"no-cache"`/`"reload"`のリクエストはネットワークから取得し、成功したらキャッシュも更新します。
- デプロイ時に`index.html`から読み込むJS/CSSへ`?v=`（デプロイ時刻）を付けます。更新ボタンで読み込み直したとき、ブラウザが直前のページの古いファイルを使い回さないようにするためです。`sw.js`は`?v=`を外したURLでキャッシュします。
- Google Fontsは版を付けない別のキャッシュ（`sm27-fonts`）に保存します。大きくて変わらないので、`VERSION`を上げても更新ボタンでも消しません。
- ほしいものリストのライブラリ（cdnjsのqrcode-generator・html2canvas）も、版を付けない別のキャッシュ（`sm27-lib`）に保存します。URLに版が入っていて変わらないので、キャッシュにあれば取りに行かず、`VERSION`を上げても更新ボタンでも消しません。一度読めば（リストを開けば読み込み始める）オフラインでも使えます。
- 更新ボタンは全ファイルを取得し直し、1つでも失敗したら何も消さずに中断します（オフラインで真っ白にならないため）。成功したらキャッシュ削除（`sm27-fonts`と`sm27-lib`は残す）・ServiceWorker登録解除・`sm27-install-dismissed`と`sm27-board-w`（2カラムの分割率）を削除してリロードします。
- `website/delay/`（運行情報の旧URLの転送ページ）はPWAの対象外で、キャッシュしません。キャッシュを通すと、転送されずにカレンダーが表示されるためです。
- `website/test_`で始まるフォルダ（試験ページ）もPWAの対象外で、キャッシュしません。理由は`delay/`と同じです。
- グッズマップ（`website/goodsmap/`）は、新しいドメインと手元では保存します（`precache.js`の`PRECACHE_GOODSMAP`）。github.ioでは保存せず、キャッシュも通しません（サイドバーを出さないため）。
- ページの要求（iframeも）は、フォルダごとの`index.html`のキャッシュを返します（カレンダーと`goodsmap/`）。

## サイドバー

カレンダーをトップページのまま、左のサイドバー（スマホは画面の下のバー）でマップ・グッズ・運行情報に切り替えます（`nav.js`）。新しいドメインと手元では切り替えボタンを出し、github.ioでは出しません（`precache.js`の`SM27_SITE`が`"pages"`のとき。日付のボタンのガラスのバーは出します）。

- 切り替え先は`nav.items`の`url`のページを、iframeでカレンダーの上に重ねて出します。カレンダーは裏に残るので、戻るとスクロール位置や拡大率がそのままです。
- 2カラム（641px〜）では、日付ボタン（`.day-nav`）を時間割の右下からサイドバーの下に移します（スマホは下のバーのまま）。マップなどを出しているときに押すと、カレンダーに戻ってその日へ移ります。
- 表示の切り替えと日付のボタンはiOSのタブバー（Liquid Glass）風のバーです。幅1024px以上は左のサイドバーに縦、それより狭いとき（スマホと、横幅が足りない2カラム＝横向きのスマホ・開いた折りたたみスマホ・縦向きのタブレット）は下に横に置きます（`style.css`）。幅1023px以下の2カラムでは、日付のバー・市電いまどこ・切り替えバーを下に横一列に並べ、内容には重ねずに時間割・会場一覧の下に置きます。選んでいるボタンの下の板を、押したまま動かして選べます。日付の板は、時間割のスクロールに合わせて今見ている日へ動きます。「市電いまどこ」は日付のバーの右の独立したボタンです。スマホのバーは背景を持たず、すりガラスにして時間割・会場一覧・マップなどの上に直接重ねます。
- URLは`?view=map`などになり、ブラウザの戻るでカレンダーに戻れます（`?view=`付きで開くと、その表示で始まります）。
- iframeのURLには`?embed=1`を付けます。マップ（`goodsmap/`）・グッズ（同じページの`?page=goods`）と運行情報（姉妹プロジェクト）は、これでカレンダーへ戻るリンクやマップの左右の金の帯を隠し、スマホでは重なる下のバーの分だけページの下を空けます。
- 手元（`localhost`・`127.0.0.1`）で開いたときは、運行情報は公開中のページではなく、手元の`hokkaido_delay/website/`を開きます（`nav.items`の`localUrl`）。公開前の変更をカレンダーの中で確かめるためです。
- 表示の中のページから別の表示へ移れます。グッズのブースの番号を押すと、iframeから`postMessage`（`{ type: "sm27-view", view: "map", search, hash }`）を送り、`nav.js`がマップに切り替えて`#booth-○○`を開きます（年が違うときは`?year=`を付けて読み込み直し、同じならハッシュだけ変える）。同じオリジンからのものだけ受け付けます。
- `pass`の名前の引数は、カレンダーを開いたときのURLからその表示のページへ渡します（グッズは`year`と`wish`。ほしいものリストのリンク`?view=goods&wish=…`のため）。渡した`wish`はカレンダーのURLから消します。
- `preload: true`の項目（マップ・グッズ）は、カレンダーを読み込み終えてから裏で読み込みます。運行情報は1分ごとに取得し続けるので、サイドバーに触れたときに読み込み始めます。
- マップ・グッズは、新しいドメインと手元ではオフラインでも表示できます（上の「PWA」）。運行情報は別のドメインのページなので保存できず、オフラインでは表示できません。

## 姉妹プロジェクト

[北海道運行情報](https://github.com/realryo1/hokkaido_delay)（<https://realryo1.github.io/hokkaido_delay/>、試験版）。札幌・新千歳空港・小樽まわりの交通の運行情報をまとめた非公式ページです。もとはこのリポジトリの`website/delay/`と`worker/`で作っていたもので、2026-10-27に別リポジトリに分けました。

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
from PIL import Image

im = Image.open("ogp.png").convert("RGB")
im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save("ogp.png", optimize=True)
```

## デプロイ

Actionsで手動実行するか、VSCodeでF5（「Deploy:カレンダー（sm27calendar）」）を実行すると、`main`をpushしてGitHubActionsの[deploy-pages.yml](.github/workflows/deploy-pages.yml)を起動し、`website/`がGitHubPages（github.io）とVercel（新しいドメイン）に公開されます。未コミットの変更があると中断します。F5の場合は、両方の公開URLの`data.js`が新しくなる（CDNに反映される）まで待ってから完了と表示します。

Vercelへは、ワークフローで加工した（`updatedAt`・`?v=`・圧縮）ファイルをVercelCLIで送ります。Vercelのプロジェクトは、RootDirectoryを`website`にし、Git連携を切っておきます（pushのたびに加工前のリポジトリが公開されないように）。リポジトリのSecretsに`VERCEL_TOKEN`・`VERCEL_ORG_ID`・`VERCEL_PROJECT_ID`が要ります。

### 公開先

同じ`website/`から、ワークフローが公開先ごとに作り分けます。新しいドメインのURLはコードやドキュメントに置かず、ワークフローの`APP_URL`だけに書きます（F5の反映待ちもそこから読みます）。

||新しいドメイン（Vercel）|github.io（GitHubPages）|手元|
|-|-|-|-|
|`precache.js`の`SM27_SITE`|`"app"`|`"pages"`|`"dev"`|
|サイドバー（マップ・グッズ・運行情報）|出す|出さない|出す|
|オフライン保存|カレンダー＋グッズマップ|カレンダーだけ|カレンダー＋グッズマップ|
|アイコン|`website/image/app/`のファイルで、`image/`の同じ名前のファイルを上書き（今は`icon-maskable-512.png`だけ。元は`tools/icon-app.html`）|今のまま|開発用（モノクロ）|
|引っ越しの案内|出さない|`data.js`の`migrate.enabled`が`true`なら、開くたびに出す|`migrate.enabled`が`true`なら出す（見た目の確認用。ボタンの行き先は無い）|

引っ越しの案内の行き先（`migrate.appUrl`）は、ワークフローがgithub.io用の`data.js`にだけ入れます。

**github.ioは廃止します**（同じgithub.io配下のPWAが、Androidでインストールできない不具合があるため）。廃止のあとは、github.ioのPWA（ServiceWorker・キャッシュ・マニフェスト）をすべて消し、新しいドメインへ転送する`index.html`と、解除用の`sw.js`の2つだけにします。`sw.js`は、すでに入っている端末のキャッシュを消して登録を解除するためだけのものです（`sw.js`を消しただけでは、古いServiceWorkerが残って古いカレンダーを出し続けるため）。それまでの間は、上の表のとおりカレンダーだけのPWAとして残し、引っ越しの案内で新しいドメインへ移ってもらいます。

F5で「Deploy:一括（カレンダー＋運行情報）」を選ぶと、このリポジトリと姉妹プロジェクト（`hokkaido_delay/`）のデプロイを同時に実行します（それぞれのリポジトリの`tools/deploy-pages.mjs`。ターミナルは別々に開きます）。未コミットの変更があるリポジトリは、そちらだけ中断します。

## 注意

- 本プロジェクトはSNOWMIKU公式や初音銀華祭とは無関係です。キャラクターに関する権利は各権利者に帰属します。

## 問い合わせ

[@realryo1](https://x.com/realryo1) のDM、リプライ

realryo1 アットマーク ジーメール ドット コム（検索避けです）
