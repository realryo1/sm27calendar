# 運行情報 Worker（試験版）

`website/delay/` に表示する運行情報を集める Cloudflare Worker です。設計の元は `document/tienResearch.md`。

- Cron（5分ごと、毎時 :02, :07, …。新千歳空港 FIS の更新 :01, :06, … の直後）で各事業者から取得し、Workers KV に1本の JSON（キー `status`）として保存
- `GET /status.json` で KV の JSON を `Access-Control-Allow-Origin: *` 付きで返す（エッジで60秒キャッシュ）
- 閲覧者が増えても、事業者サイトへのアクセスは5分に1回のまま

## 対応状況

| 対象 | 取得元 | 状態 |
| --- | --- | --- |
| JR北海道 | `webunkou/json/area/area_01.json`（全線区の本日・明日の 0/1） | 対応 |
| 札幌市営地下鉄 | `operationstatus.city.sapporo.jp/unkojoho/top.html` | 対応 |
| 新千歳空港（国内線） | `hokkaido-airports.com/api/v1/new-chitose/static/fis/domestic/today.json` | 対応 |
| 市電・バス・高速道路・フェリー | — | 未対応（ページでは公式リンクのみ） |

資料との違い：JR は `senku_xx.json` ではなく `area_01.json` 1本で全線区が取れる。地下鉄は交通局トップではなく別ドメインの HTML パーツ。空港は HTML の表ではなく JSON がある。

## 手元で収集だけ試す（Cloudflare 不要）

```sh
node worker/scripts/collect-local.mjs            # 標準出力へ
node worker/scripts/collect-local.mjs out.json   # ファイルへ
```

事業者サイトへ実際にアクセスするので、連続で実行しないこと。

## Cloudflare への公開（GitHub 連携で自動デプロイ）

KV（`DELAY_KV`）はダッシュボードで作成済みで、ID は `wrangler.toml` に入れてある。

1. Cloudflare ダッシュボードの **Compute → Workers & Pages → Create → Import a repository** でこのリポジトリを連携する
   - Project name：`sm27-delay`（`wrangler.toml` の `name` と同じ）
   - Root directory：`worker`
   - Build command：空欄 / Deploy command：`npx wrangler deploy`
2. 作成後、**Settings → Build → Build watch paths** を `worker/*` にする（`website/` だけの変更ではデプロイしない）
3. 以降は `main` に push すれば自動でデプロイされる
4. 表示された `https://sm27-delay.<アカウント名>.workers.dev` を `website/delay/delay.js` の `ENDPOINT` に `/status.json` 付きで入れる  
   Cron が初めて動くまで（最大5分）は 503 を返す

## 手元で Worker ごと動かす

`cd worker` → `npm install` → `npm run dev`（KV は手元の仮のものが使われる）  
別のターミナルで `curl "http://localhost:8787/__scheduled?cron=2-59/5+*+*+*+*"` を叩くと収集が1回動き、`http://localhost:8787/status.json` で結果を見られる。  
ページ側は Live Server などで `website/delay/?api=http://localhost:8787/status.json` を開く（`?api=` は localhost で開いたときだけ有効）。

## 無料枠の目安

- Workers リクエスト：1日10万回
- KV 書き込み：1日1,000回（5分ごとで1日288回）
- KV 読み取り：1日10万回（エッジで60秒キャッシュするので実際はもっと少ない）

## 注意

- JR北海道と札幌市の配信元は Imperva（ボット対策）の配下にあり、Cloudflare からのアクセスが弾かれる可能性がある。公開後に `meta.source_errors` を確認すること。弾かれた事業者は前回のデータを残したまま `ok: false` になり、ページには公式リンクが出る
- User-Agent にはプロジェクト名とサイトの URL を入れている（`src/http.js`）。ブラウザを装わない
- 事業者の文章（遅れの理由などの長文）は取り込まず、状態・便名・時刻などの事実だけを扱う
