プロジェクトの概要・構成・仕様はREADME.mdを参照。ここには作業時のルールだけを書く。

全般
・文節に半角スペースを入れないこと。コードはこの限りではない。
・official/は著作物なのでコミット禁止。文章は書き写さず、使ってよいのはカラーパレットと事実のみ（画像は次の項目）。
・公式の画像は、イラストを使わない。文字や図柄が中心のもの、一部分、引用の範囲なら使ってよい（出典を示す）。
・ドキュメント、コード、ユーザーの返答や希望の食い違いを見つけたら、どれかに寄せず、すべて挙げ、判断を待つ。
・pushしない。ユーザーがF5（.vscode/launch.jsonのDeploy）でまとめてpushする。
・サイト名や説明文を変えたら、website/index.htmlのtitle/metaも直す。
・website/image/のPNGを置き換えたら、READMEの手順でPNG-8に減色する。
・タスク（これから・食い違い・解決）はdocument/sm27progress.mdに書き、進めたら更新する。仕様や経緯はそこに書かない。
・グッズ・出展ブースマップの構成・仕様・注意はdocument/goodsmap.mdに書く。

姉妹プロジェクト（hokkaido_delay/）
・運行情報はhokkaido_delay/の別リポジトリ。作業するときはhokkaido_delay/AGENTS.mdに従う。
・このリポジトリから運行情報のファイルを参照・読み込みしない（リンクと、サイドバーから公開URLをiframeで開くことと、手元（localhost・127.0.0.1）で開いたときだけ手元のhokkaido_delay/website/をiframeで開くことと、.vscode/launch.jsonの一括デプロイは可）。
・style.cssの配色・フォント・背景・フッターを変えたら、hokkaido_delay/website/base.cssも合わせる。

PWA・キャッシュ
・オフライン保存するファイルの一覧はwebsite/precache.jsの1か所だけに持つ。
・ファイルを追加・削除したら、precache.jsを更新し、website/sw.jsのVERSIONを上げる。
・更新ボタンとsw.jsのキャッシュ方針はREADMEの「PWA」の仕様を崩さない。
・website/delay/（運行情報への転送ページ）はPWAの対象外。キャッシュしない。
・website/test_で始まるフォルダ（試験ページ）もPWAの対象外。キャッシュしない。
