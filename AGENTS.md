# AGENTS.md

プロジェクト名は「SNOWMIKU2027 非公式カレンダー」
公開リポジトリのため、/official/フォルダ内のデータをコミットに含めない。使用可能なのはカラーパレットや事実のみ。

## PWA・キャッシュまわりのルール

- オフライン保存するファイルの一覧は `website/precache.js`（`self.PRECACHE`）に1か所だけ持つ。`website/sw.js` は `importScripts` で、更新ボタン（`website/app.js` の `hardRefresh`）は `self.PRECACHE` で参照する。
- ファイルごと追加・削除したら、`precache.js` の一覧を更新し、`website/sw.js` の `VERSION` を上げる。
- 更新ボタンは、取得に1つでも失敗したら何も消さずに中断する（オフラインで真っ白にならないため）。成功したらキャッシュ削除・Service Worker 登録解除・`sm27-install-dismissed` の削除をしてリロードする。
- `sw.js` は、`cache: "no-cache"` / `"reload"` のリクエストをキャッシュを返さずネットワークから取得し、成功したらキャッシュも更新する。それ以外は stale-while-revalidate。
