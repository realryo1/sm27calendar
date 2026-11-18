// カレンダーの中（?embed=1。nav.js の iframe）で開いたときの下ごしらえ（グッズ goods/ と会場マップ map/ で共通。head で defer なしに読む）。
// 画面の端の安全な余白（--safe-t/r/b/l）は親のものを使う。iframe の中は env(safe-area-inset-*) が 0 になるので、そのままだとパンチホールや下のバーに重なる
// （スマホのブラウザは親が 24px。アプリ表示は親も iframe も fullscreen の最低 16px で偶然そろう）
if (new URLSearchParams(location.search).has("embed")) {
  document.documentElement.classList.add("is-embed"); // common.css の .is-embed（金の帯を消す・スマホで下を空ける）
  const sync = () => {
    try {
      const cs = getComputedStyle(parent.document.documentElement);
      const st = document.documentElement.style;
      for (const k of ["--safe-t", "--safe-r", "--safe-b", "--safe-l"]) st.setProperty(k, cs.getPropertyValue(k));
      // 下のバーの帯（.app-nav。ボタンの10px上から色がつく）に iframe が重なっている高さ（スマホは帯全体、2カラムはバーの上で止まるので帯の上の余白の分）。
      // 全画面のマップがバーの上で止まるのに使う。下にバーが無いPCの縦バーのときは 0
      const bar = parent.document.querySelector(".app-nav");
      const over = bar && cs.getPropertyValue("--nav-w").trim() === "0px" ? Math.max(0, frameElement.getBoundingClientRect().bottom - bar.getBoundingClientRect().top) : 0;
      st.setProperty("--embed-nav-h", `${Math.round(over)}px`);
      document.documentElement.classList.toggle("is-embed-bar", over > 0); // 下に帯があるとき（list.css の浮かぶボタンの右端をバーにそろえる）
    } catch {}
  };
  sync();
  addEventListener("resize", sync);
  window.GM_SYNC = sync; // 全画面にするとき（map.js の setFull）にも測り直す
}
// 年ごとのデータ。既定は27年（data-2027.js）。?year=2026 で前年の見本（data-2026fix.js）。
// 読み込む順番（defer）を守るため document.write で書く。dir はページから見たデータの場所（グッズは ""、マップは "../goods/"）
window.GM_DATA_SRC = (dir) => `${dir}${new URLSearchParams(location.search).get("year") === "2026" ? "data-2026fix.js" : "data-2027.js"}`;
