# 運行情報 Worker（試験版）

`website/delay/` に表示する運行情報を集める Cloudflare Worker です。設計の元は `document/tienResearch.md`、実装と進捗のまとめは `document/delayProgress.md`。

- Cron（5分ごと、毎時 :02, :07, …。新千歳空港 FIS の更新 :01, :06, … の直後）で各事業者から取得し、Workers KV に1本の JSON（キー `status`）として保存
- `GET /status.json` で KV の JSON を `Access-Control-Allow-Origin: *` 付きで返す（エッジで60秒キャッシュ）
- 閲覧者が増えても、事業者サイトへのアクセスは5分に1回のまま

公開先：`https://sm27-delay.realryo1.workers.dev/status.json`

## ファイル

| パス | 内容 |
| --- | --- |
| `src/index.js` | Cron（収集して KV に保存、`next_update_at` を付ける）と `/status.json` の配信 |
| `src/collect.js` | 全事業者を並行して取得し、1本の JSON にまとめる。失敗した事業者は前回のデータを残す |
| `src/sources/jr.js` | JR北海道（`webunkou/json/area/area_01.json`） |
| `src/sources/subway.js` | 札幌市営地下鉄（`operationstatus.city.sapporo.jp/unkojoho/top.html`） |
| `src/sources/airport.js` | 新千歳空港 国内線（`hokkaido-airports.com/api/v1/new-chitose/static/fis/domestic/today.json`） |
| `src/http.js` | 取得の共通設定（User-Agent、8秒のタイムアウト） |
| `scripts/collect-local.mjs` | Cloudflare を使わずに収集だけ1回動かす |
| `wrangler.toml` | Worker 名・Cron・KV・ログの設定 |

対応していない交通機関（市電・バス・高速道路・フェリー）は、ページに公式リンクだけ出している。

## 変更するときの注意

- Cron の間隔を変えるときは、`src/index.js` の `INTERVAL_MIN` も合わせる（`next_update_at` の計算に使う）
- 空港の時刻は FIS の更新（:01, :06, …）の直後に取るため、Cron は :02, :07, … にしている
- 事業者の文章（遅れの理由などの長文）は取り込まず、状態・便名・時刻などの事実だけを扱う
- User-Agent にはプロジェクト名とサイトの URL を入れている（`src/http.js`）。ブラウザを装わない
- 手元の確認で事業者サイトへ取りに行くときは、連続で実行しないこと

## デプロイ（設定済み）

Cloudflare の GitHub 連携（Workers Builds）で、`main` に push すると自動でデプロイされる。

- Project name：`sm27-delay` / Root directory：`worker` / Build command：空欄 / Deploy command：`npx wrangler deploy`
- Build watch paths：`worker/*`（`website/` だけの変更ではデプロイしない）
- KV（`DELAY_KV`）はダッシュボードで作成し、ID を `wrangler.toml` に入れてある
- Cron の追加・変更は、反映まで最大15分かかる
- ログはダッシュボードの Worker → Observability で見る（`wrangler.toml` の `[observability]`）

## 手元で収集だけ試す（Cloudflare 不要）

```sh
node worker/scripts/collect-local.mjs            # 標準出力へ
node worker/scripts/collect-local.mjs out.json   # ファイルへ
```

## 手元で Worker ごと動かす

`cd worker` → `npm install` → `npm run dev`（KV は手元の仮のものが使われる）  
別のターミナルで `curl "http://localhost:8787/__scheduled?cron=2-59/5+*+*+*+*"` を叩くと収集が1回動き、`http://localhost:8787/status.json` で結果を見られる。  
ページ側は Live Server などで `website/delay/?api=http://localhost:8787/status.json` を開く（`?api=` は localhost で開いたときだけ有効）。

## 無料枠の目安

- Workers リクエスト：1日10万回
- KV 書き込み：1日1,000回（5分ごとで1日288回）
- KV 読み取り：1日10万回（エッジで60秒キャッシュするので実際はもっと少ない）

## 障害時の動き

- 事業者ごとに取得し、失敗した事業者は前回のデータを残したまま `ok: false` にして `meta.source_errors` に記録する。ページにはその事業者の公式リンクが出る
- `updated_at` が20分以上古いと、ページに「情報の更新が止まっています」と出る
- JR北海道と札幌市の配信元は Imperva（ボット対策）の配下。今は Cloudflare から取得できているが、弾かれるようになったら `source_errors` に出る
