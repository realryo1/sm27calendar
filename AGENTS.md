プロジェクトの概要・構成・仕様はREADME.mdを参照。ここには作業時のルールだけを書く。

全般
・文節に半角スペースを入れないこと。
・official/は著作物なのでコミット禁止。使ってよいのはカラーパレットと事実のみ。
・ドキュメント、コード、ユーザーの返答や希望の食い違いを見つけたら、どれかに寄せず、すべて挙げ、判断を待つ。
・pushしない。ユーザーがF5（.vscode/launch.jsonのDeploy）でまとめてpushする。
・サイト名や説明文を変えたら、website/index.htmlのtitle/metaも直す。
・website/image/のPNGを置き換えたら、READMEの手順でPNG-8に減色する。

運行情報（website/delay/・worker/）
・実装と進捗はdocument/delayProgress.mdに書き、進めたら更新する。
・手元の確認でも事業者サイトから連続で取得しない。
・Cronの間隔を変えたらworker/src/index.jsのINTERVAL_MINも合わせる。

PWA・キャッシュ
・オフライン保存するファイルの一覧はwebsite/precache.jsの1か所だけに持つ。
・ファイルを追加・削除したら、precache.jsを更新し、website/sw.jsのVERSIONを上げる。
・更新ボタンとsw.jsのキャッシュ方針はREADMEの「PWA」の仕様を崩さない。
・website/delay/`はPWAの対象外。現時点ではキャッシュ禁止。
