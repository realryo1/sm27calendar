(() => {
  const { site, range, days, updatedAt } = window.TT_DATA;
  // sessions を持つ予定は、共通項目に公演ごとの項目を重ねて、公演ごとの予定に展開する
  const events = window.TT_DATA.events.flatMap(({ sessions, ...common }) => (sessions ? sessions.map((s) => ({ ...common, ...s })) : [common]));
  // データ中の文字列に "\n" を入れると改行（<br>）になる。本文は br（エスケープ＋改行）、属性は esc を使う
  const nl = (s) => String(s).replace(/\n/g, "<br>");
  const nlAll = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, nl(v)]));
  const B = nlAll(site.badges);
  const L = nlAll(site.labels);
  const TR = nlAll(site.train);
  // 会場は各イベントの会場フィールドから重複を除いて集め、letter 順に並べる
  const venues = [...new Map(events.map((e) => [e.letter, e])).values()].sort((x, y) => x.letter.localeCompare(y.letter));

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

  // エスケープ後に、許可タグ（<strong> と <br>）だけ復活させる
  const br = (s) =>
    nl(esc(s)).replace(/&lt;(\/?strong|br\s*\/?)&gt;/gi, "<$1>");

  const badge = (cls, text) => `<span class="badge badge--${cls}">${text}</span>`;
  const badges = (ev) =>
    (ev.official ? badge("official", B.official) : badge("fan", B.fan)) +
    (ev.tentative === true ? badge("tentative", B.tentative) : "");

  // 会場見出し名（表の列見出しと下のカードで共通）。括弧書きは小さく表示
  // 見出しの会場名の幅の目安（全角=1、半角=0.6）。狭い見出しで改行せず収まる文字サイズを CSS で出すのに使う
  const nameWidth = (v) => [...(v.short ?? v.name)].reduce((w, c) => w + (c.charCodeAt(0) < 256 ? 0.6 : 1), 0).toFixed(1);
  const headName = (v) => br(v.short ?? v.name).replace(/（(.+?)）/, "<small>（$1）</small>");

  // 仮の時刻は取り消し線で示す（tentative: true＝すべて仮、"end"＝終演のみ仮）
  // 表示する時刻は先頭の0を省く（07:00 → 7:00）。データは "HH:MM" のまま
  const hm = (t) => t.replace(/^0/, "");
  const tbd = (t) => `<s class="tbd">${hm(t)}</s>`;
  const fmtTime = (e, which) => (e.tentative === true || (e.tentative === "end" && which === "end") ? tbd(e[which]) : hm(e[which]));

  const timeText = (ev) => (ev.allDay ? L.allDayUnannounced : `${hm(ev.start)} – ${hm(ev.end)}`);

  const nowJST = () => {
    const now = new Date();
    const dateId = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const [h, m] = now
      .toLocaleTimeString("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })
      .split(":")
      .map(Number);
    return { dateId, hour: h + m / 60 };
  };

  // 行構成: 1行目=会場見出し、以降は日ごとに [日付帯, カレンダー本体]
  // 行の並び：1日目の日付帯 → 会場見出し（2行目・style.css） → 1日目の本体 → 2日目の日付帯 → 2日目の本体 …（日付帯が会場見出しの上に来る）
  const dayRow = (i) => (i === 0 ? 1 : 2 + i * 2);
  const bodyRow = (i) => 3 + i * 2;

  // index.html の枠に、固定の文言を流し込む
  function renderStatic() {
    const set = (id, html) => (document.getElementById(id).innerHTML = html);
    set("siteTitle", `<span class="day-nav__brand">${br(site.name)}</span> <span class="day-nav__sub">${br(site.subtitle)}</span>`);
    set("trainChip", `<span class="day-chip__label">${TR.chip}</span><span class="day-chip__week">${TR.chipEn}</span>`);
    set("boardHint", br(site.boardHint));
    set("venuesTitle", br(site.venuesTitle));
    set("disclaimer", br(site.disclaimer));
    const $repo = document.getElementById("repoLink");
    $repo.href = site.repo.url;
    $repo.innerHTML = `${br(site.repo.label)} ↗`;
    set("toBoard", br(site.toBoard));
    const mark = {
      open: '<span class="legend__open"></span>',
      wait: '<span class="legend__wait"></span>',
    };
    set(
      "legend",
      site.legend
        .map(({ mark: m, text }) => `<li>${mark[m] ?? badge(m.startsWith("tentative") ? "tentative" : m, B[m])}${br(text)}</li>`)
        .join("")
    );
  }

  function renderNav() {
    $dayNav.innerHTML = days
      .map(
        (d) => `<button class="day-chip" data-day="${d.id}">
          <span class="day-chip__date notranslate" translate="no">${d.label}</span><span class="day-chip__week">${d.week}</span>
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
          <span class="tt-axis__h notranslate" translate="no">${h}</span><span class="tt-axis__m notranslate" translate="no">00</span>
        </div>${
          i < hours.length - 1
            ? `<div class="tt-axis__half" style="top:${pos(h + 0.5)}"><span class="tt-axis__m notranslate" translate="no">30</span></div>`
            : ""
        }`
      )
      .join("")}</div>`;

    const heads = venues
      .map(
        (v) => `<div class="tt-head-cell"><div class="tt-head theme-${v.theme}">
          <span class="tt-head__letter">${v.letter}</span>
          <span class="tt-head__name" style="--nl:${nameWidth(v)}" title="${esc(v.name)}">${headName(v)}</span>
          <span class="tt-head__kind tt-head__kind--${v.fan ? "fan" : "official"}">${v.fan ? B.fan : B.official}</span>
        </div></div>`
      )
      .join("");

    const sections = days
      .map((d, i) => {
        const dayEvents = events.filter((e) => e.days.includes(d.id));
        const cols = venues
          .map((v) => {
            const blocks = dayEvents
              .filter((e) => e.letter === v.letter)
              .map((e) => renderEvent(e))
              .join("");
            return `<div class="tt-col theme-${v.theme}${v.fan ? " tt-fan" : ""}${i > 0 ? " tt-col--round" : ""}" style="grid-row:${bodyRow(i)}">${blocks}</div>`;
          })
          .join("");
        // 1日目の帯は一番上に貼り付く「現在の日付」（スクロールに合わせて updateActiveChip が書き換える）。2日目以降は日の境目に置く普通の帯
        const band =
          i === 0
            ? `<div class="tt-day tt-day--top" style="grid-row:${dayRow(i)}">${dayBand(d)}${refreshBtn}</div>`
            : `<div class="tt-day" style="grid-row:${dayRow(i)}">${dayBand(d)}</div>`;
        return `${band}${axis(bodyRow(i))}${cols}`;
      })
      .join("");

    $tt.style.setProperty("--cols", venues.length);
    $tt.style.gridTemplateRows = `var(--divider) var(--head) calc(${range.end - range.start} * var(--hour)) repeat(${days.length - 1}, var(--divider) calc(${range.end - range.start} * var(--hour)))`;
    $tt.innerHTML = `<div class="tt-corner"></div>${heads}${sections}<div class="tt-now" hidden></div>`;

    renderVenues();
    updateNow();
  }

  const dayBand = (d) => `<span class="tt-day__label">
      <span class="tt-day__date notranslate" translate="no">${d.label}</span>
      <span class="tt-day__week">${d.week}</span>
      <span class="tt-day__ja">（${d.weekJa}）</span>
      <span class="tt-day__sub">${br(site.subtitle)}</span>
    </span>`;

  // 右端の更新ボタン：ページと画像のキャッシュを消して読み込み直す
  const refreshBtn = `<button type="button" class="tt-refresh" data-refresh aria-label="キャッシュを消して更新">更新</button>`;

  let toastTimer;
  function toast(msg, ms = 6000) {
    let $t = document.querySelector(".toast");
    if (!$t) {
      $t = document.createElement("div");
      $t.className = "toast";
      $t.setAttribute("role", "status");
      document.body.append($t);
    }
    $t.textContent = msg;
    $t.hidden = false;
    // 更新ボタンの真下に、ボタンを指す吹き出しとして出す
    const r = document.querySelector("[data-refresh]")?.getBoundingClientRect();
    if (r) {
      $t.style.top = `${r.bottom + 12}px`;
      $t.style.right = `${Math.max(8, innerWidth - r.right)}px`;
      $t.style.setProperty("--tail", `${Math.max(12, r.width / 2 - 6)}px`);
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($t.hidden = true), ms);
  }

  let refreshing = false;
  async function hardRefresh() {
    if (refreshing) return;
    if (!navigator.onLine) return toast("オフラインのため更新できませんでした");
    refreshing = true;
    document.body.classList.add("is-refreshing");
    toast("更新中です。オフラインや回線が遅いと表示に時間がかかるかもしれません", 30000);
    try {
      // 先に最新を取得できるか確かめる（失敗したら今のキャッシュは消さない＝オフラインで真っ白にならない）
      // 取得対象は precache.js の一覧（確実に全ファイル）＋ 読み込み済みの同一オリジンのリソース
      const urls = [
        location.href,
        ...(self.PRECACHE || []).map((u) => new URL(u, location.href).href),
        ...performance.getEntriesByType("resource").map((r) => r.name),
      ].filter((u) => new URL(u).origin === location.origin);
      const res = await Promise.all([...new Set(urls)].map((u) => fetch(u, { cache: "reload" })));
      if (res.some((r) => !r.ok)) throw new Error("fetch failed");
      if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
      if ("serviceWorker" in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
      try {
        localStorage.removeItem("sm27-install-dismissed");
      } catch {}
      location.reload();
    } catch {
      refreshing = false;
      document.body.classList.remove("is-refreshing");
      toast(navigator.onLine ? "更新できませんでした。通信状況を確認してもう一度お試しください" : "オフラインのため更新できませんでした");
    }
  }

  function renderEvent(e) {
    if (e.allDay) {
      return `<button class="ev ev--allday${e.official ? "" : " ev--fan"}" data-ev="${e.id}">
        <span class="ev__inner">
          <span class="ev__meta">
            <span class="ev__time">${timeText(e)}</span>
            <span class="ev__badges">${badges(e)}</span>
          </span>
          <span class="ev__title">${e.official ? "" : `<span class="ev__fan-label">${B.fan}</span>`}${br(e.title)}</span>
        </span>
      </button>`;
    }
    const start = toHour(e.start);
    const end = toHour(e.end);
    const top = e.open ? toHour(e.open) : start;
    const openPart = e.open
      ? `<span class="ev__open" style="height:${span(top, start)}">OPEN ${fmtTime(e, "open")}</span>`
      : "";
    const waitPart = e.wait
      ? `<div class="ev-wait" data-wait="${e.id}" role="button" tabindex="0" style="top:${pos(toHour(e.wait.start))};height:calc(${span(toHour(e.wait.start), top)} + 10px)">
          <span class="ev-wait__label">${e.wait.label}</span>
        </div>`
      : "";
    const lastEntry = e.lastEntry
      ? `<span class="ev__last" style="top:${span(top, toHour(e.lastEntry))}"><span class="ev__last-label">${L.lastEntry} ${hm(e.lastEntry)}</span></span>`
      : "";
    const marks = (e.marks ?? [])
      .map(
        (m) => `<div class="ev-mark" data-wait="${e.id}" style="top:${pos(toHour(m.time))}" title="${esc(m.detail)}">
          <span class="ev-mark__label">${br(m.label)} ${hm(m.time)}</span>
        </div>`
      )
      .join("");
    return `${waitPart}${marks}<button class="ev${e.official ? "" : " ev--fan"}${e.tentative === "end" ? " ev--tentative-end" : e.tentative ? " ev--tentative" : ""}" data-ev="${e.id}"
        style="top:${pos(top)};height:${span(top, end)}">
      ${openPart}
      <span class="ev__inner">
        <span class="ev__meta">
          <span class="ev__time">${e.live ? `${fmtTime(e, "start")} ▶ ${fmtTime(e, "end")}` : `START ${fmtTime(e, "start")}`}</span>
          <span class="ev__badges">${badges(e)}</span>
        </span>
        <span class="ev__title">${e.official ? "" : `<span class="ev__fan-label">${B.fan}</span>`}${br(e.title)}</span>
        ${e.sub ? `<span class="ev__sub">${br(e.sub)}</span>` : ""}
      </span>
      ${lastEntry}
    </button>`;
  }

  // 同じ内容で日付だけ違うイベント（LIVE の各日公演など）は1件にまとめて表示する
  const groupKey = (e) => [e.letter, e.title, e.sub, e.open, e.start, e.end].join("|");
  const dayLabel = (id) => {
    const d = days.find((x) => x.id === id);
    return d ? `${d.label}<small>(${d.weekJa})</small>` : id;
  };

  function renderVenues() {
    $venueList.innerHTML = venues
      .map((v, vi) => {
        // 非公式の会場が並び始める所に、非公式イベントの表題を置く
        const fanTitle = v.fan && !venues[vi - 1]?.fan ? `<h2 class="section-title venue-list__title">${br(site.fanTitle)}</h2>` : "";
        const groups = [];
        events
          .filter((e) => e.letter === v.letter)
          .forEach((e) => {
            const g = groups.find((x) => x.key === groupKey(e));
            if (g) {
              g.ids.push(e.id);
              g.days.push(...e.days);
            } else groups.push({ key: groupKey(e), ids: [e.id], days: [...e.days], e });
          });
        const live = events.some((e) => e.letter === v.letter && e.live);
        // 予定が1件だけの会場（在線予測なし）は、枠で分けずにカードへ直接載せる
        const single = groups.length === 1 && !live ? groups[0] : null;
        const place = `<dt>${L.place}</dt><dd>${v.short ? `${br(v.name)}<br>` : ""}${br(v.address)}</dd>
            <dt>${L.station}</dt><dd>${br(v.station)}</dd>`;
        const liveEv = live ? groups[0].e : null;
        // 複数公演が並ぶカード：イベント名が共通なら見出しに出し、日付が共通なら見出しの下に1行で出す（各枠はシンプルに）
        const multi = !live && !single && groups.length > 1;
        const commonTitle = multi && groups.every((g) => g.e.title === groups[0].e.title) ? groups[0].e.title : "";
        const dayText = (g) => [...new Set(g.days)].sort().map(dayLabel).join(" ・ ");
        // 1件だけでも、イベント名が会場の見出しと違うとき（メインイベントなど）は、見出しをイベント名にして会場名を小さく添える
        const singleTitle = single && single.e.title !== (v.short ?? v.name) ? single.e.title : "";
        const cardTitle = (commonTitle || singleTitle).replace(/\n/g, " ");
        const commonDays = multi && groups.every((g) => dayText(g) === dayText(groups[0])) ? dayText(groups[0]) : "";
        // 値段は「最寄り」の下に並べる。複数公演のカードでは、全公演で同じときだけカードに出す
        const commonPrice = multi && groups.every((g) => JSON.stringify(g.e.price) === JSON.stringify(groups[0].e.price)) ? groups[0].e.price : undefined;
        // note も全公演で同じならカードに1回だけ出し、各枠には出さない
        const commonNote = multi && groups.every((g) => g.e.note === groups[0].e.note) ? groups[0].e.note : "";
        // リンクも全公演で同じならカードの末尾に1回だけ出す
        const commonLinks = multi && groups.every((g) => JSON.stringify(g.e.links) === JSON.stringify(groups[0].e.links)) ? groups[0].e.links ?? [] : [];
        const priceRows = priceRow(single ? single.e.price : commonPrice);
        const list = liveEv
          ? renderLiveHead(liveEv)
          : single
          ? renderVenueEventBody(single.e, single.days, place + priceRows, { simple: true })
          : `${commonDays ? `<p class="vc-days">${commonDays}</p>` : ""}<dl class="venue-card__info">${place}${priceRows}</dl>${noteBlocks(commonNote)}
            <ul class="vc-events">${groups.map(({ ids, days: ds, e }) => renderVenueEvent(e, ids, ds, { simple: true, commonTitle, commonDays, hideNote: !!commonNote, hideLinks: commonLinks.length > 0 })).join("")}</ul>${commonLinks.length ? linkButtons(commonLinks) : ""}`;
        const flat = single ?? (live ? groups[0] : null);
        return `${fanTitle}<article class="venue-card theme-${v.theme}${v.fan ? " venue-card--fan" : ""}${live ? " venue-card--wide venue-card--live" : ""}${single ? " venue-card--single" : ""}" id="venue-${v.letter}"${
          flat ? ` data-ids="${flat.ids.join(" ")}"` : ""
        }>
          <h3 class="venue-card__name"><span class="venue-card__letter">${v.letter}</span>${v.fan ? `${badge("fan", B.fan)} ` : ""}${cardTitle ? `${br(cardTitle)}<small class="venue-card__area">${br(v.name)}</small>` : `${headName(v)}<small class="venue-card__area">${br(v.area)}</small>`}</h3>
          ${list}
          ${
            live
              ? `<div class="train-live" id="train-live">
                  <div id="trainLive"></div>
                </div>`
              : ""
          }
        </article>`;
      })
      .join("");
  }

  // 注記。改行（\n と <br>）ごとに別の段落（左線つき）に分けて描画する
  const noteBlocks = (note) =>
    String(note ?? "")
      .split(/\n|<br\s*\/?>/i)
      .filter((t) => t.trim())
      .map((t) => `<p class="vc-ev__note">${br(t)}</p>`)
      .join("");

  // リンクのボタン列（links は { label, url } の配列）
  const linkButtons = (links) =>
    `<div class="vc-ev__links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${br(l.label)} ↗</a>`).join("")}</div>`;

  // 値段の行（price は文字列、または複数行の配列）
  const priceRow = (price) =>
    price ? `<dt>${L.price}</dt><dd>${[].concat(price).map(br).join("<br>")}</dd>` : "";

  // 雪ミク電車：運行期間・時間・注記・リンクだけを見出しの下に置く（在線予測はその下）
  function renderLiveHead(e) {
    const links = e.links ?? [];
    return `<p class="vc-live__period">${br(e.period)}</p>
      <p class="vc-live__time">${hm(e.start)} – ${hm(e.end)}</p>
      ${e.price ? `<dl class="venue-card__info vc-live__info">${priceRow(e.price)}</dl>` : ""}
      ${noteBlocks(e.note)}
      ${linkButtons(links)}`;
  }

  function renderVenueEvent(e, ids, ds, opts) {
    return `<li class="vc-ev" id="ev-${ids[0]}" data-ids="${ids.join(" ")}">${renderVenueEventBody(e, ds, undefined, opts)}</li>`;
  }

  // place を渡すと会場カードに直接載せる形（タイトルは見出しと重複するので省き、時間の下に場所・最寄りを並べる）
  // opts.simple: 複数公演カードの枠（バッジなし・日付とイベント名は共通なら省く・終演は出さない）
  function renderVenueEventBody(e, ds, place, opts = {}) {
    const links = e.links ?? [];
    const times = [
      e.open && [L.open, fmtTime(e, "open")],
      [
        e.open ? L.startWithOpen : L.startOnly,
        e.allDay ? L.unannounced : opts.simple && e.tentative ? `${fmtTime(e, "start")} 〜` : `${fmtTime(e, "start")} – ${fmtTime(e, "end")}`,
      ],
      e.lastEntry && [L.lastEntry, hm(e.lastEntry)],
    ].filter(Boolean);
    const wait = e.wait
      ? `<details class="vc-wait" id="wait-${e.id}">
          <summary>${e.wait.summary}</summary>
          <div class="vc-wait__body">
            ${
              e.wait.image
                ? `<a class="vc-image" href="${esc(e.wait.source ?? e.wait.image)}" target="_blank" rel="noopener">
                    <img src="${esc(e.wait.image)}" alt="${esc(e.wait.imageAlt)}"${e.wait.imageSize ? ` width="${e.wait.imageSize[0]}" height="${e.wait.imageSize[1]}"` : ""} loading="lazy" decoding="async">
                  </a>`
                : ""
            }
            ${(e.marks ?? [])
              .map((m) => `<p class="vc-wait__mark"><span class="ev-mark__label">${br(m.label)} ${hm(m.time)}</span>${br(m.detail)}</p>`)
              .join("")}
            ${noteBlocks(e.wait.imageNote)}
          </div>
        </details>`
      : "";
    const head = opts.simple
      ? opts.commonDays
        ? ""
        : `<div class="vc-ev__head"><span class="vc-ev__days">${[...new Set(ds)].sort().map(dayLabel).join(" ・ ")}</span></div>`
      : `<div class="vc-ev__head">
        <span class="vc-ev__days">${[...new Set(ds)].sort().map(dayLabel).join(" ・ ")}</span>
        <span class="ev__badges">${badges(e)}</span>
      </div>`;
    const title = opts.commonTitle ? br(e.sub ?? "") : `${br(e.title)}${e.sub ? ` <small>${br(e.sub)}</small>` : ""}`;
    return `
      ${head}
      ${
        place
          ? `<dl class="venue-card__info vc-single__info">${times.map(([k, val]) => `<dt>${k}</dt><dd${val === L.unannounced ? "" : ' class="vc-time"'}>${val}</dd>`).join("")}${place}</dl>`
          : `<p class="vc-ev__title">${title}</p>
      <dl class="vc-ev__times">${times.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join("")}</dl>`
      }
      ${opts.hideNote ? "" : noteBlocks(e.note)}
      ${noteBlocks(e.lead)}
      ${wait}
      ${opts.hideLinks ? "" : linkButtons(links)}`;
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

  // 日付ボタンで選んだ日は、ユーザーが自分でスクロールするまで選択状態を保つ
  // （縮小時など、最後の日の先頭まで届かず下端で止まる場合でも選んだ日を表示する）
  let pinnedDay = null;
  function updateActiveChip() {
    const y = $scroll.scrollTop + stickyOffset() + 1;
    const axes = [...$tt.querySelectorAll(".tt-axis")];
    let active = 0;
    axes.forEach((a, i) => {
      if (a.offsetTop - $tt.querySelector(".tt-day").offsetHeight <= y) active = i;
    });
    // 下端まで来ていれば最後の日
    if ($scroll.scrollTop + $scroll.clientHeight >= $scroll.scrollHeight - 2) active = axes.length - 1;
    if (pinnedDay != null) active = pinnedDay;
    $dayNav.querySelectorAll(".day-chip").forEach((c, i) => c.classList.toggle("is-active", i === active));
    // 一番上に貼り付いている日付帯を、今見ている日に合わせる
    const $top = $tt.querySelector(".tt-day--top");
    if ($top.dataset.day !== String(active)) {
      $top.dataset.day = String(active);
      $top.innerHTML = dayBand(days[active]) + refreshBtn;
    }
  }

  $dayNav.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-day]");
    if (!btn) return;
    pinnedDay = days.findIndex((d) => d.id === btn.dataset.day);
    scrollToDay(btn.dataset.day);
    updateActiveChip();
  });
  const unpin = () => (pinnedDay = null);
  ["touchstart", "wheel", "keydown", "pointerdown"].forEach((t) => $scroll.addEventListener(t, unpin, { passive: true }));

  $scroll.addEventListener("scroll", () => requestAnimationFrame(updateActiveChip), { passive: true });

  $tt.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-refresh]")) return hardRefresh();
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

  // ---------- 拡大縮小（縦ピンチ＝時間方向、横ピンチ＝会場列の幅。リロードで元に戻る） ----------
  const ZOOM = { hour: [28, 220], col: [72, 420] };
  const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
  // スマホで開いたときは、会場列の幅も1時間の高さも、最小の縮小から始める
  // （横スクロールを減らし、1日の流れと会場を一目で見渡せるように）
  if (matchMedia("(max-width: 640px)").matches) {
    $tt.style.setProperty("--colmin", `${ZOOM.col[0]}px`);
    $tt.style.setProperty("--hour", `${ZOOM.hour[0]}px`);
  }
  const cssPx = (name) => parseFloat(getComputedStyle($tt).getPropertyValue(name));
  const colWidth = () => $tt.querySelector(".tt-col").getBoundingClientRect().width;
  const hourPx = () => cssPx("--hour");

  // 縮小時は予定ブロックの表示を簡略化する
  const updateDensity = () => {
    const h = hourPx();
    $tt.dataset.density = h < 44 ? "tight" : h < 60 ? "compact" : "";
    fitEvents();
  };

  // 予定カードの内容（OPEN 帯＋文字）が高さに収まらないとき、バッジ→サブタイトル→時刻→OPEN の文字の順に隠し、最後はタイトルだけにする。
  // OPEN の文字を消すと帯は背景に回り、タイトルが上に詰まる。
  // 文字の大きさがカードの高さに比例するため、境目で出たり消えたりしないよう、一度隠したものを戻すには余裕（SLACK）を要求する
  const HIDE = ["ev--nobadge", "ev--nosub", "ev--notime", "ev--noopentext"];
  const SLACK = 10;
  // 1枚ずつ「隠す→測る」を繰り返すとカードの数だけレイアウトの再計算が起きるので、
  // 全カードまとめて隠してからまとめて測る（段階ごとに再計算1回）
  const fitEvents = () => {
    const items = [...$tt.querySelectorAll(".ev:not(.ev--allday)")]
      .map((ev) => ({ ev, inner: ev.querySelector(".ev__inner"), open: ev.querySelector(".ev__open"), prev: Number(ev.dataset.fit ?? 0) }))
      .filter((it) => it.inner);
    const apply = (it, level, noOpenText) => HIDE.forEach((c, i) => it.ev.classList.toggle(c, i < level || (i === 3 && noOpenText)));
    // OPEN の帯が文字より低いときは、最初から文字を消す
    items.forEach((it) => apply(it, 0, false));
    items.forEach((it) => (it.tiny = !!it.open && it.open.offsetHeight < parseFloat(getComputedStyle(it.open).fontSize) * 1.6));
    let pending = items;
    for (let level = 0; level < HIDE.length && pending.length; level++) {
      pending.forEach((it) => apply(it, level, it.tiny));
      pending = pending.filter((it) => {
        const openH = it.ev.classList.contains("ev--noopentext") ? 0 : it.open?.offsetHeight ?? 0;
        if (openH + it.inner.offsetHeight > it.ev.clientHeight - (level < it.prev ? SLACK : 0)) return true;
        it.level = level;
        return false;
      });
    }
    pending.forEach((it) => {
      apply(it, HIDE.length, it.tiny);
      it.level = HIDE.length;
    });
    items.forEach((it) => (it.ev.dataset.fit = it.level));
  };

  // 拡大率 ky（縦）/ kx（横）を、開始時の大きさ base に掛けて適用。
  // anchor（スクロール領域内の座標）の下にある内容が動かないようにスクロール位置を補正する
  function applyZoom(base, kx, ky, anchor) {
    const rect = $scroll.getBoundingClientRect();
    const ax = anchor.x - rect.left;
    const ay = anchor.y - rect.top;
    // 1時間の高さは偶数のpxに丸める（正時・30分の横線が小数pxにかかってにじみ、太さがそろわなくなるため）
    const hour = Math.round(clamp(base.hour * ky, ZOOM.hour) / 2) * 2;
    const col = clamp(base.col * kx, ZOOM.col);
    $tt.style.setProperty("--hour", `${hour}px`);
    $tt.style.setProperty("--colmin", `${col.toFixed(1)}px`);
    const ry = hour / base.hour;
    const rx = colWidth() / base.colW;
    $scroll.scrollTop = (base.top + ay) * ry - ay;
    $scroll.scrollLeft = (base.left + ax) * rx - ax;
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
    updateActiveChip();
  };
  $scroll.addEventListener("touchend", endPinch);
  $scroll.addEventListener("touchcancel", endPinch);
  // iOS Safari のページ全体のピンチズームを抑止
  $scroll.addEventListener("gesturestart", (ev) => ev.preventDefault());

  // PC: Ctrl+ホイール（トラックパッドのピンチ）で縦、Ctrl+Shift+ホイールで横
  // マウスのホイールは1目盛りが大きい（deltaY ≒ 100）ので、トラックパッドより係数を小さくして1目盛り≒1.1倍にする。
  // 1時間の高さは偶数pxに丸めるため、小さな変化が丸めで消えないよう、縦の目標値は小数のまま持ち回す
  let wheelHour = null;
  $scroll.addEventListener(
    "wheel",
    (ev) => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      const delta = ev.deltaY || ev.deltaX;
      const notch = ev.deltaMode === 1 || Math.abs(delta) >= 40;
      const k = Math.exp(-delta * (notch ? 0.001 : 0.01));
      const base = zoomBase();
      let kx = 1;
      let ky = 1;
      if (ev.shiftKey) kx = k;
      else {
        if (wheelHour == null || Math.abs(wheelHour - base.hour) > 2) wheelHour = base.hour; // 他の操作で変わっていたら現在値から
        wheelHour = clamp(wheelHour * k, ZOOM.hour);
        ky = wheelHour / base.hour;
      }
      applyZoom(base, kx, ky, { x: ev.clientX, y: ev.clientY });
    },
    { passive: false }
  );


  // 最終更新日時（例: 2026年10月22日 4:54）
  if (updatedAt) {
    const [, y, mo, d, h, mi] = updatedAt.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+)/).map(Number);
    document.getElementById("updatedAt").innerHTML =
      `${site.updatedPrefix}<time datetime="${updatedAt.replace(" ", "T")}+09:00">${y}年${mo}月${d}日 ${h}:${String(mi).padStart(2, "0")}</time>`;
  }

  renderStatic();
  renderNav();
  renderBoard();
  updateDensity();
  window.addEventListener("resize", fitEvents);
  // Webフォント読み込みで文字の大きさが変わるため（フォントの CSS は後から非同期で読み込むので、読み込み完了のたびに測り直す）
  document.fonts?.ready.then(fitEvents);
  document.fonts?.addEventListener?.("loadingdone", fitEvents);

  // URL の #日付、またはイベント当日なら現在時刻付近を初期表示
  const hashId = location.hash.slice(1);
  const { dateId, hour } = nowJST();
  if (days.some((d) => d.id === hashId)) scrollToDay(hashId, null, "instant");
  else if (days.some((d) => d.id === dateId)) scrollToDay(dateId, Math.max(range.start, hour - 1), "instant");
  updateActiveChip();

  setInterval(updateNow, 60 * 1000);

  // 起動時に一度だけ data.js の最終更新日時を確かめ、新しい情報があれば読み込み直す
  // （sessionStorage の印で、取得できなかった場合などに読み込み直しを繰り返さないようにする）
  (async () => {
    if (!navigator.onLine) return;
    try {
      if (sessionStorage.getItem("sm27-update-checked") === "1") return;
      sessionStorage.setItem("sm27-update-checked", "1");
      const res = await fetch("data.js", { cache: "no-cache" });
      if (!res.ok) return;
      const latest = (await res.text()).match(/updatedAt:\s*"([^"]+)"/)?.[1];
      if (latest && latest !== updatedAt) location.reload();
    } catch {}
  })();
})();
