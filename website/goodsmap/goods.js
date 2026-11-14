// 会場・グッズ（試験ページ）
// データ（data-○○○○.js の window.GM_DATA）・一覧の部品（goodslist.js）・会場マップ（goodsmap.js）・ほしいものリスト（wishlist.js）をまとめるページ本体。
// 同じページを2つの表示に使い分ける（?part=）。カレンダーのサイドバーでは、どちらも iframe で開く（nav.js）。
//   グッズ（既定）：グッズを売り場（公式物販・企業ブース・ライブ物販）ごとにまとめ、最後に会場の売り場・設備の説明を置く。2カラム（641px〜）は左にほしいものリスト、右に一覧
//   マップ（?part=map）：会場マップだけを画面いっぱいに出す
// マップのブースを押すとグッズの一覧のそのカードへ、カードの番号を押すとマップでそのブースを示す（表示をまたぐので、親の nav.js が取り次ぐ。下の「表示どうしのやりとり」）
(() => {
  const D = window.GM_DATA;
  if (!D) return;
  // カレンダーのサイドバーから iframe で開いたとき（?embed=1。カレンダーの nav.js）。goodsmap.css の .is-embed（金の帯を消す・スマホで下を空ける）も効く
  const params = new URLSearchParams(location.search);
  const EMBED = params.has("embed");
  if (EMBED) document.documentElement.classList.add("is-embed");
  const PART = params.get("part") === "map" ? "map" : "goods";
  document.documentElement.classList.add(`is-part-${PART}`);

  const TEXT = {
    // 売り場。上のしぼり込みのボタンと節の見出し（spot は会場の売り場・設備の説明。しぼり込みのボタンは無い）
    all: "すべて",
    at: { official: "公式物販", booth: "企業ブース", live: "ライブ物販", loose: "売り場の記載なし", spot: "会場案内" },
    count: (n) => `${n}点`,
    search: "商品名・会社名でさがす",
    leads: {
      booth: "出展企業のブースで売るもの。公式のグッズ一覧に載るもの（公式）と、企業が自社サイト・Xなどで出すお品書きにだけあるもの（企業）があります。ブースの番号を押すとマップで場所が見られます。",
    },
    liveNone: "グッズはまだ載せていません。",
    empty: "見つかりませんでした。ほかのことばでさがすか、「すべて」を押してしぼり込みを外してみてください。",
    // 2カラムの左の列のほしいものリストの見出し
    drawer: "ほしいものリスト",
    officialMap: "公式の会場マップ（画像）",
    updated: (date) => `データ：${date}時点の公式サイト`,
    disclaimer:
      "本ページは非公式です。\nこのページの問い合わせはx.com/realryo1にお願いします。\n情報の正確性には留意していますが、最終的な判断は利用者が行ってください。",
    sources: "出典",
    calendar: "非公式カレンダーへ戻る",
  };

  const $ = (id) => document.getElementById(id);
  const { esc } = window.TT_UTIL; // カレンダーの ../util.js
  const br = (s) => esc(s).replace(/\n/g, "<br>");
  const dateOf = (s) => s.split("-").map(Number);
  const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  // 2カラムにする幅。goods.css・goodsmap.css と合わせる
  const twoCol = matchMedia("(min-width: 641px)");

  // ---------- 表示どうしのやりとり ----------
  // カレンダーの中（iframe）では、マップとグッズが別のページなので、親（nav.js）にメッセージを送って表示を切り替えてもらい、相手のページへ取り次いでもらう。
  //   送る：{ type: "map", id }（マップの表示に切り替えてそのブースを示す）／{ type: "booth", id }（グッズの表示に切り替えてそのカードへ）／
  //         { type: "select", id }（切り替えずに、マップでそのブースを選んでおく）／{ type: "hits", hits, active }（しぼり込みの結果。マップで濃く出す）／
  //         { type: "ready" }（読み込み終わり）
  //   受ける：{ type: "pick", id, show }（マップ。showならそのブースを枠のまん中へ）／{ type: "hits", … }（マップ）／{ type: "card", id }（グッズ）
  // 親が無いとき（このページを直接開いたとき）は、もう一方の表示のページを、ブースの番号つきのハッシュ（#booth-○○）で開く
  const TALK = "goodsmap";
  const embedded = EMBED && parent !== window;
  const tell = (msg) => parent.postMessage({ sm27: TALK, ...msg }, location.origin);
  const partHref = (part, id) => {
    const url = new URL(location.href);
    if (part === "map") url.searchParams.set("part", "map");
    else url.searchParams.delete("part");
    url.hash = id ? `#booth-${id}` : "";
    return url.search + url.hash || "?";
  };
  const toPart = (part, id) => (embedded ? tell({ type: part === "map" ? "map" : "booth", id }) : location.assign(partHref(part, id)));
  const listen = (handlers) =>
    addEventListener("message", (ev) => {
      const m = ev.data;
      if (ev.origin !== location.origin || ev.source !== parent || m?.sm27 !== TALK) return;
      handlers[m.type]?.(m);
    });

  // 年・読み込み直しのたびに、同じデータを両方の表示で作る。一覧の部品（goodslist.js）はどちらの表示でも使う
  // カードの番号は、押すとマップでそのブースを示すボタン
  const L = window.GM_LIST(D, {
    boothNo: (b) => `<button type="button" class="gm-no" data-map="${esc(b.no)}" aria-label="${esc(L.TEXT.showOnMap(L.boothName(b)))}">${esc(L.boothLabel(b))}</button>`,
  });
  const { boothBy } = L;

  if (PART === "map") return startMap();

  const { norm, onSale, official, live, loose } = L;
  // 企業ブースのカードは、すべてのブース（マップのブースを押したときに移る先）
  const booths = D.booths;
  const boothSale = D.goods.filter((g) => g.booth && onSale(g)).length;
  const COUNT = { official: official.length, booth: boothSale, live: live.length, loose: loose.length };

  // この表示にはマップを置かない（マップは別の表示）
  $("map").remove();

  // ---------- 売り場のしぼり込み ----------
  const THEME = { official: "gold", booth: "pink", live: "violet", loose: "indigo", spot: "violet" };
  function guideHtml() {
    const btn = (at, label, n) =>
      `<button type="button" class="gd-at${at === "all" ? "" : ` theme-${THEME[at]}`}" data-at="${at}" aria-pressed="false">` +
      `<span class="gd-at__label">${esc(label)}</span><span class="gd-at__n"><b>${n}</b>点</span></button>`;
    const total = Object.values(COUNT).reduce((a, b) => a + b, 0);
    return `<div class="gd-ats">${btn("all", TEXT.all, total)}${["official", "booth", "live"]
      .map((at) => btn(at, TEXT.at[at], COUNT[at]))
      .join("")}</div>`;
  }

  // ---------- 一覧（売り場ごとの節。カードは goodslist.js） ----------
  const section = (at, body) =>
    body
      ? `<section class="gd-sec theme-${THEME[at]}" data-sec="${at}">
          <h2 class="gd-h">${esc(TEXT.at[at])}${at in COUNT ? `<span class="gd-h__count">${TEXT.count(COUNT[at])}</span>` : ""}</h2>
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
      title: V.title ?? TEXT.at.live,
      body: `${[...(V.lines ?? []), ...(V.status ?? [])].map((t) => `<p class="gm-note">${esc(t)}</p>`).join("")}
        ${L.linkList(V.links)}
        ${live.length ? `<ul class="gm-items">${[...live].sort(L.byTags({ here: ["live"] })).map((g) => L.goodsRow(g, { here: ["live"] })).join("")}</ul>` : `<p class="gd-none">${esc(TEXT.liveNone)}</p>`}`,
    });
  }

  // 会場の売り場・設備（ブースの無いもの：主催展示・ワークショップ・クロークなど）の説明。マップで押すと、ここへ移る
  const infoSpots = Object.entries(D.spots).filter(([, s]) => !s.booths && !s.official);
  const spotsHtml = () =>
    infoSpots
      .map(([id, s]) =>
        L.foldCard({
          theme: "violet",
          id: `spot-${id}`,
          no: id,
          cls: " gm-spot",
          title: s.title,
          body: `${s.lines?.length ? `<ul class="gm-items">${s.lines.map((t) => L.textRow(t)).join("")}</ul>` : ""}${L.linkList(s.links)}`,
        })
      )
      .join("");

  // ---------- しぼり込み ----------
  // 売り場は節ごとに、検索は品の行ごとに隠す。検索中は、中に見える行が無いカード・節を隠す。会場の案内は「すべて」のときだけ。
  // しぼり込み・検索中は見えているカードを開き、外したらそうして開いたものだけ閉じる（goodslist.js の fold）。
  // 見えているカードは、マップの表示にも送り、当たったところとして濃く出す（goodsmap.js の setHits）
  const state = { at: "all", q: "" };
  const $list = $("gdList");
  const $query = $("gdQuery");
  function applyFilter() {
    const q = norm(state.q.trim());
    const active = state.at !== "all" || !!q;
    $list.querySelectorAll(".gm-item").forEach((li) => (li.hidden = !!q && !li.dataset.text.includes(q)));
    $list.querySelectorAll(".gm-block").forEach((el) => (el.hidden = !el.querySelector(".gm-item:not([hidden])")));
    const hits = new Set();
    $list.querySelectorAll(".gd-sec").forEach((sec) => {
      const at = sec.dataset.sec;
      const atOn = at === "spot" ? state.at === "all" : state.at === "all" || state.at === at;
      let secAny = false;
      sec.querySelectorAll(".gm-card").forEach((card) => {
        const on = atOn && (!q || !!card.querySelector(".gm-item:not([hidden])"));
        card.hidden = !on;
        L.fold(card, on, active);
        secAny ||= on;
        if (on && card.dataset.no) hits.add(card.dataset.no);
      });
      sec.hidden = !secAny;
    });
    $("gdEmpty").hidden = !!$list.querySelector(".gd-sec:not([hidden])");
    $("gdGuide")
      .querySelectorAll("button[data-at]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.at === state.at)));
    if (embedded) tell({ type: "hits", hits: [...hits], active });
  }
  function resetFilter() {
    state.at = "all";
    state.q = "";
    $query.value = "";
    applyFilter();
  }

  // ---------- 開始（一覧） ----------
  $("gdGuide").innerHTML = guideHtml();
  $query.placeholder = TEXT.search;
  $query.setAttribute("aria-label", TEXT.search);
  $("gdLead").textContent = D.priceNote ?? "";
  $list.innerHTML =
    section("official", L.officialCard()) +
    section("booth", booths.length ? `<div class="gm-list">${booths.map(L.boothCard).join("")}</div>` : "") +
    section("live", liveCard()) +
    section("loose", L.looseCard()) +
    section("spot", spotsHtml());
  window.GM_WISH(D, L); // ほしいものリスト（wishlist.js。品の行の♡と、浮かぶボタン・左の列）
  $("gdEmpty").textContent = TEXT.empty;
  const [y, mo, d] = dateOf(D.updated);
  const officialMaps = [].concat(D.officialMap ?? []).map((m) => (typeof m === "string" ? { label: TEXT.officialMap, url: m } : m));
  const sources = [...D.sources, ...(D.notices ?? []).filter((n) => n.kind === "maker"), ...officialMaps];
  $("gdFooter").innerHTML = `
    ${D.notice ? `<p>${esc(D.notice)}</p>` : ""}
    <p class="site-footer__updated">${esc(TEXT.updated(`${y}年${mo}月${d}日`))}</p>
    <p>${br(TEXT.disclaimer)}</p>
    <p class="gm-sources">${esc(TEXT.sources)}：${sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("　")}</p>
    ${EMBED ? "" : `<p class="site-footer__repo"><a href="../">${esc(TEXT.calendar)}</a></p>`}`;

  // ---------- ほしいものリスト（2カラムの左の列。いつも開いている） ----------
  // 名前と件数・合計（wishlist.js が入れる）を見出しに出す。スマホは浮かぶボタンから dialog で開く
  $("gdDrawerLabel").textContent = TEXT.drawer;
  const $wishPanel = $("gdWish");

  // ---------- 選択（一覧のカード） ----------
  // ブース・売り場・設備の名前から、一覧のカードを探す（中にブースがある売り場は、その先頭のブース）
  const cardOf = (id) => $(`booth-${D.spots[id]?.booths?.[0] ?? id}`) ?? $(`spot-${id}`);
  // 選んだカードを強調する（#booth-○○ も合わせる）
  function pickCard($card, id) {
    $list.querySelectorAll(".gm-card.is-picked").forEach((el) => el.classList.remove("is-picked"));
    $card.classList.add("is-picked");
    if (boothBy.has(id) || id === "official") history.replaceState(null, "", `#booth-${id}`);
  }
  // 一覧のカードへ移って光らせる。しぼり込みで隠れているときは、しぼり込みを解く
  function showCard(id, { instant = false } = {}) {
    const $card = cardOf(id);
    if (!$card) return;
    if ($card.hidden) resetFilter();
    L.openCard($card); // 選んで開いたので、しぼり込みを外しても閉じない
    pickCard($card, id);
    $card.scrollIntoView({ behavior: instant ? "auto" : behavior, block: "start" });
    $card.classList.remove("is-flash");
    void $card.offsetWidth;
    $card.classList.add("is-flash");
  }

  applyFilter();

  // ---------- 操作 ----------
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
  // カードの番号を押すと、マップの表示に切り替えてそのブースを示す。
  // カードを開いたときは、マップでそのブース・売り場を選んでおく（切り替えはしない。マップに無いものは、マップの表示が無視する）
  $list.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-map]");
    if (el) return toPart("map", el.dataset.map);
    const $card = ev.target.closest(".gm-card__head, .gm-official__head")?.parentElement;
    if ($card && !$card.open && $card.dataset.no && embedded) tell({ type: "select", id: $card.dataset.no });
  });
  if (embedded) listen({ card: (m) => showCard(m.id) });

  // 2カラムの持ち手：カレンダー（app.js）と同じ操作・同じ処理（util.js の splitter）。ドラッグ（ダブルクリックで既定、← → キーでも動く）で左の列の幅（割合）を変え、この端末に覚える。
  // ドラッグ中はカードの枠だけを幅に合わせ、中身は押した時の幅のまま組み直さない（goodsmap.css の .is-frozen）。手を止めたら、その幅で組み直す
  {
    const $cols = $("gdCols");
    const $main = $("gdMain");
    // 2カラムのタッチ：一覧とほしいものリストを、別々の指で独立してスクロールできるようにする（util.js の touchPan）
    TT_UTIL.touchPan($main, { enabled: () => twoCol.matches });
    TT_UTIL.touchPan($wishPanel, { scroller: () => $wishPanel.querySelector(".gm-wishlist__body"), enabled: () => twoCol.matches });
    const freeze = () => {
      if ($main.classList.contains("is-frozen")) return;
      $main.querySelectorAll(".gm-card").forEach((card) => {
        const cs = getComputedStyle(card);
        card.style.setProperty("--cw", `${card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)}px`);
      });
      $main.classList.add("is-frozen");
    };
    const thaw = () => $main.classList.remove("is-frozen");
    // 左の列（ほしいものリスト）が読める幅の下限は300px、一覧は320px
    const sp = TT_UTIL.splitter({
      $split: $("gdSplit"),
      $main: $cols,
      cssVar: "--gd-side-w",
      key: "sm27-goods-wish-w",
      def: 40,
      minA: 300,
      minB: 320,
      hold: true,
      freeze,
      thaw,
    });
    // 高さは dvh ではなく innerHeight で決める（goods.css の --app-h。カレンダーと同じ。Android の Chrome は、読み込み直したあと dvh が古い高さのまま残ることがある）。
    // 画面の幅が変わったら下限をかけ直す
    const resize = () => {
      sp.setW(sp.cur(), false);
      $cols.style.setProperty("--app-h", `${innerHeight}px`);
    };
    window.addEventListener("resize", resize);
    resize();
  }

  // #booth-○○ なら、そのブースの一覧のカードへ（共有したリンクから開いたとき・開いたままハッシュが変わったとき）
  function openHash({ instant = false } = {}) {
    let id = "";
    try {
      id = decodeURIComponent(location.hash.match(/^#booth-(.+)$/)?.[1] ?? "");
    } catch {
      return; // 壊れたハッシュは無視する
    }
    if (!boothBy.has(id) && id !== "official") return;
    showCard(id, { instant });
  }
  window.addEventListener("hashchange", () => openHash());
  openHash({ instant: true });
  if (embedded) tell({ type: "ready" });

  // ---------- マップの表示（?part=map） ----------
  // 会場マップだけを画面いっぱいに出す。ブース・売り場を押すと、グッズの表示のそのカードへ移る
  function startMap() {
    const $side = $("gdSide");
    $side.append($("map"));
    $("gdMain").remove();
    $("gdSplit").remove();
    $("gdDrawer").remove();
    // 高さは innerHeight で決める（グッズの表示と同じ。goods.css の --app-h）
    const $cols = $("gdCols");
    const resize = () => $cols.style.setProperty("--app-h", `${innerHeight}px`);
    window.addEventListener("resize", resize);
    resize();

    const M = window.GM_MAP(D, L, { fixed: true, visible: () => true, onActivate: (id) => toPart("goods", id) });
    // #booth-○○ ならそのブースをマップで示す。#map-○○ ならそのフロアのタブ
    function openHash() {
      let id = "";
      let tab = "";
      try {
        id = decodeURIComponent(location.hash.match(/^#booth-(.+)$/)?.[1] ?? "");
        tab = decodeURIComponent(location.hash.match(/^#map-(.+)$/)?.[1] ?? "");
      } catch {
        return; // 壊れたハッシュは無視する
      }
      if (tab) M.setFloor(tab);
      else if (M.onMap(id)) M.pick(id, { toMap: true });
    }
    window.addEventListener("hashchange", openHash);
    openHash();
    if (!embedded) return;
    listen({
      pick: (m) => M.onMap(m.id) && M.pick(m.id, { toMap: m.show }),
      hits: (m) => M.setHits(new Set(m.hits), m.active),
    });
    tell({ type: "ready" });
  }
})();
