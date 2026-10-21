(() => {
  const { range, days, venues, events } = window.TT_DATA;
  const venueById = Object.fromEntries(venues.map((v) => [v.id, v]));

  const $dayNav = document.getElementById("dayNav");
  const $scroll = document.getElementById("ttScroll");
  const $tt = document.getElementById("tt");
  const $venueList = document.getElementById("venueList");
  const $toBoard = document.getElementById("toBoard");

  const toHour = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h + m / 60;
  };
  const pos = (hour) => `calc(${hour - range.start} * var(--hour))`;
  const span = (from, to) => `calc(${to - from} * var(--hour))`;
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const badges = (ev) =>
    (ev.official ? '<span class="badge badge--official">公式</span>' : '<span class="badge badge--fan">非公式</span>') +
    (ev.tentative === "end"
      ? '<span class="badge badge--tentative">終演仮</span>'
      : ev.tentative
        ? '<span class="badge badge--tentative">時間仮</span>'
        : "");

  // 会場見出し名（表の列見出しと下のカードで共通）。括弧書きは小さく表示
  const headName = (v) => esc(v.short ?? v.name).replace(/（(.+?)）/, "<small>（$1）</small>");

  const timeText = (ev) => (ev.allDay ? "時間未発表" : `${ev.start} – ${ev.end}`);

  const nowJST = () => {
    const now = new Date();
    const dateId = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const [h, m] = now
      .toLocaleTimeString("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })
      .split(":")
      .map(Number);
    return { dateId, hour: h + m / 60 };
  };

  // 行構成: 1行目=会場見出し、以降は日ごとに [日付帯, タイムテーブル本体]
  const dayRow = (i) => 2 + i * 2;
  const bodyRow = (i) => 3 + i * 2;

  function renderNav() {
    $dayNav.innerHTML = days
      .map(
        (d) => `<button class="day-chip" data-day="${d.id}">
          <span class="day-chip__date">${d.label}</span><span class="day-chip__week">${d.week}</span>
        </button>`
      )
      .join("");
  }

  function renderBoard() {
    const hours = [];
    for (let h = range.start; h <= range.end; h++) hours.push(h);

    const axis = (row) => `<div class="tt-axis" style="grid-row:${row}">${hours
      .map(
        (h, i) => `<div class="tt-axis__hour" style="top:${pos(h)}">
          <span class="tt-axis__h">${h}</span><span class="tt-axis__m">00</span>
        </div>${
          i < hours.length - 1
            ? `<div class="tt-axis__half" style="top:${pos(h + 0.5)}"><span class="tt-axis__m">30</span></div>`
            : ""
        }`
      )
      .join("")}</div>`;

    const heads = venues
      .map(
        (v) => `<div class="tt-head-cell"><div class="tt-head theme-${v.theme}">
          <span class="tt-head__letter">${v.letter}</span>
          <span class="tt-head__name" title="${esc(v.name)}">${headName(v)}</span>
          <span class="tt-head__area">${esc(v.area)}</span>
        </div></div>`
      )
      .join("");

    const sections = days
      .map((d, i) => {
        const dayEvents = events.filter((e) => e.days.includes(d.id));
        const cols = venues
          .map((v) => {
            const blocks = dayEvents
              .filter((e) => e.venue === v.id)
              .map((e) => renderEvent(e))
              .join("");
            return `<div class="tt-col theme-${v.theme}" style="grid-row:${bodyRow(i)}">${blocks}</div>`;
          })
          .join("");
        return `<div class="tt-day" id="day-${d.id}" style="grid-row:${dayRow(i)}">
            <span class="tt-day__label">
              <span class="tt-day__date">${d.label}</span>
              <span class="tt-day__week">${d.week}</span>
              <span class="tt-day__ja">（${d.weekJa}）</span>
            </span>
          </div>${axis(bodyRow(i))}${cols}`;
      })
      .join("");

    $tt.style.setProperty("--cols", venues.length);
    $tt.style.gridTemplateRows = `var(--head) repeat(${days.length}, var(--divider) calc(${range.end - range.start} * var(--hour)))`;
    $tt.innerHTML = `<div class="tt-corner"></div>${heads}${sections}<div class="tt-now" hidden></div>`;

    renderVenues();
    updateNow();
  }

  function renderEvent(e) {
    if (e.allDay) {
      return `<button class="ev ev--allday" data-ev="${e.id}">
        <span class="ev__inner">
          <span class="ev__time">${timeText(e)}</span>
          <span class="ev__title">${esc(e.title)}</span>
          <span class="ev__badges">${badges(e)}</span>
        </span>
      </button>`;
    }
    const start = toHour(e.start);
    const end = toHour(e.end);
    const top = e.open ? toHour(e.open) : start;
    const openPart = e.open
      ? `<span class="ev__open" style="height:${span(top, start)}">OPEN ${e.open}</span>`
      : "";
    const waitPart = e.wait
      ? `<div class="ev-wait" data-wait="${e.id}" role="button" tabindex="0" style="top:${pos(toHour(e.wait))};height:${span(toHour(e.wait), top)}">
          <span class="ev-wait__label">早朝待機</span>
          <span class="ev-wait__time">日の出 ${e.wait.replace(/^0/, "")}〜</span>
        </div>`
      : "";
    const lastEntry = e.lastEntry
      ? `<span class="ev__last" style="top:${span(top, toHour(e.lastEntry))}">最終入場 ${e.lastEntry}</span>`
      : "";
    const marks = (e.marks ?? [])
      .map(
        (m) => `<div class="ev-mark" data-wait="${e.id}" style="top:${pos(toHour(m.time))}" title="${esc(m.detail)}">
          <span class="ev-mark__label">${esc(m.label)} ${m.time.replace(/^0/, "")}</span>
        </div>`
      )
      .join("");
    return `${waitPart}${marks}<button class="ev${e.tentative === "end" ? " ev--tentative-end" : e.tentative ? " ev--tentative" : ""}" data-ev="${e.id}"
        style="top:${pos(top)};height:${span(top, end)}">
      ${openPart}
      <span class="ev__inner">
        <span class="ev__time">${e.start} ▶ ${e.tentative === "end" ? `<span class="ev__tbd">${e.end}</span>` : e.end}</span>
        <span class="ev__title">${esc(e.title)}</span>
        ${e.sub ? `<span class="ev__sub">${esc(e.sub)}</span>` : ""}
        <span class="ev__badges">${badges(e)}</span>
      </span>
      ${lastEntry}
    </button>`;
  }

  // 同じ内容で日付だけ違うイベント（LIVE の各日公演など）は1件にまとめて表示する
  const groupKey = (e) => [e.venue, e.title, e.sub, e.open, e.start, e.end].join("|");
  const dayLabel = (id) => {
    const d = days.find((x) => x.id === id);
    return d ? `${d.label}<small>(${d.weekJa})</small>` : id;
  };

  function renderVenues() {
    $venueList.innerHTML = venues
      .map((v) => {
        const groups = [];
        events
          .filter((e) => e.venue === v.id)
          .forEach((e) => {
            const g = groups.find((x) => x.key === groupKey(e));
            if (g) {
              g.ids.push(e.id);
              g.days.push(...e.days);
            } else groups.push({ key: groupKey(e), ids: [e.id], days: [...e.days], e });
          });
        const list = groups.map(({ ids, days: ds, e }) => renderVenueEvent(e, ids, ds)).join("");
        const live = events.some((e) => e.venue === v.id && e.live);
        return `<article class="venue-card theme-${v.theme}${live ? " venue-card--wide" : ""}" id="venue-${v.id}">
          <h3 class="venue-card__name"><span class="venue-card__letter">${v.letter}</span>${headName(v)}<small class="venue-card__area">${esc(v.area)}</small></h3>
          <dl class="venue-card__info">
            <dt>場所</dt><dd>${v.short ? `${esc(v.name)}<br>` : ""}${esc(v.address)}</dd>
            <dt>最寄り</dt><dd>${esc(v.station)}</dd>
          </dl>
          <ul class="vc-events">${list}</ul>
          ${
            live
              ? `<div class="train-live" id="train-live">
                  <h4 class="train-live__title">いまどこ？<small>（在線予測）</small></h4>
                  <div id="trainLive"></div>
                </div>`
              : ""
          }
        </article>`;
      })
      .join("");
  }

  function renderVenueEvent(e, ids, ds) {
    const links = e.links ?? [{ label: "公式ページ", url: e.url }];
    const times = [
      e.wait && ["早朝待機", `${e.wait}〜`],
      e.open && ["開場", e.open],
      [e.open ? "開演" : "時間", e.allDay ? "未発表" : `${e.start} – ${e.end}${e.tentative ? "（仮）" : ""}`],
      e.lastEntry && ["最終入場", e.lastEntry],
    ].filter(Boolean);
    const wait = e.wait
      ? `<details class="vc-wait" id="wait-${e.id}">
          <summary>早朝待機の案内（前年参考）</summary>
          <div class="vc-wait__body">
            ${(e.marks ?? [])
              .map((m) => `<p class="vc-wait__mark"><span class="ev-mark__label">${esc(m.label)} ${m.time}</span>${esc(m.detail)}</p>`)
              .join("")}
            ${
              e.waitImage
                ? `<a class="vc-image" href="${esc(e.waitSource ?? e.waitImage)}" target="_blank" rel="noopener">
                    <img src="${esc(e.waitImage)}" alt="前年の早朝待機列の案内図" loading="lazy">
                  </a>`
                : ""
            }
            <p class="vc-ev__note">日の出（${e.wait}）頃からの待機を想定しています。画像は前年のもので、今年の待機列とは異なる場合があります。画像をタップすると出典（SNOW MIKU 2026 公式サイト）が開きます。</p>
          </div>
        </details>`
      : "";
    return `<li class="vc-ev" id="ev-${ids[0]}" data-ids="${ids.join(" ")}">
      <div class="vc-ev__head">
        <span class="vc-ev__days">${[...new Set(ds)].sort().map(dayLabel).join(" ・ ")}</span>
        <span class="ev__badges">${badges(e)}</span>
      </div>
      <p class="vc-ev__title">${esc(e.title)}${e.sub ? ` <small>${esc(e.sub)}</small>` : ""}</p>
      <dl class="vc-ev__times">${times.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join("")}</dl>
      ${e.note ? `<p class="vc-ev__note">${esc(e.note)}</p>` : ""}
      ${wait}
      <div class="vc-ev__links">${links
        .map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`)
        .join("")}</div>
    </li>`;
  }

  // 予定のタップで、下の会場カード（venue-○○）へ移動し、該当イベントを強調する
  function showEvent(id) {
    const el = $venueList.querySelector(`[data-ids~="${CSS.escape(id)}"]`);
    if (!el) return;
    el.closest(".venue-card").scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("is-flash");
    void el.offsetWidth;
    el.classList.add("is-flash");
  }

  function showWait(id) {
    const el = document.getElementById("wait-" + id);
    if (!el) return;
    el.open = true;
    el.closest(".venue-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // 現在時刻ライン（イベント期間中のみ表示）
  function updateNow() {
    const $now = $tt.querySelector(".tt-now");
    const { dateId, hour } = nowJST();
    const i = days.findIndex((d) => d.id === dateId);
    const visible = i >= 0 && hour >= range.start && hour <= range.end;
    $now.hidden = !visible;
    if (visible) {
      $now.style.gridRow = bodyRow(i);
      $now.style.marginTop = pos(hour);
    }
  }

  // 日付ジャンプ: 該当日の本体の先頭が日付帯の直下に来るようにスクロール
  const stickyOffset = () =>
    $tt.querySelector(".tt-head-cell").offsetHeight + $tt.querySelector(".tt-day").offsetHeight;

  function scrollToDay(id, hour, behavior = "smooth") {
    const i = days.findIndex((d) => d.id === id);
    const col = $tt.querySelectorAll(".tt-axis")[i];
    const hourPx = col.offsetHeight / (range.end - range.start);
    const offset = hour ? (hour - range.start) * hourPx : 0;
    $scroll.scrollTo({ top: col.offsetTop - stickyOffset() + offset, behavior });
  }

  function updateActiveChip() {
    const y = $scroll.scrollTop + stickyOffset() + 1;
    const axes = [...$tt.querySelectorAll(".tt-axis")];
    let active = 0;
    axes.forEach((a, i) => {
      if (a.offsetTop - $tt.querySelector(".tt-day").offsetHeight <= y) active = i;
    });
    $dayNav.querySelectorAll(".day-chip").forEach((c, i) => c.classList.toggle("is-active", i === active));
  }

  $dayNav.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-day]");
    if (btn) scrollToDay(btn.dataset.day);
  });

  $scroll.addEventListener("scroll", () => requestAnimationFrame(updateActiveChip), { passive: true });

  $tt.addEventListener("click", (ev) => {
    const wait = ev.target.closest("[data-wait]");
    if (wait) return showWait(wait.dataset.wait);
    const btn = ev.target.closest("[data-ev]");
    if (btn) showEvent(btn.dataset.ev);
  });

  $tt.addEventListener("keydown", (ev) => {
    const wait = ev.target.closest("[data-wait]");
    if (wait && (ev.key === "Enter" || ev.key === " ")) {
      ev.preventDefault();
      showWait(wait.dataset.wait);
    }
  });

  // 表が画面外にあるときだけ「表へ戻る」ボタンを出す
  const $board = document.querySelector(".board");
  new IntersectionObserver(([entry]) => ($toBoard.hidden = entry.isIntersecting), { threshold: 0.15 }).observe($board);
  $toBoard.addEventListener("click", () => $board.scrollIntoView({ behavior: "smooth" }));

  // ---------- 拡大縮小（縦ピンチ＝時間方向、横ピンチ＝会場列の幅） ----------
  const ZOOM = { hour: [28, 220], col: [72, 420] };
  const $zoomReset = document.getElementById("zoomReset");
  const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
  const cssPx = (name) => parseFloat(getComputedStyle($tt).getPropertyValue(name));
  const colWidth = () => $tt.querySelector(".tt-col").getBoundingClientRect().width;
  const hourPx = () => cssPx("--hour");

  // 縮小時は予定ブロックの表示を簡略化する
  const updateDensity = () => {
    const h = hourPx();
    $tt.dataset.density = h < 44 ? "tight" : h < 60 ? "compact" : "";
  };

  function saveZoom() {
    try {
      const v = { hour: $tt.style.getPropertyValue("--hour"), col: $tt.style.getPropertyValue("--colmin") };
      localStorage.setItem("tt-zoom", JSON.stringify(v));
    } catch {}
  }
  function loadZoom() {
    try {
      const v = JSON.parse(localStorage.getItem("tt-zoom") || "null");
      if (v?.hour) $tt.style.setProperty("--hour", v.hour);
      if (v?.col) $tt.style.setProperty("--colmin", v.col);
    } catch {}
    $zoomReset.hidden = !$tt.style.getPropertyValue("--hour") && !$tt.style.getPropertyValue("--colmin");
    updateDensity();
  }

  // 拡大率 ky（縦）/ kx（横）を、開始時の大きさ base に掛けて適用。
  // anchor（スクロール領域内の座標）の下にある内容が動かないようにスクロール位置を補正する
  function applyZoom(base, kx, ky, anchor) {
    const rect = $scroll.getBoundingClientRect();
    const ax = anchor.x - rect.left;
    const ay = anchor.y - rect.top;
    const hour = clamp(base.hour * ky, ZOOM.hour);
    const col = clamp(base.col * kx, ZOOM.col);
    $tt.style.setProperty("--hour", `${hour.toFixed(1)}px`);
    $tt.style.setProperty("--colmin", `${col.toFixed(1)}px`);
    const ry = hour / base.hour;
    const rx = colWidth() / base.colW;
    $scroll.scrollTop = (base.top + ay) * ry - ay;
    $scroll.scrollLeft = (base.left + ax) * rx - ax;
    $zoomReset.hidden = false;
    updateDensity();
  }

  const zoomBase = () => ({
    hour: hourPx(),
    col: colWidth(),
    colW: colWidth(),
    top: $scroll.scrollTop,
    left: $scroll.scrollLeft,
  });

  // タッチのピンチ
  let pinch = null;
  const spread = (t) => ({
    dx: Math.abs(t[0].clientX - t[1].clientX),
    dy: Math.abs(t[0].clientY - t[1].clientY),
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
  });
  $scroll.addEventListener(
    "touchstart",
    (ev) => {
      if (ev.touches.length !== 2) return;
      pinch = { start: spread(ev.touches), base: zoomBase(), raf: 0 };
    },
    { passive: true }
  );
  $scroll.addEventListener(
    "touchmove",
    (ev) => {
      if (!pinch || ev.touches.length !== 2) return;
      ev.preventDefault();
      const now = spread(ev.touches);
      // 指の開き方が小さい方向は拡大率が暴れるので変えない
      const kx = pinch.start.dx > 40 ? now.dx / pinch.start.dx : 1;
      const ky = pinch.start.dy > 40 ? now.dy / pinch.start.dy : 1;
      cancelAnimationFrame(pinch.raf);
      pinch.raf = requestAnimationFrame(() => applyZoom(pinch.base, kx, ky, now));
    },
    { passive: false }
  );
  const endPinch = (ev) => {
    if (!pinch || ev.touches.length >= 2) return;
    pinch = null;
    saveZoom();
    updateActiveChip();
  };
  $scroll.addEventListener("touchend", endPinch);
  $scroll.addEventListener("touchcancel", endPinch);
  // iOS Safari のページ全体のピンチズームを抑止
  $scroll.addEventListener("gesturestart", (ev) => ev.preventDefault());

  // PC: Ctrl+ホイール（トラックパッドのピンチ）で縦、Ctrl+Shift+ホイールで横
  $scroll.addEventListener(
    "wheel",
    (ev) => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      const k = Math.exp(-(ev.deltaY || ev.deltaX) * 0.01);
      const horizontal = ev.shiftKey;
      applyZoom(zoomBase(), horizontal ? k : 1, horizontal ? 1 : k, { x: ev.clientX, y: ev.clientY });
      saveZoom();
    },
    { passive: false }
  );

  $zoomReset.addEventListener("click", () => {
    const base = zoomBase();
    const rect = $scroll.getBoundingClientRect();
    $tt.style.removeProperty("--hour");
    $tt.style.removeProperty("--colmin");
    const ry = hourPx() / base.hour;
    $scroll.scrollTop = (base.top + rect.height / 2) * ry - rect.height / 2;
    $zoomReset.hidden = true;
    updateDensity();
    try {
      localStorage.removeItem("tt-zoom");
    } catch {}
  });

  renderNav();
  renderBoard();
  loadZoom();

  // URL の #日付、またはイベント当日なら現在時刻付近を初期表示
  const hashId = location.hash.slice(1);
  const { dateId, hour } = nowJST();
  if (days.some((d) => d.id === hashId)) scrollToDay(hashId, null, "instant");
  else if (days.some((d) => d.id === dateId)) scrollToDay(dateId, Math.max(range.start, hour - 1), "instant");
  updateActiveChip();

  setInterval(updateNow, 60 * 1000);
})();
