// カレンダーのデータ（date.md を元に作成）
// 時刻は "HH:MM"（24時間表記）。tentative: true は公式未発表で仮置きした時間、"end" は終演のみ仮。
// wait: 早朝待機の開始目安＝日の出時刻（wait〜start をグラデーションで描くための内部値。時刻は画面に表示しない）、lastEntry: 最終入場、marks: 時刻の目印線。

window.TT_DATA = {
  // 掲載情報の最終更新日時（日本時間）。情報を直したらここも更新する
  updatedAt: "2026-10-22 04:54",

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
      id: "clark",
      letter: "D",
      name: "北海道大学 クラーク会館講堂",
      short: "初音銀華祭2027",
      area: "ファンメイドライブ",
      address: "北海道札幌市北区北8条西7丁目",
      station: "JR「札幌駅」",
      theme: "gold",
    },
    {
      id: "train",
      letter: "E",
      name: "雪ミク電車",
      area: "札幌市電",
      address: "札幌市電 全線",
      station: "市電各停留場",
      theme: "indigo",
    },
  ],

  events: [
    {
      id: "wingbay",
      title: "SNOW MIKU 2027 メインイベント",
      venue: "wingbay",
      days: ["2027-02-06", "2027-02-07"],
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
      start: "20:00",
      end: "22:00",
      official: true,
      tentative: true,
      note: "時間は未発表。仮で20時から2時間としています。",
      url: "https://snowmiku.com/2027/event-digital-stars.html",
    },
    {
      id: "ginkasai",
      title: "初音銀華祭2027",
      venue: "clark",
      days: ["2027-02-06"],
      open: "17:00",
      start: "18:00",
      end: "20:00",
      official: false,
      tentative: true,
      note: "時間は未発表。前年に倣い17:00開場・18:00開演・公演時間2時間としています。",
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

  // 雪ミク電車 在線予測
  // 2024年の雪ミク電車時刻表（西4丁目・すすきの発車時刻）を基準点に、
  // 市電外回りの実ダイヤ（すすきの→西4丁目 52分）の所要比率で各停留場の時刻を割り振る。
  train: {
    period: { start: "2026-11-21", end: "2027-03-21" },
    // 土日祝ダイヤ扱いの日（祝日＋年末年始は推定）
    holidays: [
      "2026-11-23", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03",
      "2027-01-11", "2027-02-11", "2027-02-23", "2027-03-21",
    ],
    // 外回りの停留場順。roma は駅名標用のローマ字、offset はすすきの発からの分（実ダイヤ）。arr/dep が異なるのは停車調整
    loopMinutes: 52,
    stations: [
      { name: "西4丁目", roma: "Nishi yon chome", base: true },
      { name: "狸小路", roma: "Tanuki koji", estimated: true },
      { name: "すすきの", roma: "Susukino", base: true, offset: 0 },
      { name: "資生館小学校前", roma: "Shiseikan shogakko mae", offset: 2 },
      { name: "東本願寺前", roma: "Higashi honganji mae", offset: 4 },
      { name: "山鼻9条", roma: "Yamahana ku jo", offset: 6 },
      { name: "中島公園通", roma: "Nakajima koen dori", offset: 8 },
      { name: "行啓通", roma: "Gyokei dori", offset: 10 },
      { name: "静修学園前", roma: "Seishugakuen mae", offset: 12 },
      { name: "山鼻19条", roma: "Yamahana juku jo", offset: 14 },
      { name: "幌南小学校前", roma: "Konan shogakko mae", offset: 15 },
      { name: "東屯田通", roma: "Higashi tonden dori", offset: 17 },
      { name: "石山通", roma: "Ishiyama dori", offset: 19 },
      { name: "中央図書館前", roma: "Chuo toshokan mae", offset: 20, depOffset: 22 },
      { name: "電車事業所前", roma: "Densha jigyosho mae", offset: 25 },
      { name: "ロープウェイ入口", roma: "Ropeway iriguchi", offset: 27 },
      { name: "西線16条", roma: "Nishisen juroku jo", offset: 29 },
      { name: "西線14条", roma: "Nishisen juyo jo", offset: 31 },
      { name: "西線11条", roma: "Nishisen juichi jo", offset: 33 },
      { name: "西線9条旭山公園通", roma: "Nishisen ku jo Asahiyama koen dori", offset: 35 },
      { name: "西線6条", roma: "Nishisen roku jo", offset: 37 },
      { name: "西15丁目", roma: "Nishi jugo chome", offset: 40 },
      { name: "中央区役所前", roma: "Chuo kuyakusho mae", offset: 43 },
      { name: "西8丁目", roma: "Nishi hatchome", offset: 46 },
    ],
    // 2024年時刻表。最終便（○）は中央図書館前行き
    weekday: {
      direction: "inner",
      // [すすきの発, 西4丁目発]
      trips: [
        ["07:17", "07:25"], ["08:16", "08:24"], ["09:13", "09:20"], ["10:09", "10:17"],
        ["11:06", "11:14"], ["12:03", "12:11"], ["13:01", "13:09"], ["13:58", "14:06"],
        ["14:55", "15:03"], ["15:52", "16:00"], ["16:49", "16:57"], ["17:49", "17:57"],
        ["18:48", "18:56"], ["19:46", "19:54"], ["20:45", "20:53"],
      ],
    },
    holiday: {
      direction: "outer",
      // [西4丁目発, すすきの発]
      trips: [
        ["07:55", "08:03"], ["08:52", "09:00"], ["09:49", "09:57"], ["10:46", "10:54"],
        ["11:43", "11:51"], ["12:40", "12:48"], ["13:37", "13:45"], ["14:35", "14:43"],
        ["15:33", "15:41"], ["16:30", "16:38"], ["17:27", "17:35"], ["18:24", "18:32"],
        ["19:21", "19:29"],
      ],
    },
    lastStop: "中央図書館前",
  },
};
