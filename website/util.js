// 共通の小さな関数（app.js・train-view.js・nav.js と、グッズマップの goodsmap.js で使う）
window.TT_UTIL = {
  // HTML の本文・属性に入れる文字をエスケープする
  esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  // データ中の文字列の "\n" を改行（<br>）にする
  nl: (s) => String(s).replace(/\n/g, "<br>"),
  // "HH:MM" → 0時からの分
  toMin: (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  },
  // 日本時間の今。dateId は "YYYY-MM-DD"、min は0時からの分（秒は小数）
  nowJST: () => {
    const now = new Date();
    const dateId = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const [h, m, s] = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Tokyo", hour12: false }).split(":").map(Number);
    return { dateId, min: h * 60 + m + s / 60 };
  },
  // "YYYY-MM-DD" の曜日（0＝日〜6＝土）
  weekday: (id) => new Date(`${id}T00:00:00Z`).getUTCDay(),
};
