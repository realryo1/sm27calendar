// グッズ・出展ブースマップのデータ（2027年）。SNOW MIKU 2027 公式サイトの「会場一覧」「ウイングベイ小樽」から、事実（日時・場所）だけを書き写したもの。
// ブース・グッズは未発表なので空。公開されたら booths・goods・各フロアの booths を足す（書き方は data-2026fix.js と同じ）。
// 公式の画像（会場マップ）は使わない。マップは位置関係（事実）だけを使い、goodsmap.js が SVG で描く。
//
// floors: ページ上部のタブ。1つ目が開いたときのマップ。
//   hint: マップの下の説明（無ければ「二本指で拡大…」。ブースが無いあいだは出ない）。
//   ウイングベイは、ウイングベイ小樽の店舗配置図（2F）の3番街〜5番街を略図にしたもの（店舗の番号だけ。区画の形と位置関係だけ使う）。
//   使う区画・ブースの配置は未発表なので、決まったら store の区画を置き換えて booths を足す。
//   チ・カ・ホは、札幌駅前通まちづくりの広場マップで見た位置関係（北3条交差点広場（西）は南側の通路、憩いの空間 北1東は北側の通路）。
window.GM_DATA = {
  year: 2027,
  // データを書き写した日（公式サイトを見た日）
  updated: "2026-10-30",
  notice: "試験版：会場の略図です。ブース・グッズの内容は未発表です。",

  event: {
    name: "SNOW MIKU 2027",
    venue: "ウイングベイ小樽・チ・カ・ホ",
  },

  priceNote: "ブース・グッズは未発表です。公開され次第、掲載します。",

  sources: [
    { label: "会場一覧", url: "https://snowmiku.com/2027/info-venue.html" },
    { label: "ウイングベイ小樽", url: "https://snowmiku.com/2027/event-wingbay.html" },
  ],
  mapNote: "店舗配置図・広場マップをもとに描いた略図です。",
  officialMap: [
    { label: "ウイングベイ小樽のフロアガイド", url: "https://wingbay-otaru.co.jp/floor/" },
    { label: "チ・カ・ホの広場マップ", url: "https://www.sapporo-chikamichi.jp/guide/" },
  ],

  // グッズの情報元（お品書き・告知）。書き方は data-2026fix.js と同じ。企業のお品書きが出たら maker を足す。
  // 公式のグッズ一覧は、2026-10-31時点では404（26年と同じ場所に出ると見込んで置いておく）
  notices: [
    { id: "official", kind: "official", label: "公式のグッズ一覧", url: "https://snowmiku.com/2027/goods.html" },
    // （仮）27年の動きを確かめるための仮のお品書き（リンク先は各社の公式サイト）。公式の発表が出たら消す
    { id: "kari-cospa", kind: "maker", booth: "1", label: "（仮）コスパのお品書き", url: "https://www.cospa.com/" },
    { id: "kari-movic", kind: "maker", booth: "2", label: "（仮）ムービックのお品書き", url: "https://www.movic.jp/" },
  ],

  // ライブ（SNOW MIKU LIVE! 2027）のグッズ。グッズは goods に floor: "ライブ物販" で入れ、places に売る場所（ライブ会場は live、チ・カ・ホは chikaho など）。
  // status は、分かっていないこと（売り場・販売方法）を書く。分かったら直す
  live: {
    title: "SNOW MIKU LIVE! 2027",
    lines: ["会場はZepp Sapporo（2/5〜2/7）"],
    status: ["グッズの内容・売り場・販売方法（ライブ会場での物販か、ウイングベイ・チ・カ・ホでも売るか、通販か）は未発表"],
  },

  // 売り場の名前（品名の前のタグ）
  places: { wingbay: "小樽", chikaho: "チカホ", hmv: "HMV", skytown: "空港", live: "ライブ会場" },

  floors: [
    {
      id: "wingbay",
      label: "ウイングベイ",
      sub: "5番街2F・3番街2F ほか",
      hint: "店舗の番号だけを描いた略図です。イベントで使う区画・ブースは未発表です。",
      view: [0, 0, 860, 440],
      tile: [70, 60],
      areas: [
        { kind: "street", spot: "wingbay", x: 10, y: 3, w: 280, h: 24, label: ["3番街"], size: 15 },
        { kind: "street", spot: "wingbay", x: 290, y: 3, w: 535, h: 24, label: ["5番街"], size: 15 },
        // 3番街
        { kind: "store", x: 10, y: 40, w: 272, h: 88, label: ["113"], size: 22 },
        { kind: "facility", x: 98, y: 133, w: 46, h: 38, label: ["ESC"], size: 11 },
        { kind: "entrance", x: 14, y: 176, w: 86, h: 22, label: ["ホテル連絡口"], size: 11 },
        { kind: "store", x: 18, y: 202, w: 72, h: 26, label: ["114"], size: 14 },
        { kind: "store", x: 185, y: 202, w: 45, h: 26, label: ["115"], size: 14 },
        { kind: "store", x: 237, y: 202, w: 38, h: 26, label: ["116"], size: 14 },
        { kind: "store", x: 15, y: 235, w: 77, h: 90, label: ["109〜", "112-1"], size: 14 },
        { kind: "store", x: 95, y: 235, w: 185, h: 165, label: ["グランドパーク小樽"], size: 18 },
        // 5番街
        { kind: "facility", x: 290, y: 40, w: 25, h: 75, label: ["WC"], size: 10 },
        { kind: "store", x: 320, y: 40, w: 33, h: 75, label: ["124"], size: 14 },
        { kind: "store", x: 282, y: 115, w: 71, h: 55, label: ["121"], size: 16 },
        { kind: "store", x: 356, y: 40, w: 50, h: 37, label: ["125"], size: 14 },
        { kind: "store", x: 409, y: 40, w: 37, h: 37, label: ["126"], size: 14 },
        { kind: "store", x: 449, y: 40, w: 31, h: 37, label: ["127"], size: 14 },
        { kind: "store", x: 377, y: 100, w: 85, h: 60, label: ["122"], size: 16 },
        { kind: "store", x: 385, y: 160, w: 60, h: 45, label: ["123"], size: 16 },
        { kind: "store", x: 283, y: 200, w: 70, h: 65, label: ["120"], size: 16 },
        { kind: "store", x: 483, y: 40, w: 150, h: 143, label: ["119", "ナムコ"], size: 18 },
        { kind: "store", x: 636, y: 40, w: 119, h: 120, label: ["118", "喜久屋書店"], size: 16 },
        { kind: "facility", x: 520, y: 196, w: 34, h: 28, label: ["ESC"], size: 11 },
        { kind: "void", x: 590, y: 200, w: 95, h: 18, label: ["吹抜"], size: 12 },
        { kind: "store", x: 498, y: 235, w: 227, h: 115, label: ["117"], size: 22 },
        { kind: "facility", x: 740, y: 283, w: 30, h: 30, label: ["WC"], size: 11 },
        { kind: "void", x: 310, y: 270, w: 190, h: 135, label: ["吹抜け"], size: 22 },
        { kind: "facility", x: 780, y: 175, w: 60, h: 90, label: ["階段", "EV"], size: 14 },
        // 海側
        { kind: "void", x: 10, y: 410, w: 830, h: 24, label: ["マリンデッキ"], size: 13 },
      ],
      // （仮）27年の動きを確かめるための仮のブース（5番街の吹抜けの上に、くっつけて置く。吹抜けに重なるので「売り場に近すぎます」の警告が出る）。公式の発表が出たら消す
      booths: { 1: [335, 305], 2: [405, 305] },
    },
    {
      id: "chikaho",
      label: "チ・カ・ホ",
      sub: "札幌駅前通地下歩行空間",
      hint: "場所の目安です。時間と内容は未発表です。",
      view: [0, 0, 1200, 500],
      tile: [70, 60],
      areas: [
        { kind: "facility", x: 0, y: 200, w: 1200, h: 100, label: ["← さっぽろ駅　札幌駅前通地下歩行空間（チ・カ・ホ）　大通駅 →"], size: 20 },
        { kind: "goods", spot: "chikaho-goods", x: 100, y: 320, w: 300, h: 150, label: ["北3条交差点広場", "（西）"], size: 22 },
        { kind: "marche", spot: "chikaho-marche", x: 560, y: 40, w: 440, h: 140, label: ["憩いの空間", "（北1東）"], size: 24 },
      ],
      booths: {},
    },
  ],

  spots: {
    wingbay: {
      title: "ウイングベイ小樽",
      lines: [
        "2/6（土）・2/7（日）　10:00〜17:00（最終入場16:30）、入場無料",
        "場所は5番街2F・3番街2F ほか",
        "各種展示、ワークショップ、出展ブース、ステージ企画、グッズ販売コーナーなど",
        "使う区画・ブースの配置は未発表",
      ],
      links: [{ label: "ウイングベイ小樽（公式）", url: "https://snowmiku.com/2027/event-wingbay.html" }],
    },
    "chikaho-goods": {
      title: "チ・カ・ホ：グッズ販売・展示など",
      lines: ["場所は北3条交差点広場（西）", "2/4（木）〜2/7（日）。時間と内容は未発表"],
      links: [
        { label: "会場一覧（公式）", url: "https://snowmiku.com/2027/info-venue.html" },
        { label: "チ・カ・ホの広場マップ", url: "https://www.sapporo-chikamichi.jp/guide/" },
      ],
    },
    "chikaho-marche": {
      title: "チ・カ・ホ：マルシェ",
      lines: ["場所は憩いの空間（北1東）", "2/4（木）〜2/7（日）。時間と内容は未発表"],
      links: [
        { label: "会場一覧（公式）", url: "https://snowmiku.com/2027/info-venue.html" },
        { label: "チ・カ・ホの広場マップ", url: "https://www.sapporo-chikamichi.jp/guide/" },
      ],
    },
  },

  // （仮）27年の動きを確かめるための仮のブース・グッズ。品名・ブース名の頭に（仮）を付けてある。公式の発表が出たら消す
  booths: [
    { no: "1", name: "（仮）コスパ" },
    { no: "2", name: "（仮）ムービック" },
  ],
  goods: [
    // 公式物販
    { id: "kari-shopper", maker: "（仮）公式", name: "（仮）ショッパー", price: 4000, places: ["chikaho"], floor: "公式物販" },
    { id: "kari-keyholder", maker: "（仮）公式", name: "（仮）アクリルキーホルダー", price: 1000, places: ["chikaho"], floor: "公式物販" },
    // 企業ブース（ウイングベイ）
    { id: "kari-cospa-tsumamare", booth: "1", src: ["kari-cospa"], maker: "（仮）コスパ", name: "（仮）つままれ2027", price: 1500, places: ["wingbay"], floor: "出展ブース" },
    { id: "kari-cospa-tshirt", booth: "1", src: ["kari-cospa"], maker: "（仮）コスパ", name: "（仮）Tシャツ2027", price: 3000, places: ["wingbay"], floor: "出展ブース" },
    { id: "kari-movic-cheki", booth: "2", src: ["kari-movic"], maker: "（仮）ムービック", name: "（仮）チェキ2027", price: 500, note: "限定", places: ["wingbay"], floor: "出展ブース" },
    { id: "kari-movic-stand", booth: "2", src: ["kari-movic"], maker: "（仮）ムービック", name: "（仮）アクリルスタンド2027", price: 2000, note: "限定", places: ["wingbay"], floor: "出展ブース" },
    // ライブ物販
    { id: "kari-penlight", maker: "（仮）公式", name: "（仮）ペンライト", price: 4000, places: ["chikaho"], floor: "ライブ物販" },
    { id: "kari-ringlight", maker: "（仮）公式", name: "（仮）リングライト", price: 1000, places: ["chikaho"], floor: "ライブ物販" },
  ],
};
