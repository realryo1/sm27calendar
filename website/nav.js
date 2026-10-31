// サイドバー（スマホは画面の下のバー）：日付のボタンをガラスのバーにし、カレンダーのまま、マップ・グッズ・運行情報に切り替える（data.js の nav）。
// 切り替え（nav.enabled）は仮実装なので、無効のときは切り替えボタンを出さず、日付のガラスのバーだけにする（html に .has-views が付かない）。
// 切り替え先は別ページだが、iframe で画面に重ねて出し、カレンダーは裏に残す（戻ったときにスクロール位置・拡大率がそのまま）。
// URL は ?view=○○ にして（history.pushState）、戻るボタンでカレンダーに戻れるようにする。
// app.js より先に読み込む（.has-nav で時間割の高さ・幅が変わるので、app.js が測る前に付けておく）
(() => {
  const nav = window.TT_DATA.nav ?? {};
  const enabled = !!nav.enabled;
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
        (it) => `<a class="app-nav__item" draggable="false" href="${it.url ? `?view=${esc(it.id)}` : "./"}" data-view="${esc(it.id)}">
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
  const viewFor = (it) => {
    if (!it?.url) return null;
    let $v = views.get(it.id);
    if ($v) return $v;
    $v = document.createElement("div");
    $v.className = "app-view";
    $v.innerHTML = `<iframe class="app-view__frame" src="${esc(srcOf(it))}" title="${esc(it.label)}"></iframe>`;
    document.body.append($v);
    views.set(it.id, $v);
    return $v;
  };
  const itemOf = (el) => items.find((x) => x.id === el?.closest?.("[data-view]")?.dataset.view);

  // スマホのガラスのバー（切り替えバー・日付ボタンのバー）：iOS のタブバー（Liquid Glass）のように、
  // 選んでいるボタンの下に板（.glass-glider）を敷く。押した瞬間に板が膨らんでそのボタンまで動き、押したまま横に動かすと板が指について動く。
  // 離したところのボタンを pick に渡す（クリックは待たない）。hover は指が乗ったボタン（読み込みの先回りなど）。
  // 左のサイドバーでは縦に並ぶので（style.css）、縦に動かす。返す関数で、板を置くボタンの番号を決める
  const twoCol = matchMedia("(min-width: 641px)");
  const glassBar = ($bar, sel, pick, hover = () => {}) => {
    const $glider = document.createElement("span");
    $glider.className = "glass-glider";
    $glider.setAttribute("aria-hidden", "true");
    $bar.prepend($glider);
    $bar.classList.add("glass-bar");
    let drag = null;
    let suppressUntil = 0;
    const indexAt = (p) => Math.max(0, Math.min(drag.slots.length - 1, Math.floor((p - drag.start) / drag.w)));
    const posOf = (ev) => (drag.vert ? ev.clientY : ev.clientX);
    const moveTo = (px) => ($glider.style.transform = `translate${drag.vert ? "Y" : "X"}(${px}px)`);
    const hoverAt = (i) => {
      drag.slots.forEach((el, k) => el.classList.toggle("is-hover", k === i));
      hover(drag.slots[i]);
    };
    const end = (ev) => {
      if (!drag) return;
      const el = ev.type === "pointerup" ? drag.slots[indexAt(posOf(ev))] : null;
      drag.slots.forEach((s) => s.classList.remove("is-hover"));
      drag = null;
      $bar.classList.remove("is-pressed", "is-dragging");
      $glider.style.transform = ""; // 選んだボタンの位置へ、はねるように戻る（style.css の transition）
      if (!el) return;
      suppressUntil = performance.now() + 500;
      pick(el);
    };
    $bar.addEventListener("pointerdown", (ev) => {
      // 新しいタブで開く操作（中クリック・Ctrl などを押しながら）は、ふつうのリンクのままにする
      if (ev.button || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      const slots = [...$bar.querySelectorAll(sel)];
      const r = $bar.getBoundingClientRect();
      const cs = getComputedStyle($bar);
      const vert = cs.flexDirection === "column";
      const pad = parseFloat(vert ? cs.paddingTop : cs.paddingLeft);
      const size = vert ? r.height : r.width;
      drag = { id: ev.pointerId, vert, p0: vert ? ev.clientY : ev.clientX, start: (vert ? r.top : r.left) + pad, w: (size - pad * 2) / slots.length, slots, moved: false };
      $bar.setPointerCapture(ev.pointerId); // 押したまま外へ出ても追い、外で離しても終わらせる（選ぶのは離したときにここで行う）
      $bar.classList.add("is-pressed");
      const i = indexAt(drag.p0);
      moveTo(i * drag.w); // 押したボタンへ、はねるように動く
      hoverAt(i);
    });
    $bar.addEventListener("pointermove", (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(posOf(ev) - drag.p0) < 6) return;
        drag.moved = true;
        $bar.classList.add("is-dragging");
      }
      moveTo(Math.max(0, Math.min(drag.w * (drag.slots.length - 1), posOf(ev) - drag.start - drag.w / 2)));
      hoverAt(indexAt(posOf(ev)));
    });
    // lostpointercapture は使わない（指を置いたボタンが持っていた捕捉を、動かし始めにバーへ移すときにも起きるため）
    for (const type of ["pointerup", "pointercancel"]) $bar.addEventListener(type, end);
    // 指を離して選んだ直後に、指を置いたボタンへ届く本物のクリックは止める（選んだボタンへは pick が直接行う）
    $bar.addEventListener(
      "click",
      (ev) => {
        if (!ev.isTrusted || performance.now() >= suppressUntil) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
      },
      true
    );
    return (i) => {
      if (!$glider.isConnected) $bar.prepend($glider); // 中身を描き直されたとき（app.js の日付ボタン）は戻す
      $bar.style.setProperty("--n", $bar.querySelectorAll(sel).length);
      $bar.style.setProperty("--i", i);
    };
  };

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
    viewFor(it);
    views.forEach(($v, vid) => {
      $v.classList.toggle("is-open", vid === it.id);
      $v.classList.toggle("is-behind", !!it.url && $v === $prev);
    });
    // 裏のカレンダーは、Tab で移ったり読み上げたりしないようにし、ページのスクロールも止める（iframe の端でスクロールが外へ伝わるため）
    $main.inert = !!it.url;
    document.documentElement.classList.toggle("is-view-open", !!it.url);
    $nav.querySelectorAll("[data-view]").forEach((a) => {
      if (a.dataset.view === it.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    setViewIndex(items.indexOf(it));
    document.title = it.url ? `${it.label}｜${baseTitle}` : baseTitle;
    if (!push) return;
    // #日付 はそのまま残す
    const url = new URL(location.href);
    if (it.url) url.searchParams.set("view", it.id);
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

  // 表示の中のページから、別の表示へ移る（グッズ一覧 test_sm26goodsmap/?page=goods のブースの番号 → マップのそのブース）。
  // { type: "sm27-view", view: "map", search: "year=2026", hash: "#booth-11" } を postMessage で受け取る。
  // search（年など）が今の iframe と違えば読み込み直し、同じならハッシュだけ変える（マップは hashchange でそのブースを開く）
  if (enabled)
    window.addEventListener("message", (ev) => {
      const { type, view, search = "", hash = "" } = ev.data ?? {};
      const it = items.find((x) => x.id === view && x.url);
      if (ev.origin !== location.origin || type !== "sm27-view" || !it) return;
      const $f = viewFor(it).querySelector("iframe");
      const want = new URL((local && it.localUrl) || it.url, location.href);
      for (const [k, v] of new URLSearchParams(search)) want.searchParams.set(k, v);
      try {
        const cur = $f.contentWindow.location;
        if (cur.pathname !== want.pathname || cur.search !== want.search) throw 0;
        if (cur.hash === hash) cur.hash = ""; // 同じブースをもう一度押したときも hashchange を起こす
        cur.hash = hash;
      } catch {
        $f.src = want.href + hash;
      }
      show(it.id, true);
    });

  // 押す前（指が触れた・マウスが乗った・Tab で選んだ時点）から読み込み始め、押したときにはなるべく表示できているようにする
  const warm = (ev) => viewFor(itemOf(ev.target));
  for (const type of ["pointerover", "touchstart", "focusin"]) $nav.addEventListener(type, warm, { passive: true });
  // preload: true のものは、カレンダーを読み込み終えてから裏で読み込んでおく
  window.addEventListener("load", () => setTimeout(() => items.filter((it) => it.preload).forEach(viewFor), 1000));
})();
