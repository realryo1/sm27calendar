// カレンダーのデータ（イベント・会場・日付・画面の文言）。雪ミク電車の時刻表などは train.js
// 時刻は "HH:MM"（24時間表記）。tentative: true は公式未発表で仮置きした時間、"end" は終演のみ仮。
// wait: 早朝待機の開始目安＝日の出時刻（wait〜start をグラデーションで描くための内部値。時刻は画面に表示しない）、lastEntry: 最終入場、marks: 時刻の目印線。

window.TT_DATA = {
  // 掲載情報の最終更新日時（日本時間）。情報を直したらここも更新する
  updatedAt: "2026-10-22 04:54",

  // 画面に出る固定の文言。<head> のメタタグ（title / description / OGP）は index.html に静的に置く必要があるので、
  // サイト名や説明を変えるときは index.html のそちらも合わせて直す
  site: {
    name: "SNOW MIKU 2027",
    subtitle: "非公式カレンダー",
    boardHint: "※ピンチで拡大縮小、予定タップで詳細",
    venuesTitle: "会場・イベント詳細",
    disclaimer: "本サイトは非公式です。「非公式」表示のイベント（初音銀華祭2027）はファンが主催するもので、SNOW MIKU 公式イベントではありません。\nこのページの問い合わせはx.com/realryo1に行ってください。\n情報の正確性には留意していますが、最終的な判断は利用者が行ってください。",
    // フッター（免責の下）に出すリポジトリへのリンク
    repo: { label: "GitHub リポジトリ", url: "https://github.com/realryo1/sm27calendar" },
    toBoard: "▲ カレンダーへ",
    // 予定のバッジ名
    badges: { official: "公式", fan: "非公式", tentative: "時間仮", tentativeEnd: "終演仮" },
    // 凡例。mark は app.js の描き分けキー（badge 系は badges の名前、tbd は取り消し線の見本、open / wait は帯の色見本）
    legend: [
      { mark: "official", text: "SNOW MIKU 2027 公式イベント" },
      { mark: "fan", text: "非公式（ファン主催・公式とは無関係）" },
      { mark: "tentative", text: "時間未発表のため仮置き" },
      { mark: "tentativeEnd", text: "終演時間のみ仮置き" },
      { mark: "tbd", text: "取り消し線の時刻は仮" },
      { mark: "open", text: "開場〜開演" },
      { mark: "wait", text: "早朝待機（前年参考）" },
    ],
    // 予定カード・会場カードの見出しやラベル
    labels: {
      place: "場所",
      station: "最寄り",
      open: "開場",
      startWithOpen: "開演",
      startOnly: "時間",
      lastEntry: "最終入場",
      unannounced: "未発表",
      allDayUnannounced: "時間未発表",
      defaultLink: "公式ページ",
    },
    wait: {
      label: "早朝待機",
      summary: "早朝待機について",
      imageAlt: "前年の早朝待機列の案内図",
      imageNote: "画像は26年のもので仮置き。タップすると出典（SNOW MIKU 2026 公式サイト）が開きます。",
    },
    updatedPrefix: "最終情報更新：",
  },

  // 表示する時間帯（時）
  range: { start: 6, end: 22 },

  days: [
    { id: "2027-02-05", label: "2/5", week: "FRI", weekJa: "金" },
    { id: "2027-02-06", label: "2/6", week: "SAT", weekJa: "土" },
    { id: "2027-02-07", label: "2/7", week: "SUN", weekJa: "日" },
  ],

  venues: [
    // short: 会場見出しに出す名前（省略時は name）、area: 見出しの補足
    {
      id: "wingbay",
      letter: "A",
      name: "ウイングベイ小樽",
      area: "小樽築港駅",
      address: "5番街2F・3番街2F 他",
      station: "JR函館本線「小樽築港駅」",
      theme: "pink",
    },
    {
      id: "zepp",
      letter: "B",
      name: "Zepp Sapporo",
      area: "中島公園駅",
      address: "北海道札幌市中央区南9条西4丁目",
      station: "地下鉄南北線「中島公園駅」／市電「山鼻9条駅」",
      theme: "violet",
    },
    {
      id: "sync",
      letter: "C",
      name: "SYNC north",
      short: "Digital Stars",
      area: "すすきの駅",
      address: "北海道札幌市中央区南2条西5丁目6番地1 Sプラザ2 5ビル",
      station: "地下鉄南北線「すすきの駅」",
      theme: "orange",
    },
    {
      id: "train",
      letter: "D",
      name: "雪ミク電車",
      area: "札幌市電",
      address: "札幌市電 全線",
      station: "市電各停留場",
      theme: "indigo",
    },
    {
      id: "clark",
      letter: "E",
      name: "北海道大学 クラーク会館講堂",
      short: "初音銀華祭2027",
      area: "ファンメイドライブ（非公式）",
      fan: true,
      address: "北海道札幌市北区北8条西7丁目",
      station: "JR「札幌駅」",
      theme: "gold",
    },
  ],

  events: [
    {
      id: "wingbay",
      title: "SNOW MIKU 2027 メインイベント",
      venue: "wingbay",
      days: ["2027-02-06", "2027-02-07"],
      // 早朝待機の折りたたみの上に出す案内
      lead: "札幌～小樽築港は片道で50分～30分、800円かかります。",
      wait: "06:00",
      // 前年（2026）の公式案内図。出典は waitSource
      waitImage: "image/souchou.png",
      waitSource: "https://snowmiku.com/2026/location_wingbay.html#wingbay_top",
      // 時刻の目印線（first train: 札幌からの函館本線始発の小樽築港着）
      marks: [
        {
          time: "06:52",
          label: "小樽築港駅 始発着",
          detail: "JR函館本線 札幌 6:09発 → 小樽築港 6:52着（参考。これより早い方がいい）",
        },
      ],
      start: "10:00",
      end: "17:00",
      lastEntry: "16:30",
      official: true,
      note: "早朝待機は例年日の出前から。（あまり早すぎると返されます）現地の警備員の指示に従うこと。",
      url: "https://snowmiku.com/2027/event-wingbay.html",
    },
    ...["2027-02-05", "2027-02-06", "2027-02-07"].flatMap((day) => [
      {
        id: `live-day-${day}`,
        title: "SNOW MIKU LIVE! 2027",
        sub: "昼公演",
        venue: "zepp",
        days: [day],
        open: "12:00",
        start: "13:00",
        end: "15:00",
        official: true,
        tentative: "end",
        note: "終演時間は未発表。仮で公演時間2時間としています。",
        url: "https://snowmiku.com/2027/event-live.html",
      },
      {
        id: `live-night-${day}`,
        title: "SNOW MIKU LIVE! 2027",
        sub: "夜公演",
        venue: "zepp",
        days: [day],
        open: "16:00",
        start: "17:00",
        end: "19:00",
        official: true,
        tentative: "end",
        note: "終演時間は未発表。仮で公演時間2時間としています。",
        url: "https://snowmiku.com/2027/event-live.html",
      },
    ]),
    {
      id: "digital-stars",
      title: "Digital Stars",
      venue: "sync",
      days: ["2027-02-06"],
      allDay: true,
      official: true,
      note: "開場・開演・終演の時間は未発表です。",
      url: "https://snowmiku.com/2027/event-digital-stars.html",
    },
    {
      id: "ginkasai",
      title: "初音銀華祭2027",
      venue: "clark",
      days: ["2027-02-06"],
      allDay: true,
      official: false,
      note: "SNOW MIKU 公式イベントではなく、ファン主催の非公式イベントです。\n開場・開演・終演の時間は未発表です。",
      url: "https://x.com/HatsuneGinkasai/status/2112861563627679930",
    },
    {
      id: "train",
      title: "雪ミク電車",
      venue: "train",
      days: ["2027-02-05", "2027-02-06", "2027-02-07"],
      start: "07:00",
      end: "21:00",
      official: true,
      period: "2026年11月21日（土）～2027年3月21日（日）",
      note: "運行時間はおおむねの目安です。",
      url: "https://www.stsp.or.jp/event/yukimiku2027/",
      live: true,
      links: [
        { label: "公式ページ", url: "https://snowmiku.com/2027/event-train.html" },
        { label: "札幌市交通事業振興公社", url: "https://www.stsp.or.jp/event/yukimiku2027/" },
      ],
    },
  ],
};
