// もし飛行機が止まったら？：新千歳空港・札幌駅から苫小牧西港へ行き、シルバーフェリーで八戸へ渡る経路の案内
// 時刻表と所要時間は公式の案内（下の SOURCES）から手で写したもの。事業者サイトへは取りに行かない。
// 運行情報（delay.js が取得した JSON）が届いたら、シルバーフェリーの今の状況を便ごとに重ねる。
(() => {
  // シルバーフェリー 苫小牧発 → 八戸着（公式「航路・時刻」2026-10-26 確認）。定期検査・代船の期間は変わることがある
  // shuttle：八戸港フェリーターミナル → 本八戸駅のシャトルバス（南部バス）。朝の2本だけ
  const SAILINGS = [
    { time: "05:00", ship: "シルバーブリーズ", arrive: "13:30", nextDay: false, shuttle: null },
    { time: "09:30", ship: "シルバーエイト", arrive: "18:00", nextDay: false, shuttle: null },
    { time: "21:15", ship: "シルバープリンセス", arrive: "04:45", nextDay: true, shuttle: "05:40発 → 本八戸駅 05:55着" },
    { time: "23:59", ship: "シルバーティアラ", arrive: "07:30", nextDay: true, shuttle: "08:05発 → 本八戸駅 08:25着" },
  ];
  // 高速とまこまい号（北海道中央バス）のフェリーターミナル行き（2026年7月1日更新の夏ダイヤ）。
  // 苫小牧駅前からも乗れる（中央バスの時刻表の注意書き※1）。冬ダイヤで変わることがある
  const BUSES = [
    { sapporo: "15:00", station: "16:41", terminal: "16:55" },
    { sapporo: "16:00", station: "17:41", terminal: "17:55" },
    { sapporo: "17:50", station: "19:31", terminal: "19:45" },
    { sapporo: "20:15", station: "21:56", terminal: "22:10" },
    { sapporo: "21:15", station: "22:56", terminal: "23:10" },
  ];
  // 新千歳空港 → 苫小牧西港フェリーターミナルの目安（分）
  const JR_MIN = 30; // JR 新千歳空港 →（南千歳で乗り継ぎ）→ 苫小牧（新千歳空港の公式「約30分」）
  const WAIT_MIN = 30; // 列車の待ち時間の余裕（JR の時刻は見ていないため）
  const TAXI_MIN = 15; // 苫小牧駅 → フェリーターミナル タクシー（シルバーフェリー公式「約15分」）
  const BOARD_BEFORE = 60; // 乗船開始は出港の約1時間前（シルバーフェリー公式 FAQ）。それまでにターミナルに着く
  const TRAVEL = JR_MIN + WAIT_MIN + TAXI_MIN;
  const SHOW = 2; // 表示する便の数（直近の2便）

  const $time = document.getElementById("plan-time");
  const $now = document.getElementById("plan-now");
  const $result = document.getElementById("plan-result");
  if (!$time || !$result) return;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pad = (n) => String(n).padStart(2, "0");
  const toMin = (hhmm) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
  const fmt = (min) => `${pad(Math.floor((((min % 1440) + 1440) % 1440) / 60))}:${pad((((min % 1440) + 1440) % 1440) % 60)}`;
  // 日本時間の「今日」の日付と、0時からの分
  const jstNow = () => {
    const t = new Date(Date.now() + 9 * 3600 * 1000);
    return { date: t.toISOString().slice(0, 10), min: t.getUTCHours() * 60 + t.getUTCMinutes() };
  };
  const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  const md = (iso) => `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}`;
  const span = (min) => (min >= 60 ? `${Math.floor(min / 60)}時間${min % 60 ? `${min % 60}分` : ""}` : `${min}分`);

  let silver = null; // 運行情報のシルバーフェリー（services.silverferry）
  let tomakomai = null; // 運行情報の中央バス 高速とまこまい号（services.chuobus.groups の tomakomai）

  // 高速とまこまい号の運休の有無（中央バスの RSS。どの便かまでは見ない）
  function busBadge() {
    if (!tomakomai) return "";
    if (!tomakomai.ok) return ` <span class="dl-badge dl-badge--unknown">運休情報を取得できず</span>`;
    return tomakomai.status === "normal"
      ? ` <span class="dl-badge dl-badge--normal">運休情報なし</span>`
      : ` <span class="dl-badge dl-badge--delay">運休あり（中央バスで確認）</span>`;
  }

  // その便の今の状況。お知らせから読んだ便ごとの状況があればそれを、なければトップの状態を使う
  function liveBadge(date, s) {
    if (!silver) return "";
    if (!silver.ok) return `<span class="dl-badge dl-badge--unknown">状況を取得できず</span>`;
    const hit = (silver.sailings || []).find((x) => x.date === date && x.from === "苫小牧" && x.time === s.time);
    if (hit) return `<span class="dl-badge dl-badge--${esc(hit.status)}">${esc(hit.label)}</span>`;
    if (silver.status === "normal") return `<span class="dl-badge dl-badge--normal">通常運航</span>`;
    return `<span class="dl-badge dl-badge--delay">欠航・遅延あり（公式で確認）</span>`;
  }

  function render() {
    const now = jstNow();
    const base = $time.value ? toMin($time.value) : now.min;
    if (!$time.value) $time.value = fmt(base);
    // 今日・明日の便を時刻順に並べ、出発時刻（base）より後に出港するものを先頭から SHOW 便
    const list = [0, 1]
      .flatMap((d) => SAILINGS.map((s) => ({ ...s, d, dep: d * 1440 + toMin(s.time) })))
      .filter((s) => s.dep > base)
      .slice(0, SHOW);
    const rows = list
      .map((s) => {
        const date = addDays(now.date, s.d);
        const leaveBy = s.dep - BOARD_BEFORE - TRAVEL; // 新千歳空港をこの時刻までに出れば間に合う
        const ok = leaveBy >= base;
        const day = s.d ? "明日" : "今日";
        const arriveDay = s.nextDay ? (s.d ? "明後日" : "明日") : day;
        // 乗船開始までにターミナルに着く、いちばん遅い高速とまこまい号（出港の3時間前より前に着く便は出さない）
        const depInDay = toMin(s.time);
        const bus = BUSES.filter((b) => {
          const t = toMin(b.terminal);
          return t <= depInDay - BOARD_BEFORE && t >= depInDay - 180;
        }).pop();
        // 深夜・早朝は JR が走っていない時間帯がある（JR の時刻は見ていないので、幅を広めにとって注意だけ出す）
        const m = ((leaveBy % 1440) + 1440) % 1440;
        const night = ok && (m >= 23 * 60 || m < 6 * 60);
        return `<li class="dl-row dl-plan__row${ok ? "" : " is-late"}">
          <span class="dl-row__name">${day}（${esc(md(date))}）${esc(s.time)}発 ${esc(s.ship)}</span>
          ${liveBadge(date, s)}
          <span class="dl-row__msg">${
            ok
              ? `<strong>間に合う目安</strong>：新千歳空港を ${esc(fmt(leaveBy))} までに出発（あと ${esc(span(leaveBy - base))}）`
              : `<strong>間に合わない目安</strong>：新千歳空港を ${esc(fmt(leaveBy))} までに出る必要があります`
          }</span>
          ${
            bus
              ? `<span class="dl-row__msg">バスなら：高速とまこまい号 苫小牧駅前 ${esc(bus.station)}発 → フェリーターミナル ${esc(bus.terminal)}着（札幌駅前 ${esc(bus.sapporo)}発）${busBadge()}</span>`
              : ""
          }
          ${night ? `<span class="dl-row__msg dl-plan__night">深夜・早朝は JR が走っていない時間帯があります。始発・終電を確かめるか、タクシーなどを考えてください。</span>` : ""}
          <span class="dl-row__msg">八戸港 ${esc(arriveDay)} ${esc(s.arrive)}着${
            s.shuttle ? `／シャトルバス ${esc(s.shuttle)}` : "／八戸駅へはタクシー約20分"
          }</span>
        </li>`;
      })
      .join("");
    $result.innerHTML = `<ul class="dl-rows">${rows}</ul>`;
  }

  $time.addEventListener("input", render);
  $now?.addEventListener("click", () => {
    $time.value = "";
    render();
  });
  // delay.js が運行情報を取得するたびに知らせてくる
  document.addEventListener("dl:data", (ev) => {
    silver = ev.detail?.services?.silverferry || null;
    const chuo = ev.detail?.services?.chuobus;
    const g = chuo?.groups?.find((x) => x.id === "tomakomai");
    tomakomai = chuo ? { ok: chuo.ok && !!g, status: g?.status } : null;
    render();
  });
  render();
})();
