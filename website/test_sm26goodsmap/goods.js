// グッズ一覧（試験ページ）
// グッズマップと同じページ（index.html の ?page=goods）。データ（data-○○○○.js の window.GM_DATA）・一覧の部品（goodslist.js）・スタイルもマップと共通。
// グッズを売り場（公式物販・企業ブース・ライブ物販）ごとにまとめる。
// 企業ブースのグッズは、ブースの番号からマップのそのブースへ移れる（カレンダーの中では nav.js に postMessage、単体ではマップのページへのリンク）
(() => {
  const D = window.GM_DATA;
  if (!D) return;
  const E = D.event;
  // カレンダーのサイドバーから iframe で開いたとき（?embed=1。カレンダーの nav.js）。goodsmap.css の .is-embed（金の帯を消す・スマホで下を空ける）も効く
  const EMBED = new URLSearchParams(location.search).has("embed");
  if (EMBED) document.documentElement.classList.add("is-embed");

  // 年のタブ。別の年は ?year= で読み込み直す（データのファイルが年ごとのため。グッズマップと同じ）
  const YEARS = [
    { year: 2027, label: "2027" },
    { year: 2026, label: "2026（前年の見本）" },
  ];

  const TEXT = {
    years: "年",
    // 売り場。上のしぼり込みのボタンと節の見出し
    all: "すべて",
    at: { official: "公式物販", booth: "企業ブース", live: "ライブ物販", loose: "売り場の記載なし" },
    atSub: { official: "公式グッズの売り場", booth: "出展企業のブース", live: "ライブのグッズ" },
    count: (n) => `${n}点`,
    search: "商品名・会社名でさがす",
    leads: {
      booth: "出展企業のブースで売るもの。公式のグッズ一覧に載るもの（公式）と、企業が自社サイト・Xなどで出すお品書きにだけあるもの（企業）があります。ブースの番号を押すとマップで場所が見られます。",
      live: "ライブのグッズ。",
    },
    liveNone: "グッズはまだ載せていません。",
    empty: "見つかりませんでした。ほかのことばでさがすか、「すべて」を押してしぼり込みを外してみてください。",
    updated: (date) => `データ：${date}時点の公式サイト・企業のお品書き`,
    disclaimer:
      "本ページは非公式の試験版です。\nこのページの問い合わせはx.com/realryo1にお願いします。\n情報の正確性には留意していますが、最終的な判断は利用者が行ってください。\n商品の写真は、品名のリンクから公式サイト・企業のページで見られます。",
    sources: "出典",
    calendar: "非公式カレンダーへ戻る",
  };

  const $ = (id) => document.getElementById(id);
  const { esc } = window.TT_UTIL; // カレンダーの ../util.js
  const br = (s) => esc(s).replace(/\n/g, "<br>");
  const dateOf = (s) => s.split("-").map(Number);

  // ---------- データの整理と一覧の部品（goodslist.js。マップと共通） ----------
  // ブースの番号は、マップのそのブースへのリンク。カレンダーの中では、nav.js が表示をマップに切り替えて #booth-○○ を開く（下の click）
  const mapSearch = D.year === YEARS[0].year ? "" : `year=${D.year}`;
  const mapHref = (no) => `./${mapSearch ? `?${mapSearch}` : ""}#booth-${encodeURIComponent(no)}`; // 同じページの ?page=goods を外したもの
  const L = window.GM_LIST(D, {
    boothNo: (b) =>
      `<a class="gm-no" href="${esc(mapHref(b.no))}" data-booth="${esc(b.no)}" aria-label="${esc(L.TEXT.showOnMap(L.boothName(b)))}">${esc(L.boothLabel(b))}</a>`,
  });
  const { norm, onSale, goodsAt, official, live, loose } = L;
  // 企業ブースのカードは、売る品・展示する品・公式のブース紹介の品名のどれかがあるブースだけ
  const booths = D.booths.filter((b) => goodsAt.has(b.no) || b.more?.length);
  const boothSale = D.goods.filter((g) => g.booth && onSale(g)).length;
  const COUNT = { official: official.length, booth: boothSale, live: live.length, loose: loose.length };

  // ---------- 売り場のしぼり込み ----------
  const THEME = { official: "gold", booth: "pink", live: "violet", loose: "indigo" };
  function guideHtml() {
    const btn = (at, label, sub, n) =>
      `<button type="button" class="gd-at${at === "all" ? "" : ` theme-${THEME[at]}`}" data-at="${at}" aria-pressed="false">` +
      `<span class="gd-at__label">${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}<span class="gd-at__n"><b>${n}</b>点</span></button>`;
    const total = Object.values(COUNT).reduce((a, b) => a + b, 0);
    return `<div class="gd-ats">${btn("all", TEXT.all, "", total)}${Object.keys(TEXT.atSub)
      .map((at) => btn(at, TEXT.at[at], TEXT.atSub[at], COUNT[at]))
      .join("")}</div>`;
  }

  // ---------- 一覧（売り場ごとの節。カードは goodslist.js） ----------
  const section = (at, body) =>
    body
      ? `<section class="gd-sec theme-${THEME[at]}" data-sec="${at}">
          <h2 class="gd-h">${esc(TEXT.at[at])}<span class="gd-h__count">${TEXT.count(COUNT[at])}</span></h2>
          ${TEXT.leads[at] ? `<p class="gm-lead">${esc(TEXT.leads[at])}</p>` : ""}
          ${body}
        </section>`
      : "";

  // ライブ物販：売り場・販売方法が分からないうちは、そのことを書いておく（データの live）
  function liveCard() {
    if (!D.live && !live.length) return "";
    const V = D.live ?? {};
    return L.foldCard({
      theme: "violet",
      n: live.length,
      head: L.titleHtml(V.title ?? TEXT.at.live),
      body: `${[...(V.lines ?? []), ...(V.status ?? [])].map((t) => `<p class="gm-note">${esc(t)}</p>`).join("")}
        ${live.length ? `<ul class="gm-items">${[...live].sort(L.byTags({ here: ["live"] })).map((g) => L.goodsRow(g, { here: ["live"] })).join("")}</ul>` : `<p class="gd-none">${esc(TEXT.liveNone)}</p>`}`,
    });
  }

  // ---------- しぼり込み ----------
  // 売り場は節ごとに、検索は品の行ごとに隠す。中に見える行が無いカード・節は隠す（ライブの「未発表」のカードは、ライブを選んだときも残す）。
  // しぼり込み・検索中は見えているカードを開き、外したらそうして開いたものだけ閉じる（goodslist.js の fold。マップと同じ）
  const state = { at: "all", q: "" };
  const $list = $("gdList");
  const $query = $("gdQuery");
  function applyFilter() {
    const q = norm(state.q.trim());
    const active = state.at !== "all" || !!q;
    $list.querySelectorAll(".gm-item").forEach((li) => (li.hidden = !!q && !li.dataset.text.includes(q)));
    $list.querySelectorAll(".gm-block").forEach((el) => (el.hidden = !el.querySelector(".gm-item:not([hidden])")));
    let any = false;
    $list.querySelectorAll(".gd-sec").forEach((sec) => {
      const at = sec.dataset.sec;
      let secAny = false;
      sec.querySelectorAll(".gm-card").forEach((card) => {
        const on = (state.at === "all" || state.at === at) && (!!card.querySelector(".gm-item:not([hidden])") || (at === "live" && !q && !card.querySelector(".gm-item")));
        card.hidden = !on;
        L.fold(card, on, active);
        secAny ||= on;
      });
      sec.hidden = !secAny;
      any ||= secAny;
    });
    $("gdEmpty").hidden = any;
    $("gdGuide")
      .querySelectorAll("button[data-at]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.at === state.at)));
  }

  // ---------- 開始 ----------
  $("gdYears").setAttribute("aria-label", TEXT.years);
  $("gdYears").innerHTML = YEARS.map(
    (y) => `<button type="button" class="gm-chip gm-tab" role="tab" data-year="${y.year}" aria-selected="${y.year === D.year}">${esc(y.label)}</button>`
  ).join("");
  if (D.notice) {
    $("gdNotice").textContent = D.notice;
    $("gdNotice").hidden = false;
  }
  $("gdGuide").innerHTML = guideHtml();
  $query.placeholder = TEXT.search;
  $query.setAttribute("aria-label", TEXT.search);
  $list.innerHTML =
    section("official", L.officialCard()) +
    section("booth", booths.length ? `<div class="gm-list">${booths.map(L.boothCard).join("")}</div>` : "") +
    section("live", liveCard()) +
    section("loose", L.looseCard());
  $("gdEmpty").textContent = TEXT.empty;
  const [y, mo, d] = dateOf(D.updated);
  const sources = [...D.sources.map((s) => ({ ...s, label: `${s.label}（${E.name}）` })), ...(D.notices ?? []).filter((n) => n.kind === "maker")];
  $("gdFooter").innerHTML = `
    <p class="site-footer__updated">${esc(TEXT.updated(`${y}年${mo}月${d}日`))}</p>
    <p>${br(TEXT.disclaimer)}</p>
    <p class="gm-sources">${esc(TEXT.sources)}：${sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("／")}</p>
    ${EMBED ? "" : `<p class="site-footer__repo"><a href="../">${esc(TEXT.calendar)}</a></p>`}`;
  applyFilter();

  // ---------- 操作 ----------
  $("gdYears").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-year]");
    if (!b || Number(b.dataset.year) === D.year) return;
    const url = new URL(location.href);
    if (Number(b.dataset.year) === YEARS[0].year) url.searchParams.delete("year");
    else url.searchParams.set("year", b.dataset.year);
    url.hash = "";
    location.href = url.href;
  });
  // 売り場のボタン：その売り場にしぼる。一覧はすぐ下なので、スクロールはしない
  $("gdGuide").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-at]");
    if (!b) return;
    state.at = state.at === b.dataset.at ? "all" : b.dataset.at; // 選んでいる売り場をもう一度押すと外す
    applyFilter();
  });
  $query.addEventListener("input", () => {
    state.q = $query.value;
    applyFilter();
  });
  // ブースの番号：カレンダーの中では、表示をマップに切り替えてそのブースを開く（nav.js）。単体のときはリンクのまま
  $list.addEventListener("click", (ev) => {
    const a = ev.target.closest("a[data-booth]");
    if (!a || !EMBED || window.parent === window || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    window.parent.postMessage({ type: "sm27-view", view: "map", search: mapSearch, hash: `#booth-${a.dataset.booth}` }, location.origin);
  });
})();
