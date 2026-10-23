// カレンダーのデータ（イベント・会場・日付・画面の文言）。雪ミク電車の時刻表などは train.js
// 時刻は "HH:MM"（24時間表記）。tentative: true は公式未発表で仮置きした時間、"end" は終演のみ仮。
// sessions: 公演ごとの違いだけを子要素に書く（読み込み時に共通項目と合成して、公演ごとの予定に展開する）
// price: 値段。文字列、または複数行にしたいときは文字列の配列（会場カードの「最寄り」の下に出る）
// wait.start: 早朝待機の開始目安＝日の出時刻（wait.start〜start をグラデーションで描くための内部値。時刻は画面に表示しない）、lastEntry: 最終入場、marks: 時刻の目印線。

window.TT_DATA = {
  // 掲載情報の最終更新日時（日本時間）。deploy時に自動で更新される
  updatedAt: "2026-10-23 39:39",

  // 画面に出る固定の文言。<head> のメタタグ（title / description / OGP）は index.html に静的に置く必要があるので、
  // サイト名や説明を変えるときは index.html のそちらも合わせて直す
  site: {
    name: "SNOW MIKU 2027",
    subtitle: "非公式カレンダー",
    boardHint: "二本指で拡大縮小、予定タップで詳細表示",
    venuesTitle: "公式イベント",
    // 非公式の会場カードの前に置く表題
    fanTitle: "非公式イベント",
    disclaimer: "本サイトは非公式です。<br>このページの問い合わせはx.com/realryo1にお願いします。<br>情報の正確性には留意していますが、最終的な判断は利用者が行ってください。<br><br>「非公式」表示のイベント（初音銀華祭2027）はファンが主催するもので、SNOWMIKU公式イベントではありません。",
    // フッター（免責の下）に出すリポジトリへのリンク
    repo: { label: "GitHub リポジトリ", url: "https://github.com/realryo1/sm27calendar" },
    toBoard: "▲ カレンダーへ",
    // 予定のバッジ名
    badges: { official: "公式", fan: "非公式", tentative: "時間仮" },
    // 凡例。mark は app.js の描き分けキー（badge 系は badges の名前、open / wait は帯の色見本）。今の画面に出ているものだけ載せる
    legend: [
      { mark: "official", text: "SNOW MIKU 2027 公式イベント" },
      { mark: "fan", text: "非公式（ファン主催・公式とは無関係）" },
      { mark: "open", text: "開場〜開演" },
      { mark: "wait", text: "早朝待機（前年参考）" },
    ],
    // 予定カード・会場カードの見出しやラベル
    labels: {
      place: "場所",
      station: "最寄り",
      price: "値段",
      open: "開場",
      startWithOpen: "開演",
      startOnly: "時間",
      lastEntry: "最終入場",
      unannounced: "未発表",
      allDayUnannounced: "時間<wbr>未発表",
    },
    // 雪ミク電車いまどこ（市電マップ）の文言。運行期間・時刻表などのデータは train.js
    train: {
      chip: "市電いまどこ",
      chipEn: "TRAIN",
      title: "雪ミク<wbr>電車<wbr>いまどこ？",
      titleSub: "（在線予測）",
      tripsSummary: "発車時刻（2024年ダイヤ）",
      note: "すすきの～西4丁目間の時刻から計算しています。<br>27年の運行計画は未発表です。2024年の時刻を使用しています。",
      offPeriod: "運行期間外",
      now: "いま",
      dateLabel: "日付",
      timeLabel: "時刻",
      mapLabel: "札幌市電ループ線の路線図と雪ミク電車の予測位置",
    },
    updatedPrefix: "最終情報更新：",
  },

  // 表示する時間帯（時）
  range: { start: 6, end: 23 },

  days: [
    { id: "2027-02-05", label: "2/5", week: "FRI", weekJa: "金" },
    { id: "2027-02-06", label: "2/6", week: "SAT", weekJa: "土" },
    { id: "2027-02-07", label: "2/7", week: "SUN", weekJa: "日" },
  ],

  // 会場情報（letter / name / short / area / address / station / theme / fan）も各予定に直接書く。
  // letter は会場の識別・並び順・記号で、同じ会場の予定は letter を揃える。short は会場見出しに出す名前（省略時は name）、area は見出しの補足
  events: [
    {
      id: "wingbay",
      title: "SNOW <wbr>MIKU <wbr>2027\nメイン<wbr>イベント",
      letter: "A",
      name: "ウイングベイ小樽",
      area: "小樽築港駅",
      address: "5番街2F・3番街2F 他",
      station: "JR函館本線「小樽築港駅」",
      price: "無料",
      theme: "pink",
      days: ["2027-02-06", "2027-02-07"],
      // 早朝待機の折りたたみの上に出す案内
      lead: "札幌～小樽築港は片道で50分～30分、800円かかります。",
      // 早朝待機。start は日の出時刻の目安、image は前年（2026）の公式案内図で出典は source
      wait: {
        start: "06:00",
        label: "早朝待機",
        summary: "早朝待機について",
        image: "image/souchou.png",
        imageSize: [1018, 720], // 画像の幅・高さ（読み込み前に枠を確保してレイアウトのずれを防ぐ）
        source: "https://snowmiku.com/2026/location_wingbay.html#wingbay_top",
        imageAlt: "前年の早朝待機列の案内図",
        imageNote: "早朝待機は例年日の出前から。（あまり早すぎると返されます）現地の警備員の指示に従うこと。<br>画像は26年のもので仮置き。タップすると出典（SNOW MIKU 2026 公式サイト）が開きます。",
      },
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
      links: [{ label: "公式ページ", url: "https://snowmiku.com/2027/event-wingbay.html" }],
    },
    {
      title: "SNOW <wbr>MIKU <wbr>LIVE! <wbr>2027",
      letter: "B",
      name: "Zepp Sapporo",
      area: "中島公園駅",
      address: "北海道札幌市中央区南9条西4丁目",
      station: "地下鉄南北線「中島公園駅」／市電「山鼻9条駅」",
      price: ["1Fスタンディング 9,000円", "2F着席指定席 9,500円", "U-18席（着席指定席） 3,900円", "※入場時別途ドリンク代600円必要"],
      theme: "violet",
      days: ["2027-02-05", "2027-02-06", "2027-02-07"],
      official: true,
      tentative: "end",
      note: "公演時間は約2時間の予定。<br>ドリンク代はZepp側の収益となるシステム。現金・交通系ICが使用可能。",
      links: [{ label: "公式ページ", url: "https://snowmiku.com/2027/event-live.html" },{ label: "ドリンク代の公式ポスト", url: "https://x.com/zeppsapporo/status/2055893701357146217" }],
      // sessions: 上の共通項目を引き継ぐ公演ごとの項目（id・sub・時間。上と同じ項目を書けばその公演だけ上書き）
      sessions: [
        { id: "live-day", sub: "昼公演", open: "12:00", start: "13:00", end: "15:00" },
        { id: "live-night", sub: "夜公演", open: "16:00", start: "17:00", end: "19:00" },
      ],
    },
    {
      id: "digital-stars",
      title: "Digital Stars",
      letter: "C",
      name: "SYNC north",
      short: "Digital Stars",
      area: "すすきの駅",
      address: "北海道札幌市中央区南2条西5丁目6番地1 Sプラザ2 5ビル",
      station: "地下鉄南北線「すすきの駅」",
      price: "未発表",
      theme: "orange",
      days: ["2027-02-06"],
      allDay: true,
      official: true,
      links: [{ label: "公式ページ", url: "https://snowmiku.com/2027/event-digital-stars.html" }],
    },
    {
      id: "ginkasai",
      title: "初音<wbr>銀華祭 <wbr>2027",
      letter: "E",
      name: "北海道大学 クラーク会館講堂",
      short: "初音銀華祭2027",
      area: "ファンメイドライブ（非公式）",
      fan: true,
      address: "北海道札幌市北区北8条西7丁目",
      station: "JR北海道「札幌駅」",
      price: "未発表",
      theme: "gold",
      days: ["2027-02-06"],
      allDay: true,
      official: false,
      note: "<strong>ファン主催の非公式イベントです。</strong><br>開場・開演・終演の時間は未発表。<br>北海道大学ボーカロイド同好会様からの掲載許可を頂いています。",
      links: [
        { label: "開催告知ポスト", url: "https://x.com/HatsuneGinkasai/status/2112861563627679930" },
        { label: "北海道大学ボーカロイド同好会 X", url: "https://x.com/Hokkaidouniv_VC" },
      ],

    },
    {
      id: "train",
      title: "雪ミク<wbr>電車",
      letter: "D",
      name: "雪ミク電車",
      area: "札幌市電",
      address: "札幌市電 全線",
      station: "市電各停留場",
      price: "1乗車 230円",
      theme: "indigo",
      days: ["2027-02-05", "2027-02-06", "2027-02-07"],
      start: "07:00",
      end: "21:00",
      official: true,
      period: "2026年11月21日（土）～2027年3月21日（日）",
      live: true,
      links: [
        { label: "公式ページ", url: "https://snowmiku.com/2027/event-train.html" },
        { label: "札幌市交通事業振興公社", url: "https://www.stsp.or.jp/event/yukimiku2027/" },
      ],
    },
  ],
};
