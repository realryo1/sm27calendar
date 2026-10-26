// グッズ・出展ブースマップのデータ（2026年）。SNOW MIKU 2026 公式サイトの「グッズ情報」「ウイングベイ小樽」から、事実（名前・価格・売り場・ブース番号・位置）だけを書き写したもの。
// 公式の画像（商品写真・会場マップ）は使わない。マップは公式の会場マップのブースの位置をもとに、goodsmap.js が SVG で描く。
// 27年の情報が出たら、このファイルを写して data-2027.js を作り、index.html の読み込みを差し替える（goodsmap.js は年に関係なく使える）。
//
// goods: 公式のグッズ一覧の1件＝1行。ウイングベイで売るもの（出展ブース・ガチャコーナー・公式物販）と、ブースで展示だけするものを載せる。
//   booth: ウイングベイで売る（展示する）ブースの番号。公式の一覧は売り場が「出展ブース」までしか書いていないので、販売元からブースを決めて入れる。
//          1つのグッズは1つのブースにだけ入る（ブースの紹介文に同じ商品が出てきても、ここに無い名前だけを booths の more に書く）。
//   places: 公式の一覧の取り扱い場所（wingbay: ウイングベイ小樽、hmv: HMV、skytown: 雪ミク スカイタウン）。wingbay が無いものは「会場では販売なし」と出る。
//   floor: ウイングベイでの売り場（公式の一覧の表記のまま）。「公式物販」は booth を入れず、公式物販のカードにまとめる。
//   price: 税込の円。unit は「1回」など値段の前に付ける語、note は値段の横に出す補足。
// booths: 出展ブース（公式の「出展ブース」の一覧の順）。no はマップの番号（ガチャコーナーの2社は g1・g2）。
//   more: 公式のグッズ一覧に無いが、ブースの紹介で販売すると書かれているもの（値段は未掲載）。shows: 展示・体験。gifts: 配布・特典。notes: 補足。
//   文章は書き写さず、品名などの事実を短くまとめる。links のラベルも自分で付ける。
// floors: 会場のフロア。1フロアなら切り替えは出ない。座標は公式の会場マップ（1000×840）に合わせている。
window.GM_DATA = {
  year: 2026,
  // データを書き写した日（公式サイトを保存した日）
  updated: "2026-10-27",
  notice: "試験版：2026年（前年）の公式サイトの情報で作った見本です。2027年の出展情報ではありません。",

  event: {
    name: "SNOW MIKU 2026",
    venue: "ウイングベイ小樽",
    days: [
      { label: "2/7", week: "SAT" },
      { label: "2/8", week: "SUN" },
    ],
    place: "6番街4F",
    hours: "10:00〜17:00",
    lastEntry: "16:30",
    fee: "入場無料",
  },

  // 一覧の上に出す説明
  priceNote: "価格は税込。公式のグッズ一覧で売り場が「出展ブース」「ガチャコーナー」のグッズを、販売元のブースに入れています。",

  // 出典（フッター）と、マップの下の公式の会場マップへのリンク
  sources: [
    { label: "グッズ情報", url: "https://snowmiku.com/2026/goods.html" },
    { label: "ウイングベイ小樽（出展ブース）", url: "https://snowmiku.com/2026/location_wingbay.html#wingbay_sponsor" },
  ],
  officialMap: "https://snowmiku.com/2026/images/location/wingbay/map_wingbay_floor.png",
  officialGoods: "https://snowmiku.com/2026/goods.html",

  // ほかの売り場の略称（「HMVでも」などの表示に使う）
  places: { hmv: "HMV", skytown: "スカイタウン" },

  floors: [
    {
      id: "6-4f",
      label: "6番街4F",
      sub: "イベント会場",
      view: [0, 0, 1000, 840],
      // 狭い画面で拡大して開くときに、まん中に来る位置（ブースの並びの中ほど）
      focus: [660, 600],
      // 通れる床の外形（右の出っ張りが出入口）
      outline: "M50 136H779V313L801 335H950V370H993V543H950V757H905V826H168V757H50Z",
      // 売り場・設備。spot は下の spots の名前（押すと説明が出る）。label が無いものは押せるが、Tab では選ばない
      areas: [
        { kind: "exhibit", spot: "exhibit", x: 136, y: 15, w: 219, h: 103, label: ["展示"], size: 18 },
        { kind: "exhibit", spot: "exhibit", x: 136, y: 118, w: 664, h: 18 },
        { kind: "exhibit", spot: "exhibit", x: 678, y: 57, w: 120, h: 38, label: ["展示"], size: 15 },
        { kind: "exhibit", spot: "exhibit", x: 779, y: 95, w: 21, h: 225 },
        { kind: "exhibit", spot: "exhibit", x: 800, y: 317, w: 150, h: 18 },
        { kind: "exhibit", spot: "exhibit", x: 52, y: 408, w: 83, h: 72, label: ["展示"], size: 16 },
        { kind: "exhibit", spot: "exhibit", x: 206, y: 446, w: 107, h: 19 },
        { kind: "exhibit", spot: "exhibit", x: 206, y: 465, w: 19, h: 88 },
        // 中ほどの展示パネル
        { kind: "panel", spot: "exhibit", x: 396, y: 187, w: 35, h: 17 },
        { kind: "panel", spot: "exhibit", x: 462, y: 187, w: 35, h: 17 },
        { kind: "panel", spot: "exhibit", x: 528, y: 187, w: 35, h: 17 },
        { kind: "panel", spot: "exhibit", x: 594, y: 187, w: 35, h: 17 },
        { kind: "panel", spot: "exhibit", x: 659, y: 187, w: 24, h: 17 },
        { kind: "panel", spot: "exhibit", x: 704, y: 187, w: 24, h: 17 },
        { kind: "panel", spot: "exhibit", x: 603, y: 240, w: 17, h: 36 },
        { kind: "panel", spot: "exhibit", x: 659, y: 249, w: 24, h: 18 },
        { kind: "panel", spot: "exhibit", x: 704, y: 249, w: 24, h: 18 },
        { kind: "panel", spot: "exhibit", x: 603, y: 312, w: 17, h: 17 },
        { kind: "panel", spot: "exhibit", x: 659, y: 312, w: 24, h: 17 },
        { kind: "panel", spot: "exhibit", x: 704, y: 312, w: 24, h: 17 },
        // 吹き抜けなどの通れないところ
        { kind: "void", x: 225, y: 465, w: 88, h: 88 },
        { kind: "market", spot: "market", x: 15, y: 167, w: 120, h: 153, label: ["クリエイターズ", "マーケット"], size: 14 },
        { kind: "facility", x: 15, y: 321, w: 37, h: 87, label: ["EV"], size: 14 },
        { kind: "workshop", spot: "workshop", x: 224, y: 278, w: 89, h: 53, label: ["ワーク", "ショップ"], size: 14 },
        { kind: "facility", x: 391, y: 278, w: 144, h: 54, label: ["エスカレーター"], size: 15 },
        { kind: "facility", x: 15, y: 515, w: 121, h: 86, label: ["更衣室"], size: 16 },
        { kind: "facility", x: 15, y: 601, w: 121, h: 41, label: ["ねんどろいど", "引換所"], size: 13 },
        { kind: "facility", spot: "cloak", x: 15, y: 642, w: 121, h: 44, label: ["クローク受付"], size: 15 },
        { kind: "gacha", spot: "gacha", x: 15, y: 686, w: 121, h: 71, label: ["ガチャ", "コーナー"], size: 16 },
        { kind: "official", spot: "official", x: 168, y: 758, w: 214, h: 67, label: ["公式物販"], size: 22 },
        { kind: "shop", x: 400, y: 758, w: 107, h: 67, label: ["雪ミク", "スカイタウン"], size: 15 },
        { kind: "entrance", spot: "entrance", x: 950, y: 370, w: 43, h: 173, label: ["←", "出", "入", "口", "→"], size: 15 },
      ],
      // ブースの位置（左上の座標）。大きさはすべて同じ（goodsmap.js の TILE）
      booths: {
        1: [745, 464], 2: [745, 507], 3: [745, 607], 4: [745, 649],
        5: [681, 464], 6: [681, 507], 7: [681, 607], 8: [681, 649],
        9: [604, 464], 10: [604, 507], 11: [604, 607], 12: [604, 649],
        13: [540, 464], 14: [540, 507], 15: [540, 607], 16: [540, 649],
        17: [464, 464], 18: [464, 507], 19: [464, 607], 20: [464, 649],
        21: [400, 464], 22: [400, 507], 23: [400, 607], 24: [400, 649],
        25: [847, 679], 26: [847, 722],
        27: [745, 758], 28: [681, 758], 29: [616, 758], 30: [552, 758],
      },
    },
  ],

  // マップの売り場・設備を押したときの説明。booths はその場所にあるブース、official は公式物販のカード
  spots: {
    exhibit: {
      title: "主催展示",
      lines: ["テーマ「しあわせパティスリー」の展示や、参加型の展示", "ピアプロのイラストコンテスト（新作スイーツ）の採用作品"],
      links: [{ label: "主催展示", url: "https://snowmiku.com/2026/location_wingbay.html#wingbay_org" }],
    },
    market: {
      title: "クリエイターズマーケット",
      links: [{ label: "クリエイターズマーケット", url: "https://snowmiku.com/2026/location_market.html" }],
    },
    workshop: {
      title: "ワークショップ（有料）",
      lines: ["シーリングスタンプ：1回500円（スタンプカード付き、5分程度）", "ポーラータイパブミラー（キャラパブ）：本体1種類と紐1種類で3,000円、本体の追加は2,000円（10〜20分）"],
      links: [{ label: "ワークショップ", url: "https://snowmiku.com/2026/location_wingbay.html#wingbay_ws" }],
    },
    cloak: {
      title: "クローク（有料）",
      lines: ["1袋（90リットル相当）500円。1日ごと、閉場までに引き取る", "出し入れはできない（預け直すと、もう一度料金がかかる）", "貴重品（財布・チケット・金券など）は預けられない"],
      links: [{ label: "クローク", url: "https://snowmiku.com/2026/location_wingbay.html#wingbay_cloak" }],
    },
    gacha: { title: "ガチャコーナー", booths: ["g1", "g2"] },
    official: { title: "公式物販", official: true },
    entrance: {
      title: "出入口",
      lines: ["入場前に手荷物検査がある。刃物・銃器・火気・ビンなど、人を傷つけるおそれのある物は持ち込めない"],
    },
  },

  booths: [
    {
      no: "1",
      name: "COCOLLABO（ココラボ）",
      org: "株式会社キャラバン",
      more: ["「しろたん×雪ミク」コラボグッズなどの新作"],
      shows: ["「39Culture 2026」のアイテム"],
      links: [{ label: "特設サイト", url: "https://www.cocollabo.net/pages/snowmiku2026" }],
    },
    {
      no: "2",
      name: "チュロス製造所",
      org: "合同会社Bright",
      notes: ["チュロはユキネや音符などの形から選べて、ステッカー付き"],
      links: [{ label: "公式サイト", url: "https://churros-seizousyo.jp/" }],
    },
    {
      no: "3",
      name: "AOZORAGEAR",
      more: ["さいね氏の描きおろしイラストのアウトドアクッキンググッズ", "冬向けの新アイテム（SNOW MIKU 2026で先行販売）"],
      links: [{ label: "公式サイト", url: "https://aozoragear.com/blogs/topics" }],
    },
    {
      no: "4",
      name: "初音ミク エムアイカード",
      gifts: ["ブースの二次元コードを読み込むと、オリジナルグッズ", "申し込むと、その場で木製スタンド（メインビジュアル）とオリジナルアクリルキーホルダー"],
      notes: ["カードの入会受付"],
      links: [{ label: "特設ページ", url: "https://www2.micard.co.jp/card/miku.html?cpn_cd=miku_cfm" }],
    },
    {
      no: "5",
      name: "株式会社タニタ",
      shows: ["イベント限定デザインの業務用体組成計（測定もできる）"],
      links: [{ label: "オンラインショップ", url: "https://www.tanita.co.jp/content/piapro/" }],
    },
    {
      no: "6",
      name: "いたラック",
      org: "株式会社マクビーカタガイ",
      more: ["通常衣装のミクラック"],
      shows: ["グッズを飾って写真を撮れる展示コーナー"],
      links: [{ label: "公式ショップ", url: "https://itarack.stores.jp/" }],
    },
    {
      no: "7",
      name: "株式会社エテルノレシ",
      links: [{ label: "公式サイト", url: "https://www.eternorecit.jp/" }],
    },
    {
      no: "8",
      name: "ムービック",
      more: ["だるまぬいぐるみ"],
      links: [{ label: "グッズ情報", url: "https://www.movic.jp/shop/pages/HatsuneMiku_Series.aspx" }],
    },
    {
      no: "9",
      name: "ぬいぐるみメーカーGift",
      links: [{ label: "公式サイト", url: "https://www.gift-gift.jp/" }],
    },
    {
      no: "10",
      name: "株式会社ホビーストック",
      shows: ["商品の実物"],
      links: [{ label: "公式通販", url: "https://www.hobbystock.jp/" }],
    },
    {
      no: "11",
      name: "コスパ",
      links: [{ label: "グッズ情報", url: "https://www.cospa.com/cospa/event/id/27134" }],
    },
    {
      no: "12",
      name: "初音ミクシンフォニー2026",
      more: ["2025年公演のグッズ（一部）", "CD・Blu-ray"],
      links: [{ label: "公式X", url: "https://x.com/mikusymphony" }],
    },
    {
      no: "13",
      name: "有限会社 橋本漆芸",
      more: ["蒔絵×ピアプロキャラクターズの商品（SNOW MIKU 2026限定品・新作あり）"],
      links: [{ label: "特設サイト", url: "https://makimonogatari.jp/?mode=f1" }],
    },
    {
      no: "14",
      name: "アウリン（AURYN）",
      more: ["ポンチョ", "缶バッジ・クリアファイル・タペストリー（新商品）"],
      links: [
        { label: "オンラインショップ", url: "https://auryn.theshop.jp/" },
        { label: "公式X", url: "https://x.com/auryn_goods" },
      ],
    },
    {
      no: "15",
      name: "和真Palette",
      more: ["PCメガネ"],
      links: [{ label: "グッズ情報", url: "https://washin-palette.jp/item/cat01/SNOWMIKU2026/index.html" }],
    },
    {
      no: "16",
      name: "(株)エンスカイ",
      more: ["そのほかのミク商品"],
      links: [{ label: "公式通販", url: "https://www.enskyshop.com/" }],
    },
    {
      no: "17",
      name: "千本桜",
      more: ["千本桜展（2025年11月東京・12月京都）のグッズ", "新作グッズ", "ACUTEのグッズ"],
      shows: ["music award japan ボーカロイド部門のモノリス"],
      links: [{ label: "公式ショップ", url: "https://snowcrash.booth.pm/" }],
    },
    {
      no: "18",
      name: "Desktop Mate",
      more: ["シリアルコード付きDLカード"],
      shows: ["新DLC 雪ミク「SNOW MIKU 2026 Ver.」のデモ"],
      gifts: ["チラシ・ステッカー"],
      links: [{ label: "公式サイト", url: "https://www.infiniteloop.co.jp/desktopmate/" }],
    },
    {
      no: "19",
      name: "クリプトン・フューチャー・メディア株式会社 デジタルコンテンツチーム",
      gifts: ["公式X（@cfm_mobile）をフォローすると、会場限定「初音ミク ロジックペイントS+」特製ステッカー", "ミクナビでチェックインすると、会場限定ミクナビステッカー"],
      links: [{ label: "ゲームのポータルサイト", url: "https://www.crypton.co.jp/cfm/cfmgames" }],
    },
    {
      no: "20",
      name: "（一社）北海道三笠観光協会",
      more: ["描きおろしの雪ミク（テーマ「三笠のまちを食べ歩き」）の特産品・オリジナルグッズ"],
      links: [{ label: "三笠市の観光サイト", url: "https://www.mikasa-kanko.jp/" }],
    },
    {
      no: "21",
      name: "キャラパブ",
      shows: ["ポーラータイパブミラーのワークショップ（場所は会場内の「ワークショップ」）"],
      links: [{ label: "公式サイト", url: "https://chara-pub.jp/" }],
    },
    {
      no: "22",
      name: "ホロモデル(株式会社Gugenka)",
      more: ["デジタルフィギュア「ホロモデル」", "オリジナルスマートフォンアクリルスタンド", "ディスプレイ「ホロモデリンク」"],
      gifts: ["ホロモデリンクを買った人に限定特典"],
      links: [{ label: "ホロモデル", url: "https://xr-marketplace.com/holomodels" }],
    },
    {
      no: "23",
      name: "クリプトン・フューチャー・メディア株式会社 SONICWIRE チーム",
      more: ["『初音ミク NT』『鏡音リン・レン NT』などバーチャル・シンガー製品（会場特別販売）"],
      gifts: ["『鏡音リン・レン NT』特製ステッカー（1人1枚まで）"],
      links: [{ label: "SONICWIRE", url: "https://sonicwire.com/" }],
    },
    {
      no: "24",
      name: "クリプトン・フューチャー・メディア株式会社 ローカルチーム",
      more: ["北海道 雪ミクショコラクッキー", "書籍『創作のミライ「初音ミク」が北海道から生まれたわけ』特装版", "書籍の発売記念エコバッグ"],
      links: [{ label: "商品情報", url: "https://domingo.ne.jp/article/54853" }],
    },
    {
      no: "25",
      name: "bilibiliGoods",
      links: [{ label: "公式X", url: "https://x.com/bilibiliGoods" }],
    },
    {
      no: "26",
      name: "株式会社セガ フェイブ",
      links: [{ label: "セガプラザ", url: "https://segaplaza.jp/lp/hatsunemiku/" }],
    },
    {
      no: "27",
      name: "一番くじ（BANDAI SPIRITS）",
      shows: ["フィギュアと、歴代の雪ミクの描きおろしグッズ（イラストレーター8名）", "記念撮影"],
      notes: ["展示だけで、販売はしていない"],
      links: [{ label: "一番くじ 雪ミク", url: "https://1kuji.com/products/snowmiku4" }],
    },
    {
      no: "28",
      name: "株式会社バンダイ キャンディ事業部",
      links: [{ label: "商品ページ", url: "https://www.bandai.co.jp/candy/products/2026/4570117927263000.html" }],
    },
    {
      no: "29",
      name: "株式会社ダイハツビジネスサポートセンター",
      more: ["新商品"],
      shows: ["新コラボカー「ミクキャンバス2」のウェルカムパーティー（歴代のコラボカーも）"],
      links: [{ label: "公式X", url: "https://x.com/DBC_3939" }],
    },
    {
      no: "30",
      name: "HMV&BOOKS",
      more: ["初音ミク関連のCD・映像作品・レコード・グッズ"],
      links: [{ label: "公式サイト", url: "https://www.hmv.co.jp/" }],
    },
    {
      no: "g1",
      label: "ガチャ",
      name: "（株）バンダイ（ガシャポン）",
      notes: ["2商品とも会場で先行販売"],
      links: [{ label: "ガシャポン公式サイト", url: "https://gashapon.jp/" }],
    },
    {
      no: "g2",
      label: "ガチャ",
      name: "（株）トーシン カプセルトイ専門店＃C-pla（シープラ）",
      notes: ["ラバーキーチェーンは全6種で、＃C-pla限定"],
      links: [{ label: "特設サイト", url: "https://toshin.jpn.com/cplaold/snowmiku2026/" }],
    },
  ],

  goods: [
    // 出展ブース
    { id: "caravan-candy", booth: "1", maker: "株式会社キャラバン", name: "SNOW MIKU 2026 キャンディ（全1種）", price: 1900, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_caravan_candy.html" },
    { id: "caravan-punipuni", booth: "1", maker: "株式会社キャラバン", name: "SNOW MIKU 2026 ぷにぷに缶バッジ（全6種）", price: 900, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_caravan_punipuni-badge.html" },
    { id: "caravan-kihana", booth: "1", maker: "株式会社キャラバン", name: "SNOW MIKU 2026 き花プティモ（全1種）", price: 1100, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_caravan_kihana.html" },
    { id: "bright-churro", booth: "2", maker: "合同会社Bright", name: "SNOW MIKU 2026 しあわせチュロ（全5種）", price: 1400, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_bright_churro.html" },
    { id: "tanita-coffee", booth: "5", maker: "株式会社タニタ", name: "タニタコーヒー SNOW MIKU 2026 限定パッケージ", price: 2500, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_tanita_coffee.html" },
    { id: "macby-rack", booth: "6", maker: "株式会社マクビーカタガイ", name: "雪ミクラック 2026", price: 2200, places: ["wingbay", "hmv", "skytown"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_macby_rack.html" },
    { id: "eter-charm", booth: "7", maker: "株式会社エテルノレシ", name: "スイーツチャーム（全7種）", price: 2500, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_eter_sweets-charm.html" },
    { id: "eter-towel", booth: "7", maker: "株式会社エテルノレシ", name: "デコレーションケーキ風ハンドタオル（全6種）", price: 1500, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_eter_cake-hand-towel.html" },
    { id: "eter-pouch", booth: "7", maker: "株式会社エテルノレシ", name: "モチーフアクリルチャーム付 船底ポーチ（全1種）", price: 2000, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_eter_bottom-pouch.html" },
    { id: "movic-strap", booth: "8", maker: "ムービック", name: "SNOW MIKU 2026 ぬいぐるみストラップ／ラビット・ユキネ", price: 1700, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_movic_yukine-strap.html" },
    { id: "movic-file", booth: "8", maker: "ムービック", name: "SNOW MIKU 2026 クリアファイル コンプリートセット", price: 3900, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_movic_clear-file-set.html" },
    { id: "movic-cheki", booth: "8", maker: "ムービック", name: "SNOW MIKU 2026 チェキプリント", price: 600, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_movic_instax-print.html" },
    { id: "gift-plush", booth: "9", maker: "株式会社Gift", name: "雪ミクぬいぐるみ Sweet Snow Ver.", price: 7000, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_gift_nuigurumi.html" },
    { id: "hs-case", booth: "10", maker: "株式会社ホビーストック", name: "SNOW MIKU 2026 オーロラマルチケース（全2種）", price: 1700, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_hs_aurora-multi-case.html" },
    { id: "cospa-tsumamare", booth: "11", maker: "株式会社コスパ", name: "初音ミク つままれ SNOW MIKU 2026 Ver.＋ステッカーセット", price: 1100, places: ["wingbay", "skytown"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_cospa_tsumamare.html" },
    { id: "cospa-mug", booth: "11", maker: "株式会社コスパ", name: "SNOW MIKU 2026 フタ付きフルカラーマグカップ＋ステッカーセット", price: 2600, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_cospa_mug-sticker.html" },
    { id: "cospa-cutlery", booth: "11", maker: "株式会社コスパ", name: "SNOW MIKU 2026 スプーン＆フォーク＋ステッカーセット", price: 3000, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_cospa_cutlery-sticker.html" },
    { id: "hashimoto-plate", booth: "13", maker: "有限会社 橋本漆芸", name: "SNOW MIKU 2026 デザートプレート", price: 2500, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_hashimoto_dessert-plate.html" },
    { id: "washin-case", booth: "15", maker: "株式会社和真", name: "SNOW MIKU 2026 ファスナーメガネケース（全2種）", price: 2200, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_washin_eyeglass-case.html" },
    { id: "ensky-sleeve", booth: "16", maker: "株式会社エンスカイ", name: "SNOW MIKU 2026 キャラクタースリーブセット 雪ミク2026（A／B）", price: 1800, places: ["wingbay", "hmv"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_ensky_chara-sleeve.html" },
    { id: "charapub-a5", booth: "21", maker: "キャラパブ", name: "SNOW MIKU 2026 スタンド式A5パブミラー", price: 6800, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_chara-pub_a5-pubmirror.html" },
    { id: "charapub-coaster", booth: "21", maker: "キャラパブ", name: "SNOW MIKU 2026 コースターパブミラー", price: 2000, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_chara-pub_coaster-pubmirror.html" },
    { id: "cfm-cookie", booth: "24", maker: "クリプトン・フューチャー・メディア株式会社 ローカルチーム担当", name: "雪ミク ショコラクッキー いちご味（クリアカード入り）", price: 1300, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_cfm-local_cookie.html" },
    // 公式の一覧の表記は「ぬいくるみバッジ」だが、ブースの紹介と商品名に合わせて「ぬいぐるみ」にした
    { id: "bilibili-badge", booth: "25", maker: "bilibiliGoods", name: "雪ミク PATCHシリーズ ぬいぐるみバッジ（SNOW MIKU 2026 Ver.）", price: 2600, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_bilibili_patch-nuigurumi-badge.html" },
    { id: "dbc-plate", booth: "29", maker: "株式会社ダイハツビジネスサポートセンター", name: "雪ミク ナンバープレート（SNOWMIKU 2026ver.）", price: 3800, places: ["wingbay"], floor: "出展ブース", url: "https://snowmiku.com/2026/goods_dbc_number-plate.html" },

    // ガチャコーナー
    { id: "bandai-assort", booth: "g1", maker: "株式会社バンダイ", name: "初音ミク 雪ミクあそーと ～SNOW MIKU 2026～", price: 500, unit: "1回", places: ["wingbay"], floor: "ガチャコーナー", url: "https://snowmiku.com/2026/goods_bandai_assort.html" },
    { id: "bandai-poster", booth: "g1", maker: "株式会社バンダイ", name: "初音ミク 雪ミク2026 クリアビジュアルポスター", price: 200, unit: "1回", places: ["wingbay"], floor: "ガチャコーナー", url: "https://snowmiku.com/2026/goods_bandai_clear-visual-poster.html" },
    { id: "toshin-rubber", booth: "g2", maker: "株式会社トーシン", name: "SNOW MIKU 2026 ラバーキーチェーン", price: 400, unit: "1回", places: ["wingbay"], floor: "ガチャコーナー", url: "https://snowmiku.com/2026/goods_toshin_rubber-key-chain.html" },

    // ブースで展示だけするもの（ウイングベイでは売らない）
    { id: "sega-stand", booth: "26", maker: "株式会社セガ フェイブ", name: "初音ミクシリーズ プラチナムザッカ ビッグアクリルスタンド SNOW MIKU 2026", price: null, note: "非売品（アミューズメント景品）", places: [], url: "https://snowmiku.com/2026/goods_sega_platinum-acrylic-stand.html" },
    { id: "sega-dodeka", booth: "26", maker: "株式会社セガ フェイブ", name: "雪ミク 2026 ふわぷち どでかジャンボぬいぐるみ", price: 13200, note: "完全受注生産", places: [], url: "https://snowmiku.com/2026/goods_sega_dodeka-nuigurumi.html" },
    { id: "spirits-kuji", booth: "27", maker: "株式会社BANDAI SPIRITS", name: "一番くじ 雪ミク ～SNOW MIKU ALL STARS～", price: 850, unit: "1回", places: [], url: "https://snowmiku.com/2026/goods_bandai-spirits_1ban-kuji.html" },
    { id: "candy-collection", booth: "28", maker: "株式会社バンダイキャンディ事業部", name: "SNOW MIKU 2026 COLLECTION", price: 770, places: ["skytown"], url: "https://snowmiku.com/2026/goods_bandai-candy_snowmiku-collection.html" },

    // 公式物販
    { id: "stone-shaka", maker: "株式会社ST-ONE", name: "「SNOW MIKU 2026」シャカシャカアクリルキーホルダー（全6種）", price: 1500, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_st-one_shakashaka-key-holder.html" },
    { id: "arma-stand", maker: "株式会社arma bianca", name: "SNOW MIKU 2026 BIGアクリルスタンド（全8種）", price: 2000, places: ["wingbay", "hmv", "skytown"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_arma_big-acrylic-stand.html" },
    { id: "arma-mat", maker: "株式会社arma bianca", name: "SNOW MIKU 2026 雪ミク マルチデスクマット（全3種）", price: 4000, places: ["wingbay", "hmv", "skytown"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_arma_multi-desk-mat.html" },
    { id: "north1-hoodie", maker: "ノースワン株式会社", name: "SNOW MIKU 2026 TNOC THE HOODIE ZIPUP", price: 9900, places: ["wingbay"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_north-1_hoodie-zipup.html" },
    { id: "north1-bag", maker: "ノースワン株式会社", name: "SNOW MIKU 2026 TNOC THE 1mile BAG2.5-WS", price: 11000, places: ["wingbay"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_north-1_messenger-bag.html" },
    { id: "fujimi-train", maker: "フジミ模型株式会社", name: "1/150 雪ミク電車 2026バージョン（展示プレート付き）", price: 4620, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_fujimi_train-2026.html" },
    { id: "taito-blanket", maker: "株式会社タイトー", name: "SNOW MIKU 2026 ふわふわBIGブランケット", price: 5000, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_taito_big-blanket.html" },
    { id: "taito-carabiner", maker: "株式会社タイトー", name: "SNOW MIKU 2026 アクリルカラビナ（ランダム6種）", price: 1300, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_taito_acrylic-carabiner.html" },
    { id: "sanjyuhyou-hakka", maker: "株式会社 山樹氷", name: "ハッカ樹氷 SNOW MIKU 2026 ver.", price: 1100, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_sanjyuhyou_hakka.html" },
    { id: "le-longsleeve", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 ロングスリーブTシャツ", price: 6000, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_long-sleeve-tshirt.html" },
    { id: "le-fullg", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 フルグラフィックTシャツ", price: 6000, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_fullg-tshirt.html" },
    { id: "le-muffler", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 マフラー", price: 3900, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_muffler.html" },
    { id: "le-shoppingbag", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 ショッピングバッグ", price: 1500, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_shopping-bag.html" },
    { id: "le-nobori", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 ミニのぼり", price: 1300, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_mininobori.html" },
    { id: "le-tapestry", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 タペストリー", price: 3000, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_tapestry.html" },
    { id: "le-plamo", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 プラモ風アクリルキーホルダー（ランダム7種）", price: 800, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_plamo-key-holder.html" },
    { id: "le-bathtowel", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 ビジュアルバスタオル", price: 6000, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_visual-bath-towel.html" },
    { id: "le-badge", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 BIG缶バッジ（ランダム11種）", price: 600, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_big-badge.html" },
    { id: "le-sticker", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 ステッカー（ランダム6種）", price: 500, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_sticker.html" },
    { id: "le-candy", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 木箱入りキャンディ", price: 1800, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_wooden-box-candy.html" },
    { id: "le-tote", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 トートバック「SHIAWASE FOR YOU!」ver.", price: 2800, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_mv-tote-bag.html" },
    { id: "le-keyholder", maker: "株式会社ローソンエンタテインメント", name: "SNOW MIKU 2026 アクリルキーホルダー「SHIAWASE FOR YOU!」ver.", price: 1000, places: ["wingbay", "hmv"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_le_mv-acrylic-key-holder.html" },
    { id: "cfm-cd", maker: "クリプトン・フューチャー・メディア株式会社", name: "ふかしぎプラリネージュ feat. 初音ミク（CD）", price: 2600, places: ["wingbay", "hmv", "skytown"], floor: "公式物販", url: "https://snowmiku.com/2026/goods_karent_cd.html" },

    // ウイングベイで扱うが、公式の一覧に売り場の記載が無いもの
    { id: "gsc-nendoroid", maker: "株式会社グッドスマイルカンパニー", name: "ねんどろいど 雪ミク Sweet Snow Ver.", price: 8300, places: ["wingbay"], url: "https://snowmiku.com/2026/goods_gsc_nendoroid.html" },
  ],
};
