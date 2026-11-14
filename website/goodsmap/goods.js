// 会場・グッズ（試験ページ）
// データ（data-○○○○.js の window.GM_DATA）・一覧の部品（goodslist.js）・会場マップ（goodsmap.js）・ほしいものリスト（wishlist.js）をまとめるページ本体。
// グッズを売り場（公式物販・企業ブース・ライブ物販）ごとにまとめ、最後に会場の売り場・設備の説明を置く。
// 2カラム（641px〜）は、左に会場マップ（下からほしいものリストを引き出せる）、右に一覧。スマホは一覧の上に会場マップ（「会場マップ」のバーで開け閉め）。
// マップのブースを押すと一覧のそのカードへ、カードの番号を押すとマップでそのブースを示す
(() => {
  const D = window.GM_DATA;
  if (!D) return;
  const E = D.event;
  // カレンダーのサイドバーから iframe で開いたとき（?embed=1。カレンダーの nav.js）。goodsmap.css の .is-embed（金の帯を消す・スマホで下を空ける）も効く
  const EMBED = new URLSearchParams(location.search).has("embed");
  if (EMBED) document.documentElement.classList.add("is-embed");

  // 年は上に出さず、フッターのリンクで前年の見本（?year=2026）を開く（正式リリース時に削除）。データのファイルが年ごとなので読み込み直す
  const SAMPLE_YEAR = 2026;
  const yearHref = (year) => {
    const url = new URL(location.href);
    if (year === 2027) url.searchParams.delete("year");
    else url.searchParams.set("year", year);
    url.hash = "";
    return url.search || "?";
  };

  const TEXT = {
    sampleOpen: "前年（2026）の見本を開く",
    sampleClose: "2027に戻る",
    // 売り場。上のしぼり込みのボタンと節の見出し（spot は会場の売り場・設備の説明。しぼり込みのボタンは無い）
    all: "すべて",
    at: { official: "公式物販", booth: "企業ブース", live: "ライブ物販", loose: "売り場の記載なし", spot: "会場の案内" },
    count: (n) => `${n}点`,
    search: "商品名・会社名でさがす",
    leads: {
      booth: "出展企業のブースで売るもの。公式のグッズ一覧に載るもの（公式）と、企業が自社サイト・Xなどで出すお品書きにだけあるもの（企業）があります。ブースの番号を押すとマップで場所が見られます。",
      live: "ライブのグッズ。",
    },
    liveNone: "グッズはまだ載せていません。",
    empty: "見つかりませんでした。ほかのことばでさがすか、「すべて」を押してしぼり込みを外してみてください。",
    // 2カラムの左の列の下から引き出すほしいものリストの取っ手と、スマホのマップの開け閉めのバー
    drawer: "ほしいものリスト",
    mapBar: "会場マップ",
    mapNote: "公式の会場マップをもとに描いた略図です。",
    officialMap: "公式の会場マップ（画像）",
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
  const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  // 2カラムにする幅。goods.css・goodsmap.css・goodsmap.js と合わせる
  const twoCol = matchMedia("(min-width: 641px)");
  // この端末に覚える（ほしいものリストの引き出し・スマホのマップの開け閉め）。読めない・書けないときは覚えない
  const load = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const save = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };

  // ---------- データの整理と一覧の部品（goodslist.js） ----------
  // カードの番号は、押すとマップでそのブースを示すボタン
  let M = null; // 会場マップ（goodsmap.js）。一覧を描いてから作る
  const L = window.GM_LIST(D, {
    beforeScroll: () => M?.holdPreview({ animate: true }) ?? 0,
    boothNo: (b) => `<button type="button" class="gm-no" data-map="${esc(b.no)}" aria-label="${esc(L.TEXT.showOnMap(L.boothName(b)))}">${esc(L.boothLabel(b))}</button>`,
  });
  const { norm, onSale, boothBy, official, live, loose } = L;
  // 企業ブースのカードは、すべてのブース（マップのブースを押したときに移る先）
  const booths = D.booths;
  const boothSale = D.goods.filter((g) => g.booth && onSale(g)).length;
  const COUNT = { official: official.length, booth: boothSale, live: live.length, loose: loose.length };

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
  // 見えているカードは、マップでも当たったところとして濃く出す（goodsmap.js の setHits）
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
    M?.setHits(hits, active);
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
  const sources = [...D.sources.map((s) => ({ ...s, label: `${s.label}（${E.name}）` })), ...(D.notices ?? []).filter((n) => n.kind === "maker")];
  const officialMaps = [].concat(D.officialMap ?? []).map((m) => (typeof m === "string" ? { label: TEXT.officialMap, url: m } : m));
  $("gdFooter").innerHTML = `
    ${D.notice ? `<p>${esc(D.notice)}</p>` : ""}
    <p class="site-footer__updated">${esc(TEXT.updated(`${y}年${mo}月${d}日`))}</p>
    <p>${br(TEXT.disclaimer)}</p>
    <p>${esc(D.mapNote ?? TEXT.mapNote)}${officialMaps.map((m) => `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.label)} ↗</a>`).join("")}</p>
    <p class="gm-sources">${esc(TEXT.sources)}：${sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("／")}</p>
    <p class="site-footer__repo"><a href="${esc(yearHref(D.year === SAMPLE_YEAR ? 2027 : SAMPLE_YEAR))}">${esc(D.year === SAMPLE_YEAR ? TEXT.sampleClose : TEXT.sampleOpen)}</a></p>
    ${EMBED ? "" : `<p class="site-footer__repo"><a href="../">${esc(TEXT.calendar)}</a></p>`}`;

  // ---------- 会場マップの置き場所 ----------
  // 2カラムは左の列にいつも出す（ほしいものリストは、その下から引き出して上に重ねる）。
  // スマホは一覧の上で、「会場マップ」のバーで開け閉めする（はじめは閉じる。開け閉めはこの端末に覚える）
  const $sec = $("map");
  const $side = $("gdSide");
  const $drawer = $("gdDrawer");
  const $bar = $("gdMapBar");
  const $wishPanel = $("gdWish");
  let open = load("sm27-goods-map") === "1";
  const mapVisible = () => twoCol.matches || open;

  $bar.innerHTML = `<span class="gd-mapbar__label">${esc(TEXT.mapBar)}</span><span class="gd-mapbar__sub">${esc(D.floors.map((f) => f.label).join("・"))}</span>`;

  // マップの節を、2カラムなら左の列（引き出しの前）に、スマホなら一覧の上のバーの下に置く。見せる・隠すは CSS（goods.css）
  function place() {
    if (twoCol.matches) {
      if ($sec.parentElement !== $side) $side.insertBefore($sec, $drawer);
    } else if ($sec.previousElementSibling !== $bar) $bar.after($sec);
    document.documentElement.classList.toggle("is-map-open", open);
    $bar.setAttribute("aria-expanded", String(open));
  }
  place();

  // ---------- ほしいものリストの引き出し（2カラム） ----------
  // 左の列の下端の取っ手（件数・合計つき。wishlist.js が入れる）を押すと開け閉めし、上下にドラッグすると引き出す高さを変える。
  // 引き出したリストはマップの上に重ねる（マップの大きさは変えないので、ドラッグ中も測り直さない）。
  // 下端近く（取っ手の高さ＋CLOSE_AT px より下）で離すと閉じる。開け閉めと高さ（左の列に対する割合）はこの端末に覚える。
  // ほしいものリストのリンク ?wish= で開いたときは、開いて始める
  const $handle = $("gdDrawerHandle");
  const $sheet = $drawer.querySelector(".gd-drawer__sheet");
  $("gdDrawerLabel").textContent = TEXT.drawer;
  const HANDLE = 48; // 取っ手の高さ（goods.css の .gd-drawer と合わせる）
  const CLOSE_AT = 60;
  const MIN_OPEN = 160; // 開いたときの最低の高さ
  let drawerOpen = new URLSearchParams(location.search).has("wish") || load("sm27-goods-wish-open") === "1";
  let drawerK = Math.min(1, Math.max(0.2, parseFloat(load("sm27-goods-wish-h")) || 0.6)); // 開いた高さ（左の列の高さに対する割合）
  const openH = () => Math.round(Math.min($side.clientHeight, Math.max(MIN_OPEN, drawerK * $side.clientHeight)));
  function layoutDrawer() {
    $sheet.style.setProperty("--drawer-h", `${drawerOpen ? openH() : HANDLE}px`);
    $drawer.classList.toggle("is-open", drawerOpen);
    $handle.setAttribute("aria-expanded", String(drawerOpen));
    $wishPanel.inert = !drawerOpen; // 閉じているあいだは、Tab で中のボタンに止まらない
  }
  function setDrawer(next) {
    drawerOpen = next;
    save("sm27-goods-wish-open", drawerOpen ? "1" : "0");
    layoutDrawer();
  }
  layoutDrawer();
  {
    let drag = null;
    let suppress = false; // ドラッグのあとのクリックで、開け閉めしない
    $handle.addEventListener("pointerdown", (ev) => {
      if (ev.button) return;
      drag = { id: ev.pointerId, y: ev.clientY, h: $sheet.getBoundingClientRect().height, moved: false };
      // 押した時点で捕まえる（最初の動きで取っ手の外へ出ても、動きを受け取れるように。クリックは取っ手にそのまま届く）
      $handle.setPointerCapture(ev.pointerId);
    });
    $handle.addEventListener("pointermove", (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const dy = ev.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dy) < 5) return;
        drag.moved = true;
        $drawer.classList.add("is-dragging");
      }
      drag.cur = Math.min($side.clientHeight, Math.max(HANDLE, drag.h - dy));
      $sheet.style.setProperty("--drawer-h", `${drag.cur}px`);
    });
    const end = (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      $drawer.classList.remove("is-dragging");
      suppress = true;
      setTimeout(() => (suppress = false), 0);
      if (d.cur < HANDLE + CLOSE_AT) return setDrawer(false);
      drawerK = Math.max(MIN_OPEN, d.cur) / $side.clientHeight;
      save("sm27-goods-wish-h", drawerK.toFixed(3));
      setDrawer(true);
    };
    $handle.addEventListener("pointerup", end);
    $handle.addEventListener("pointercancel", end);
    $handle.addEventListener("click", () => !suppress && setDrawer(!drawerOpen));
    // 画面の高さが変わったら、覚えた割合で高さを合わせ直す
    window.addEventListener("resize", layoutDrawer);
  }
  // スマホのマップを開け閉めする。anchor（カードなど）を渡したときは、マップが上に出ても、それが画面の同じ位置に残るようにする
  // （先頭付近にいるときは動かさない。マップが開いた高さで出て、一覧はその下に続く）
  function setOpen(next, { anchor = null } = {}) {
    if (next === open) return;
    if (!next) M.hide();
    const top = anchor?.getBoundingClientRect().top;
    open = next;
    save("sm27-goods-map", open ? "1" : "0");
    place();
    if (!open) return;
    M.show();
    if (anchor && window.scrollY > 60) window.scrollBy(0, anchor.getBoundingClientRect().top - top);
  }
  // マップを見える状態にする（2カラムは、引き出したほしいものリストを閉じる。スマホはマップを開く）
  const revealMap = (anchor) => (twoCol.matches ? drawerOpen && setDrawer(false) : setOpen(true, { anchor }));

  // ---------- 選択（マップ ⇄ 一覧） ----------
  // ブース・売り場・設備の名前から、一覧のカードを探す（中にブースがある売り場は、その先頭のブース）
  const cardOf = (id) => $(`booth-${D.spots[id]?.booths?.[0] ?? id}`) ?? $(`spot-${id}`);
  // 一覧のカードへ移って光らせる。しぼり込みで隠れているときは、しぼり込みを解く
  function showCard(id, { instant = false } = {}) {
    const $card = cardOf(id);
    if (!$card) return;
    if ($card.hidden) resetFilter();
    L.openCard($card); // 選んで開いたので、しぼり込みを外しても閉じない
    const wait = M.holdPreview({ animate: !instant }); // スマホでマップが縮むアニメーションが終わってから、位置を決めて移る
    const go = () => {
      $card.scrollIntoView({ behavior: instant ? "auto" : behavior, block: "start" });
      $card.classList.remove("is-flash");
      void $card.offsetWidth;
      $card.classList.add("is-flash");
    };
    if (wait) setTimeout(go, wait);
    else go();
  }

  M = window.GM_MAP(D, L, { $list, onActivate: (id) => showCard(id), visible: mapVisible });
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
  // カードの番号を押すと、マップを出してそのブースを示す。
  // カードを開いたときは、マップにあるブース・売り場ならそれを選ぶ（マップが見えていれば示す。見えていないときは、マップを出さない）
  $list.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-map]");
    if (el) {
      revealMap(el.closest(".gm-card"));
      return M.pick(el.dataset.map, { toMap: true });
    }
    const $card = ev.target.closest(".gm-card__head, .gm-official__head")?.parentElement;
    if ($card && !$card.open && M.onMap($card.dataset.no)) M.pick($card.dataset.no, { toMap: mapVisible() });
  });
  $bar.addEventListener("click", () => setOpen(!open));
  // 幅が変わって2カラムとスマホを行き来したら、マップの節を置き直す（2カラムになったら、引き出しの高さも合わせ直す）
  twoCol.addEventListener("change", () => {
    M.hide();
    place();
    if (mapVisible()) M.show();
    layoutDrawer();
  });

  // 2カラムの持ち手：カレンダー（app.js）と同じ操作・同じ処理（util.js の splitter）。ドラッグ（ダブルクリックで既定、← → キーでも動く）で左の列の幅（割合）を変え、この端末に覚える。
  // ドラッグ中はカードの枠だけを幅に合わせ、中身は押した時の幅のまま組み直さない（goodsmap.css の .is-frozen）。マップも測り直さない（goodsmap.js の holdSize）。
  // 手を止めたら、その幅で組み直す
  {
    const $cols = $("gdCols");
    const $main = $("gdMain");
    // 2カラムのタッチ：一覧とほしいものリストを、別々の指で独立してスクロールできるようにする（util.js の touchPan。マップは goodsmap.js が自分で動かす）
    TT_UTIL.touchPan($main, { enabled: () => twoCol.matches });
    TT_UTIL.touchPan($wishPanel, { scroller: () => $wishPanel.querySelector(".gm-wishlist__body"), enabled: () => twoCol.matches });
    const freeze = () => {
      M.holdSize();
      if ($main.classList.contains("is-frozen")) return;
      $main.querySelectorAll(".gm-card").forEach((card) => {
        const cs = getComputedStyle(card);
        card.style.setProperty("--cw", `${card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)}px`);
      });
      $main.classList.add("is-frozen");
    };
    // 幅を変えたか（持ち手を選んだだけで列が広がったときは、マップを測り直さない。外したら元の幅に戻るので、中身は元の大きさのままでぴったり収まる）
    let moved = false;
    const thaw = () => {
      $main.classList.remove("is-frozen");
      M.releaseSize(moved);
      moved = false;
    };
    // 左の列（会場マップ・ほしいものリスト）が読める幅の下限は300px、一覧は320px
    const sp = TT_UTIL.splitter({
      $split: $("gdSplit"),
      $main: $cols,
      cssVar: "--gd-side-w",
      key: "sm27-goods-side-w",
      def: 50,
      minA: 300,
      minB: 320,
      hold: true,
      freeze,
      thaw,
      onChange: () => (moved = true),
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

  // #booth-○○ なら、そのブースを選んで一覧のカードへ。#map-○○ なら、マップを出してそのフロアのタブ（共有したリンクから開いたとき・開いたままハッシュが変わったとき）
  function openHash({ instant = false } = {}) {
    let id = "";
    let tab = "";
    try {
      id = decodeURIComponent(location.hash.match(/^#booth-(.+)$/)?.[1] ?? "");
      tab = decodeURIComponent(location.hash.match(/^#map-(.+)$/)?.[1] ?? "");
    } catch {
      return; // 壊れたハッシュは無視する
    }
    if (tab && D.floors.some((f) => f.id === tab)) {
      revealMap();
      M.setFloor(tab);
      return;
    }
    if (!boothBy.has(id) && id !== "official") return;
    M.pick(id);
    showCard(id, { instant });
  }
  window.addEventListener("hashchange", () => openHash());
  openHash({ instant: true });
})();
