// サイドバー（スマホは画面の下のバー）：日付のボタンをガラスのバーにし、カレンダーのまま、マップ・グッズ・運行情報に切り替える（data.js の nav）。
// 切り替えは新しいドメインと手元だけで出す。github.io（precache.js の SM27_SITE が "pages"）では切り替えボタンを出さず、日付のガラスのバーだけにする（html に .has-views が付かない）。
// 切り替え先は別ページだが、iframe で画面に重ねて出し、カレンダーは裏に残す（戻ったときにスクロール位置・拡大率がそのまま）。
// URL は ?view=○○ にして（history.pushState）、戻るボタンでカレンダーに戻れるようにする。
// app.js より先に読み込む（.has-nav で時間割の高さ・幅が変わるので、app.js が測る前に付けておく）
(() => {
  const nav = window.TT_DATA.nav ?? {};
  // 公開先が分からないとき（更新の途中で、古い precache.js と組み合わさったときなど）も出さない
  const enabled = ["app", "dev"].includes(self.SM27_SITE);
  const items = enabled ? nav.items : [];
  const home = items[0];
  const { esc } = window.TT_UTIL;

  // 線で描くアイコン（24×24。色は文字色）
  const ICONS = {
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4zM9 4v14M15 6v14"/>',
    bag: '<path d="M5 8h14l-1 12.5H6L5 8z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M9 13.5h.01M15 13.5h.01M8 21l2-4M16 21l-2-4"/>',
  };

  document.documentElement.classList.add("has-nav");
  document.documentElement.classList.toggle("has-views", enabled);
  const $nav = document.createElement(enabled ? "nav" : "div");
  $nav.className = "app-nav";
  if (enabled) $nav.setAttribute("aria-label", nav.label);
  // 新しいタブで開いたとき（中クリックなど）もその表示になるよう、リンクにしておく
  // 切り替えボタンは .app-nav__views にまとめる（2カラムでは、下に移す日付ボタンと背景を分ける）
  if (enabled)
    $nav.innerHTML = `<div class="app-nav__views">${items
      .map(
        (it) => `<a class="app-nav__item" draggable="false" href="${it === home ? "./" : `?view=${esc(it.id)}`}" data-view="${esc(it.id)}">
          <svg class="app-nav__icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[it.icon] ?? ""}</svg><span class="app-nav__label">${esc(it.label)}</span>
        </a>`
      )
      .join("")}</div>`;
  document.body.prepend($nav);

  // 切り替え先の枠（iframe）。最初に要るときに作り、以降は閉じても残す（中のスクロール位置などを保つ）。
  // 隠している間も display: none にはしない（大きさ0で読み込むと、マップの初期の拡大率などが狂うため。style.css の .app-view）
  const views = new Map();
  // 手元で開いたときは localUrl（data.js）を開く。LiveServer はリポジトリのフォルダごと配信するので、手元の hokkaido_delay/ が見える
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  // pass（data.js）の名前の引数は、カレンダーを開いたときの URL から表示のページへ渡す（ほしいものリストのリンク ?view=goods&wish=… など）。
  // 渡した wish はカレンダーの URL から消す（読み込みは表示のページが行い、戻る・共有で何度も読み込まないように）
  const startParams = new URLSearchParams(location.search);
  const srcOf = (it) => {
    const u = new URL((local && it.localUrl) || it.url, location.href);
    for (const k of it.pass ?? []) if (startParams.has(k)) u.searchParams.set(k, startParams.get(k));
    if ((it.pass ?? []).includes("wish") && startParams.has("wish")) {
      startParams.delete("wish");
      const now = new URL(location.href);
      now.searchParams.delete("wish");
      history.replaceState(history.state, "", now);
    }
    return u.href;
  };
  // url の無い項目（カレンダー以外。いまは無い）は、iframe を入れず背景だけの枠にする（data.js の nav）
  const viewFor = (it) => {
    if (!it || it === home) return null;
    let $v = views.get(it.id);
    if ($v) return $v;
    $v = document.createElement("div");
    // 外部URLのページ（運行情報など、embed.js を読まないページ）は、親の枠側で画面の端の安全な余白（パンチホール等）を空ける
    $v.className = `app-view${it.url && /^https?:/.test(it.url) ? " app-view--ext" : ""}`;
    if (it.url) $v.innerHTML = `<iframe class="app-view__frame" src="${esc(srcOf(it))}" title="${esc(it.label)}"></iframe>`;
    document.body.append($v);
    views.set(it.id, $v);
    return $v;
  };
  const itemOf = (el) => items.find((x) => x.id === el?.closest?.("[data-view]")?.dataset.view);

  const twoCol = matchMedia("(min-width: 641px)");
  const { glassBar } = window.TT_UTIL;

  const $main = document.querySelector(".main");
  const baseTitle = document.title;
  let current = null;
  const show = (id, push) => {
    const it = items.find((x) => x.id === id) ?? home;
    if (it.id === current) return;
    // 表示どうし（マップ→運行情報など）の切り替えでは、前の表示を下に残したまま次をフェードインする
    // （両方を同時にフェードすると、途中で裏のカレンダーが透けて見えるため。style.css の .is-behind）
    const $prev = views.get(current);
    current = it.id;
    const isView = it !== home; // カレンダー以外（iframe の表示と、中身の無い表示）
    viewFor(it);
    views.forEach(($v, vid) => {
      $v.classList.toggle("is-open", vid === it.id);
      $v.classList.toggle("is-behind", isView && $v === $prev);
    });
    // 裏のカレンダーは、Tab で移ったり読み上げたりしないようにし、ページのスクロールも止める（iframe の端でスクロールが外へ伝わるため）
    $main.inert = isView;
    document.documentElement.classList.toggle("is-view-open", isView);
    $nav.querySelectorAll("[data-view]").forEach((a) => {
      if (a.dataset.view === it.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    setViewIndex(items.indexOf(it));
    document.title = isView ? `${it.label}｜${baseTitle}` : baseTitle;
    if (!push) return;
    // #日付 はそのまま残す
    const url = new URL(location.href);
    if (isView) url.searchParams.set("view", it.id);
    else url.searchParams.delete("view");
    history.pushState(null, "", url);
  };
  let setViewIndex = () => {};
  if (enabled) {
    setViewIndex = glassBar(
      $nav.querySelector(".app-nav__views"),
      "[data-view]",
      (a) => show(a.dataset.view, true),
      (a) => viewFor(itemOf(a)) // 指が乗った時点で読み込み始める
    );
    const fromUrl = () => show(new URLSearchParams(location.search).get("view"), false);
    fromUrl();
    window.addEventListener("popstate", fromUrl);
  }

  $nav.addEventListener("click", (ev) => {
    const a = ev.target.closest("[data-view]");
    if (!a || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    show(a.dataset.view, true);
  });

  // マップ（id: map。map/）とグッズ（id: goods。goods/）は別のページで、別の iframe。
  // マップのブースを押す→グッズのそのカードへ、カードの番号を押す→マップでそのブースを示す、しぼり込みの結果をマップで濃く出す、を、ここで切り替えと取り次ぎをする
  // （メッセージの中身は goods/goods.js の「ページどうしのやりとり」）。相手がまだ読み込み中なら、読み込み終わり（ready）に渡す
  if (enabled) {
    const TALK = "goodsmap"; // goods/goods.js・map/map.js と合わせる（グッズとマップのやりとりの名前）
    const PARTS = ["map", "goods"];
    const frameOf = (id) => views.get(id)?.querySelector("iframe");
    const ready = new Set();
    const waiting = { map: [], goods: [] }; // 読み込み前の相手に渡すもの
    let lastHits = null; // グッズのしぼり込みの結果（マップが後から読み込まれても渡せるよう、最後のものを持つ）
    const send = (id, msg) => {
      if (ready.has(id)) frameOf(id)?.contentWindow?.postMessage({ sm27: TALK, ...msg }, location.origin);
      else waiting[id]?.push(msg);
    };
    const go = (id, msg) => {
      if (!items.some((x) => x.id === id)) return;
      show(id, true);
      send(id, msg);
    };
    window.addEventListener("message", (ev) => {
      const m = ev.data;
      if (ev.origin !== location.origin || m?.sm27 !== TALK) return;
      const from = PARTS.find((id) => frameOf(id)?.contentWindow === ev.source);
      if (!from) return;
      switch (m.type) {
        case "ready": {
          ready.add(from);
          const msgs = waiting[from].splice(0);
          if (from === "map" && lastHits) send("map", lastHits);
          msgs.forEach((x) => send(from, x));
          break;
        }
        case "map": // グッズ → マップ：切り替えて、そのブースを示す
          go("map", { type: "pick", id: m.id, show: true });
          break;
        case "booth": // マップ → グッズ：切り替えて、そのカードへ
          go("goods", { type: "card", id: m.id });
          break;
        case "select": // グッズでカードを開いた：切り替えず、マップでそのブースを選んでおく
          send("map", { type: "pick", id: m.id, show: false });
          break;
        case "hits":
          lastHits = { type: "hits", hits: m.hits, active: m.active };
          if (ready.has("map")) send("map", lastHits);
          break;
      }
    });
  }

  // 日付ボタン（.day-nav）は、2カラム（641px〜）ではサイドバーに移す（左に縦のときは切り替えボタンの下、下に横一列のときは左。style.css）。
  // スマホは元の場所（時間割の下端）に戻す
  const $dayNav = document.querySelector(".day-nav");
  const dayNavHome = [$dayNav.parentElement, $dayNav.nextSibling];
  const placeDayNav = () => (twoCol.matches ? $nav.append($dayNav) : dayNavHome[0].insertBefore($dayNav, dayNavHome[1]));
  placeDayNav();
  twoCol.addEventListener("change", placeDayNav);
  // マップなどを出しているときに日付ボタンを押したら、カレンダーに戻す（移動は app.js・train-view.js がそのまま行う）
  if (enabled) $dayNav.addEventListener("click", () => current !== home.id && show(home.id, true), true);
  // 日付のボタン（#dayNav の中）をガラスのバーにする（「市電いまどこ」はその外の独立したボタン）。
  // 板は今見ている日（app.js が付ける .is-active）に置き、離した日付ボタンは押したのと同じ扱いにする
  const $days = document.getElementById("dayNav");
  const setDayIndex = glassBar($days, ".day-chip", (el) => el.click());
  const syncDay = () => setDayIndex(Math.max(0, [...$days.querySelectorAll(".day-chip")].findIndex((c) => c.classList.contains("is-active"))));
  new MutationObserver(syncDay).observe($days, { subtree: true, childList: true, attributeFilter: ["class"] });
  syncDay();

  // 押す前（指が触れた・マウスが乗った・Tab で選んだ時点）から読み込み始め、押したときにはなるべく表示できているようにする
  const warm = (ev) => viewFor(itemOf(ev.target));
  for (const type of ["pointerover", "touchstart", "focusin"]) $nav.addEventListener(type, warm, { passive: true });
  // preload: true のものは、カレンダーを読み込み終えて手が空いてから、1つずつ裏で読み込んでおく
  // （同じスレッドで動くので、2つ同時に起こすとカレンダーの操作が止まる。通信量を抑える設定のときは先読みしない）
  const idle = window.requestIdleCallback ? (fn) => requestIdleCallback(fn, { timeout: 5000 }) : (fn) => setTimeout(fn, 300);
  window.addEventListener("load", () => {
    if (navigator.connection?.saveData) return;
    const queue = items.filter((it) => it.preload);
    const next = () => {
      const it = queue.shift();
      if (!it) return;
      const $f = viewFor(it).querySelector("iframe");
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        idle(next);
      };
      $f.addEventListener("load", () => setTimeout(go, 300), { once: true });
      setTimeout(go, 8000); // 読み込み終わりを待てないとき（すでに読み込み済みなど）
    };
    setTimeout(() => idle(next), 1000);
  });
})();
