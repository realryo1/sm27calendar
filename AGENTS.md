プロジェクトの概要・構成・仕様はREADME.mdを参照。ここには作業時のルールだけを書く。

全般
・文節に半角スペースを入れないこと。
・official/は著作物なのでコミット禁止。使ってよいのはカラーパレットと事実のみ。
・ドキュメント、コード、ユーザーの返答や希望の食い違いを見つけたら、どれかに寄せず、すべて挙げ、判断を待つ。
・pushしない。ユーザーがF5（.vscode/launch.jsonのDeploy）でまとめてpushする。
・サイト名や説明文を変えたら、website/index.htmlのtitle/metaも直す。
・website/image/のPNGを置き換えたら、READMEの手順でPNG-8に減色する。

姉妹プロジェクト（hokkaido_delay/）
・運行情報はhokkaido_delay/の別リポジトリ。作業するときはhokkaido_delay/AGENTS.mdに従う。
・このリポジトリから運行情報のファイルを参照・読み込みしない（リンクと、.vscode/launch.jsonの一括デプロイは可）。
・style.cssの配色・フォント・背景・フッターを変えたら、hokkaido_delay/website/base.cssも合わせる。

PWA・キャッシュ
・オフライン保存するファイルの一覧はwebsite/precache.jsの1か所だけに持つ。
・ファイルを追加・削除したら、precache.jsを更新し、website/sw.jsのVERSIONを上げる。
・更新ボタンとsw.jsのキャッシュ方針はREADMEの「PWA」の仕様を崩さない。
