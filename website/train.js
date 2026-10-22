// 雪ミク電車の事実データ（時刻表・停留場・祝日・路線図の座標）。表示ロジックは train-view.js

window.TT_TRAIN = {
  // 画面に出る文言（運行期間外の表示は period から作る）
  text: {
    chip: "市電いまどこ",
    chipEn: "TRAIN",
    title: "雪ミク電車いまどこ？",
    titleSub: "（在線予測）",
    tripsSummary: "発車時刻（2024年ダイヤ）",
    note: "※2024年の雪ミク電車時刻表と市電の実ダイヤをもとにした<strong>予測</strong>です。27年の運行ダイヤは現時点で未発表です。",
    offPeriod: "運行期間外",
    now: "いま",
    dateLabel: "日付",
    timeLabel: "時刻",
    mapLabel: "札幌市電ループ線の路線図と雪ミク電車の予測位置",
  },

  // 雪ミク電車 在線予測
  // 2024年の雪ミク電車時刻表（西4丁目・すすきの発車時刻）を基準点に、
  // 市電外回りの実ダイヤ（すすきの→西4丁目 52分）の所要比率で各停留場の時刻を割り振る。
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

  // 停留場の座標と名前ラベルの位置（外回りの順＝stations と同じ並び）と、線路の折れ点（その停留場の直後に入る角）。
  // PC・スマホ共通の1配置。スマホで縮小しても読める横幅に収めている
  // 位置関係は実際の地図に合わせている。中央の列と西線は等間隔で、同じ通りの停留場を同じ高さにそろえる
  // （西線9条–山鼻9条 … 電車事業所前–幌南小学校前。西線6条だけは実際に合わせて少し北）。西4丁目・すすきの・資生館小学校前は角、西15丁目は北西角
  LAYOUT: {
    width: 500,
    height: 700,
    st: [
      [400, 60, "right"], [400, 118, "right"], [400, 175, "below"], [280, 175, "left"],
      [280, 245, "right"], [280, 302, "right"], [280, 359, "right"], [280, 416, "right"],
      [280, 473, "right"], [280, 530, "right"], [280, 587, "right"], [221, 640, "below"],
      [162, 640, "above"], [103, 640, "below"], [44, 587, "right"], [44, 530, "right"],
      [44, 473, "right"], [44, 416, "right"], [44, 359, "right"], [44, 302, "right"],
      [44, 200, "right"], [44, 60, "below"], [163, 60, "below"], [281, 60, "below"],
    ],
    // 西4丁目（0）・すすきの（2）・資生館小学校前（3）・西15丁目（21）は角そのものなので、角の点は持たない
    corners: { 10: [[280, 640]], 13: [[44, 640]] },
    // 目安の地下鉄（東西線は横、南北線・東豊線は縦）。
    // links: 乗り換えの点線。[市電停留場の番号, 地下鉄側の x, y] または [x1, y1, x2, y2]
    subway: {
      tozai: { y: 22, x1: 6, x2: 494, st: [["西18丁目", 20], ["西11丁目", 163]] },
      nanboku: { x: 432, y1: 4, y2: 530, st: [["すすきの", 175], ["中島公園", 302], ["幌平橋", 444]] },
      // 東豊線は下端（y2）で右（東）へ折れる
      toho: { x: 470, y1: 4, y2: 270, st: [["豊水すすきの", 197]] },
      // 公式路線図と同じ乗り換えの点線
      links: [[21, 20, 22], [22, 163, 22], [0, 432, 22], [1, 432, 22], [1, 432, 175], [2, 432, 175], [432, 175, 470, 197], [5, 432, 302], [8, 432, 444]],
      zepp: [405, 296], // 南9条西4丁目＝山鼻9条〜中島公園の線上、中島公園駅のすぐ西
      sync: [350, 110], // SYNC north（南2条西5丁目）＝狸小路の停留場のすぐ左
      // 2026年の雪ミク雪像の場所（さっぽろ雪まつり 大通会場 11丁目）。ラベルはピンの右
      snowStatue: [163, 2],
    },
  },
  // 地下鉄乗継指定駅の最寄り（SC番号）
  TRANSFER: ["01", "04", "17", "20", "23", "24"],
};
