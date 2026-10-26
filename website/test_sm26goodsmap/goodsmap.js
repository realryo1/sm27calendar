// グッズ・出展ブースマップ（試験ページ）
// データは data-○○○○.js の window.GM_DATA（年ごとに差し替える）。ここは年に関係なく使う。
// 会場マップは公式の画像を使わず、データのブース・売り場の位置から SVG で描く
(() => {
  const D = window.GM_DATA;
  if (!D) return;
  const E = D.event;

  // 画面の文言（年に関係しないもの）。日付・会場・注意書きなど、年ごとに変わるものはデータ側
  const TEXT = {
    title: "出展ブースマップ",
    nav: [
      { href: "#map", label: "会場マップ" },
      { href: "#booths", label: "出展ブース" },
      { href: "../", label: "カレンダーへ" },
    ],
    lastEntry: "最終入場",
    mapTitle: "会場マップ",
    listTitle: "出展ブース",
    mapNote: "公式の会場マップをもとに描いた略図です。",
    mapHint: "左右にスクロール、二本指で拡大縮小",
    officialMap: "公式の会場マップ（画像）",
    pickHint: "ブースや売り場を押すと、売っているものが出ます",
    toCard: "一覧で詳しく",
    toMap: "▲ マップへ",
    search: "商品名・会社名でさがす",
    filter: "種類でしぼる",
    all: "すべて",
    // カードの中の見出しと、しぼり込みのボタン
    kinds: { sale: "販売", exhibit: "展示・体験", gift: "配布・特典" },
    legend: { sale: "販売あり", exhibit: "展示・体験だけ", gift: "配布・特典だけ", official: "公式物販", show: "主催展示" },
    noPrice: "価格未掲載",
    notSold: "会場では販売なし",
    soldAt: (where) => `${where}で販売`,
    also: (where) => `${where}でも`,
    more: (n) => `ほか${n}件`,
    count: (n, total) => (n === total ? `全${total}ブース` : `${total}ブース中${n}ブース`),
    empty: "見つかりませんでした。ほかのことばでさがしてみてください。",
    officialLead: "公式グッズの売り場です。商品の写真や詳しい説明は、公式のグッズ一覧で見られます。",
    officialLink: "公式のグッズ一覧",
    officialCount: (n) => `${n}点`,
    loose: "売り場の記載がないグッズ",
    looseLead: "公式のグッズ一覧ではウイングベイで扱うとあるものの、売り場が書かれていません。",
    zoom: { out: ["－", "縮小"], fit: ["全体", "全体を表示"], in: ["＋", "拡大"] },
    boothName: (no) => `ブース${no}`,
    showOnMap: (name) => `${name}をマップで見る`,
    updated: (date) => `データ：${date}時点の公式サイト`,
    disclaimer:
      "本ページは非公式の試験版です。\nこのページの問い合わせはx.com/realryo1にお願いします。\n情報の正確性には留意していますが、最終的な判断は利用者が行ってください。\n商品の写真は、品名のリンクから公式サイトで見られます。",
    sources: "出典",
    calendar: "非公式カレンダーへ戻る",
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const br = (s) => esc(s).replace(/\n/g, "<br>");
  const yen = (n) => `¥${n.toLocaleString("ja-JP")}`;
  const r1 = (n) => Math.round(n * 10) / 10;
  // 品名の先頭の「SNOW MIKU 2026」は、このページではほとんどに付くので表示では省く（検索は元の名前で）
  const short = (name) => name.replace(/^「?SNOW MIKU \d{4}」?\s*/, "");
  // 会社名の「株式会社」などを省いた短い名前（マップの説明欄で会社を並べるとき）
  const corp = (name) => name.replace(/(株式会社|有限会社|合同会社)\s?/g, "");
  // 検索用：全角半角・大文字小文字・カタカナとひらがなの違いと、空白・中黒を無視する
  const norm = (s) =>
    String(s)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s・]/g, "");
  const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  // 2カラム（左にマップを固定）にする幅。goodsmap.css と合わせる
  const twoCol = matchMedia("(min-width: 960px)");

  // ---------- データの整理 ----------
  const booths = D.booths;
  const boothBy = new Map(booths.map((b) => [b.no, b]));
  // グッズはウイングベイの売り場ごとに分ける：ブース／公式物販／売り場の記載なし（ウイングベイで売らないものは出さない）
  const goodsAt = new Map();
  const official = [];
  const loose = [];
  for (const g of D.goods) {
    if (g.booth) goodsAt.set(g.booth, [...(goodsAt.get(g.booth) ?? []), g]);
    else if (g.floor === "公式物販") official.push(g);
    else if (g.places.includes("wingbay")) loose.push(g);
  }
  const onSale = (g) => g.places.includes("wingbay");
  // 中にブースがある売り場（ガチャコーナー）。ブース → 売り場
  const spotOf = new Map(Object.entries(D.spots).flatMap(([id, s]) => (s.booths ?? []).map((no) => [no, id])));
  const officialTitle = D.spots.official?.title ?? "公式物販";

  // ブースの種類と色。マップとカードの色は先頭のもの（販売＞展示・体験＞配布・特典）
  const THEME = { sale: "pink", exhibit: "violet", gift: "orange" };
  const info = new Map(
    booths.map((b) => {
      const gs = goodsAt.get(b.no) ?? [];
      const kinds = [
        (gs.some(onSale) || b.more?.length) && "sale",
        (gs.some((g) => !onSale(g)) || b.shows?.length) && "exhibit",
        b.gifts?.length && "gift",
      ].filter(Boolean);
      const words = [b.name, b.org, b.label, ...gs.flatMap((g) => [g.name, g.maker]), ...(b.more ?? []), ...(b.shows ?? []), ...(b.gifts ?? []), ...(b.notes ?? [])];
      return [b.no, { kinds, theme: THEME[kinds[0] ?? "sale"], text: norm(words.filter(Boolean).join("|")) }];
    })
  );
  const boothLabel = (b) => b.label ?? b.no;
  const boothName = (b) => (b.label ? b.label : TEXT.boothName(b.no));

  // 書き写しの確認（27年のデータを作るときに、ブースの割り当て漏れ・重複・マップとのずれに気づけるように）。画面には出さない
  {
    const warn = (msg) => console.warn(`[goodsmap] ${msg}`);
    const ids = new Set();
    for (const g of D.goods) {
      if (ids.has(g.id)) warn(`グッズの id が重複: ${g.id}`);
      ids.add(g.id);
      if (g.booth && !boothBy.has(g.booth)) warn(`グッズのブースが一覧に無い: ${g.id} → ${g.booth}`);
      if (!g.booth && onSale(g) && g.floor && g.floor !== "公式物販") warn(`売り場が「${g.floor}」なのにブースが無い: ${g.id}`);
    }
    const onMap = new Set(D.floors.flatMap((f) => [...Object.keys(f.booths), ...f.areas.flatMap((a) => D.spots[a.spot]?.booths ?? [])]));
    for (const b of booths) if (!onMap.has(b.no)) warn(`マップに無いブース: ${b.no}`);
    for (const no of onMap) if (!boothBy.has(no)) warn(`一覧に無いブースがマップにある: ${no}`);
  }

  // ---------- 部品 ----------
  const theme = (kind) => `theme-${THEME[kind]}`;
  const pill = (text, mod = "") => `<span class="gm-also${mod}">${esc(text)}</span>`;
  const placeName = (p) => D.places[p] ?? p;
  const priceOf = (g) => (g.price == null ? "" : `<span class="gm-price">${g.unit ? `<small>${esc(g.unit)}</small>` : ""}${yen(g.price)}</span>`);
  const linkList = (links = []) =>
    links.length ? `<div class="gm-links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div>` : "";
  const itemText = (g) => norm(`${g.name}|${g.maker}`);

  // 品の1行：左に品名と札（折り返す）、右に値段
  const itemRow = (text, body, price = "", mod = "") =>
    `<li class="gm-item${mod}" data-text="${esc(text)}"><span class="gm-item__body">${body}</span>${price}</li>`;
  const goodsLink = (g) => `<a class="gm-item__name" href="${esc(g.url)}" target="_blank" rel="noopener">${esc(short(g.name))}</a>`;
  const notePill = (g) => (g.note ? pill(g.note, " gm-also--note") : "");
  // ウイングベイで売るグッズ。品名は公式の商品ページ（写真あり）へのリンク。ほかの売り場でも買えるものは札を付ける
  const goodsRow = (g) =>
    itemRow(itemText(g), goodsLink(g) + g.places.filter((p) => p !== "wingbay").map((p) => pill(TEXT.also(placeName(p)))).join("") + notePill(g), priceOf(g));
  // ブースで展示だけするグッズ（ウイングベイでは売らない）
  const showRow = (g) =>
    itemRow(itemText(g), goodsLink(g) + pill(g.places.length ? TEXT.soldAt(g.places.map(placeName).join("・")) : TEXT.notSold, " gm-also--no") + notePill(g), priceOf(g));
  // ブースの紹介にだけある品・展示・配布（値段は公式に無い）
  const textRow = (t, note) =>
    itemRow(norm(t), `<span class="gm-item__name">${esc(t)}</span>`, note ? `<span class="gm-price gm-price--none">${esc(note)}</span>` : "", " gm-item--text");
  const block = (kind, rows) =>
    rows.length ? `<h4 class="gm-sub ${theme(kind)}">${TEXT.kinds[kind]}</h4><ul class="gm-items ${theme(kind)}">${rows.join("")}</ul>` : "";

  // ---------- 出展ブースの一覧 ----------
  const $list = $("gmList");

  function cardHtml(b) {
    const i = info.get(b.no);
    const gs = goodsAt.get(b.no) ?? [];
    return `<article class="gm-card theme-${i.theme}" id="booth-${esc(b.no)}" data-no="${esc(b.no)}">
      <header class="gm-card__head">
        <button type="button" class="gm-no" data-map="${esc(b.no)}" aria-label="${esc(TEXT.showOnMap(boothName(b)))}">${esc(boothLabel(b))}</button>
        <div class="gm-card__title">
          <h3 class="gm-card__name">${esc(b.name)}</h3>
          ${b.org ? `<p class="gm-card__org">${esc(b.org)}</p>` : ""}
        </div>
      </header>
      ${block("sale", [...gs.filter(onSale).map(goodsRow), ...(b.more ?? []).map((t) => textRow(t, TEXT.noPrice))])}
      ${block("exhibit", [...gs.filter((g) => !onSale(g)).map(showRow), ...(b.shows ?? []).map((t) => textRow(t))])}
      ${block("gift", (b.gifts ?? []).map((t) => textRow(t)))}
      ${(b.notes ?? []).map((t) => `<p class="gm-note">${esc(t)}</p>`).join("")}
      ${linkList(b.links)}
    </article>`;
  }

  // 公式物販は、グッズを会社ごとにまとめて、閉じた状態で一覧の最後に置く（ブースではないため）
  function officialHtml() {
    if (!official.length) return "";
    const makers = new Map();
    for (const g of official) makers.set(g.maker, [...(makers.get(g.maker) ?? []), g]);
    return `<details class="gm-card gm-official theme-gold" id="booth-official" data-no="official">
      <summary class="gm-official__head">
        <span class="gm-official__title">${esc(officialTitle)}</span>
        <span class="gm-official__count">${TEXT.officialCount(official.length)}</span>
      </summary>
      <div class="gm-official__body">
        <p class="gm-note">${esc(TEXT.officialLead)}<a href="${esc(D.officialGoods)}" target="_blank" rel="noopener">${esc(TEXT.officialLink)} ↗</a></p>
        ${[...makers].map(([m, gs]) => `<h4 class="gm-official__maker">${esc(m)}</h4><ul class="gm-items">${gs.map(goodsRow).join("")}</ul>`).join("")}
      </div>
    </details>`;
  }

  function looseHtml() {
    if (!loose.length) return "";
    return `<section class="gm-card gm-loose theme-indigo" id="booth-loose" data-no="loose">
      <h3 class="gm-card__name">${esc(TEXT.loose)}</h3>
      <p class="gm-note">${esc(TEXT.looseLead)}</p>
      <ul class="gm-items theme-pink">${loose.map(goodsRow).join("")}</ul>
    </section>`;
  }

  function renderList() {
    $list.innerHTML = booths.map(cardHtml).join("") + officialHtml() + looseHtml();
  }

  // ---------- 会場マップ ----------
  const $map = $("gmMap");
  const $mapbox = $("gmMapbox");
  let floor = D.floors[0];
  const TILE = [57, 35]; // ブースの大きさ（公式の会場マップのブースと同じ）
  const INSET = 2.5; // 売り場・設備の四角を少し縮めて、となりとの間を空ける

  function mapSvg(f) {
    const [, , vw, vh] = f.view;
    const [tw, th] = TILE;
    const area = (a) => {
      const x = a.x + INSET;
      const y = a.y + INSET;
      const w = a.w - INSET * 2;
      const h = a.h - INSET * 2;
      const lines = a.label ?? [];
      const size = a.size ?? 15;
      const top = y + h / 2 - ((lines.length - 1) * size * 1.2) / 2;
      const spot = a.spot && D.spots[a.spot];
      // 名前のない帯やパネルも押せるが、Tab では止まらない（同じ説明に何度も止まらないように）
      const attrs = spot
        ? ` data-pick="${esc(a.spot)}"${lines.length ? ` tabindex="0" role="button" aria-label="${esc(spot.title)}"` : ""}`
        : ' aria-hidden="true"';
      return `<g class="gm-area gm-area--${a.kind}${spot ? " is-link" : ""}"${attrs}>
        <rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(Math.min(10, h / 3))}"/>
        ${lines.map((t, i) => `<text x="${r1(x + w / 2)}" y="${r1(top + i * size * 1.2)}" dy=".36em" font-size="${size}">${esc(t)}</text>`).join("")}
      </g>`;
    };
    const tile = ([no, [x, y]]) => {
      const b = boothBy.get(no);
      return `<g class="gm-tile theme-${info.get(no)?.theme ?? "pink"}" data-pick="${esc(no)}" tabindex="0" role="button" aria-label="${esc(TEXT.boothName(no) + (b ? `：${b.name}` : ""))}">
        <rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="8"/>
        <text x="${r1(x + tw / 2)}" y="${r1(y + th / 2)}" dy=".36em">${esc(no)}</text>
      </g>`;
    };
    return `<svg class="gm-svg" viewBox="${f.view.join(" ")}" width="${vw}" height="${vh}" role="group" aria-label="${esc(`${f.label}${f.sub ? `（${f.sub}）` : ""}の会場マップ`)}">
      <defs>
        <pattern id="gmStripe" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" class="gm-svg__stripe-bg"/><rect width="5" height="12" class="gm-svg__stripe"/></pattern>
        <pattern id="gmHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" class="gm-svg__hatch-bg"/><rect width="2" height="10" class="gm-svg__hatch"/></pattern>
        <linearGradient id="gmPicked" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="gm-svg__picked-a"/><stop offset="1" class="gm-svg__picked-b"/></linearGradient>
      </defs>
      <rect class="gm-svg__base" x="4" y="4" width="${vw - 8}" height="${vh - 8}" rx="24"/>
      <path class="gm-svg__floor" d="${esc(f.outline)}"/>
      ${f.areas.map(area).join("")}
      ${Object.entries(f.booths).map(tile).join("")}
    </svg>`;
  }

  function renderMap() {
    $("gmFloorLabel").innerHTML = `${esc(floor.label)}${floor.sub ? `<small>${esc(floor.sub)}</small>` : ""}`;
    const $floors = $("gmFloors");
    $floors.hidden = D.floors.length < 2;
    $floors.innerHTML = D.floors
      .map((f) => `<button type="button" class="gm-chip" data-floor="${esc(f.id)}" aria-pressed="${f === floor}">${esc(f.label)}</button>`)
      .join("");
    $map.innerHTML = mapSvg(floor);
    // 凡例は、このフロアにあるものだけ
    const kinds = new Set(Object.keys(floor.booths).map((no) => info.get(no)?.kinds[0] ?? "sale"));
    const areas = new Set(floor.areas.map((a) => a.kind));
    $("gmLegend").innerHTML = [
      ...["sale", "exhibit", "gift"].filter((k) => kinds.has(k)).map((k) => `<li><i class="${theme(k)}"></i>${TEXT.legend[k]}</li>`),
      areas.has("official") ? `<li><i class="theme-gold"></i>${TEXT.legend.official}</li>` : "",
      areas.has("exhibit") ? `<li><i class="gm-legend__show"></i>${TEXT.legend.show}</li>` : "",
    ].join("");
    markPicked();
    applyFilter();
  }

  // ---------- 拡大縮小 ----------
  // 拡大率は枠の幅に対する倍率（--zoom）。拡大したら枠の中を横にスクロールして見る
  const ZOOM = { min: 1, max: 3, step: 1.5 };
  let zoom = 1;
  const clampZoom = (z) => Math.min(ZOOM.max, Math.max(ZOOM.min, z));
  // ax（枠の左端からの位置）の下にある内容が、横にずれないようにスクロールを直す
  function setZoom(z, ax = $map.clientWidth / 2) {
    const before = zoom;
    zoom = clampZoom(z);
    const left = $map.scrollLeft;
    $map.style.setProperty("--zoom", zoom);
    $map.scrollLeft = ((left + ax) * zoom) / before - ax;
    $("gmZoom")
      .querySelectorAll("[data-zoom]")
      .forEach((b) => (b.disabled = b.dataset.zoom === "in" ? zoom >= ZOOM.max : zoom <= ZOOM.min));
  }
  // スマホなど枠が狭いときは、ブースの番号が読める大きさまで拡大して開き、ブースの並びをまん中に出す
  function initialZoom() {
    if ($map.clientWidth >= 560) return setZoom(1);
    setZoom(1.8, 0);
    const [vx, , vw] = floor.view;
    const [fx] = floor.focus ?? [vx + vw / 2];
    $map.scrollLeft = ((fx - vx) / vw) * $map.scrollWidth - $map.clientWidth / 2;
  }

  // 二本指で拡大縮小（カレンダーの時間割と同じ操作）。縦は、指の間の内容が動かないようにページのスクロールで合わせる
  let pinch = null;
  const spread = (t) => ({
    d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY),
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
  });
  $map.addEventListener(
    "touchstart",
    (ev) => {
      if (ev.touches.length !== 2) return;
      const s = spread(ev.touches);
      const top = $map.firstElementChild.getBoundingClientRect().top;
      pinch = { s, zoom, left: $map.scrollLeft, ax: s.x - $map.getBoundingClientRect().left, top: top + window.scrollY, ay: s.y - top, raf: 0 };
    },
    { passive: true }
  );
  $map.addEventListener(
    "touchmove",
    (ev) => {
      if (!pinch || ev.touches.length !== 2) return;
      ev.preventDefault();
      const s = spread(ev.touches);
      cancelAnimationFrame(pinch.raf);
      pinch.raf = requestAnimationFrame(() => {
        if (!pinch || pinch.s.d < 20) return;
        zoom = clampZoom((pinch.zoom * s.d) / pinch.s.d);
        const k = zoom / pinch.zoom;
        $map.style.setProperty("--zoom", zoom);
        $map.scrollLeft = (pinch.left + pinch.ax) * k - (s.x - $map.getBoundingClientRect().left);
        window.scrollTo(0, pinch.top + pinch.ay * k - s.y);
      });
    },
    { passive: false }
  );
  const endPinch = (ev) => {
    if (!pinch || ev.touches.length >= 2) return;
    cancelAnimationFrame(pinch.raf);
    pinch = null;
    setZoom(zoom); // ボタンの状態を合わせる
  };
  $map.addEventListener("touchend", endPinch);
  $map.addEventListener("touchcancel", endPinch);
  // iOS Safari のページ全体のピンチズームを抑止
  $map.addEventListener("gesturestart", (ev) => ev.preventDefault());

  // ---------- 選択（マップ ⇄ 一覧） ----------
  const $pick = $("gmPick");
  let picked = null;

  // 選んだブース・売り場を、マップと一覧の両方で強調する（ガチャコーナーとその中のブースは一緒に）
  function markPicked() {
    const ids = new Set(picked ? [picked, spotOf.get(picked), ...(D.spots[picked]?.booths ?? [])] : []);
    $map.querySelectorAll("[data-pick]").forEach((el) => {
      const on = ids.has(el.dataset.pick);
      el.classList.toggle("is-picked", on);
      if (el.hasAttribute("role")) el.setAttribute("aria-pressed", String(on));
    });
    $list.querySelectorAll(".gm-card").forEach((el) => el.classList.toggle("is-picked", ids.has(el.dataset.no)));
  }

  // マップの下の説明欄。ブースは売っているものを3つまで、売り場・設備はデータの説明を出す
  function boothPick(b) {
    const i = info.get(b.no);
    const gs = goodsAt.get(b.no) ?? [];
    const rows = {
      sale: [...gs.filter(onSale).map((g) => short(g.name) + (g.price == null ? "" : ` ${g.unit ?? ""}${yen(g.price)}`)), ...(b.more ?? [])],
      exhibit: [...gs.filter((g) => !onSale(g)).map((g) => short(g.name)), ...(b.shows ?? [])],
      gift: b.gifts ?? [],
    };
    const line = (kind) => {
      const r = rows[kind];
      if (!r.length) return "";
      const head = r.slice(0, 3).join("／") + (r.length > 3 ? `／${TEXT.more(r.length - 3)}` : "");
      return `<p class="gm-pick__line"><span class="gm-sub ${theme(kind)}">${TEXT.kinds[kind]}</span>${esc(head)}</p>`;
    };
    return `<div class="gm-pick__booth theme-${i.theme}">
      <div class="gm-pick__head"><span class="gm-no">${esc(boothLabel(b))}</span><p class="gm-pick__name">${esc(b.name)}</p></div>
      ${line("sale")}${line("exhibit")}${line("gift")}
      <button type="button" class="gm-pick__go" data-card="${esc(b.no)}">${TEXT.toCard} ▼</button>
    </div>`;
  }

  function pickHtml(id) {
    const b = boothBy.get(id);
    if (b) return boothPick(b);
    const s = D.spots[id];
    if (!s) return `<p class="gm-pick__hint">${esc(TEXT.pickHint)}</p>`;
    if (s.booths) return `<p class="gm-pick__title">${esc(s.title)}</p>${s.booths.map((no) => boothPick(boothBy.get(no))).join("")}`;
    if (s.official)
      return `<div class="gm-pick__booth theme-gold">
        <p class="gm-pick__title">${esc(s.title)}<small>${TEXT.officialCount(official.length)}</small></p>
        <p class="gm-pick__line">${esc(TEXT.officialLead)}</p>
        <p class="gm-pick__line gm-pick__makers">${esc([...new Set(official.map((g) => corp(g.maker)))].join("・"))}</p>
        <button type="button" class="gm-pick__go" data-card="official">${TEXT.toCard} ▼</button>
      </div>`;
    return `<div class="gm-pick__booth theme-violet">
      <p class="gm-pick__title">${esc(s.title)}</p>
      ${(s.lines ?? []).map((t) => `<p class="gm-pick__line gm-pick__dot">${esc(t)}</p>`).join("")}
      ${linkList(s.links)}
    </div>`;
  }

  function pick(id, { toCard = false, toMap = false } = {}) {
    picked = id;
    markPicked();
    $pick.innerHTML = pickHtml(id);
    if (boothBy.has(id) || id === "official") history.replaceState(null, "", `#booth-${id}`);
    if (toCard) showCard(id);
    if (toMap) showOnMap(id);
  }

  // 一覧のカードへ移って光らせる。しぼり込みで隠れているときは、しぼり込みを解く
  function showCard(id, { instant = false } = {}) {
    const $card = $(`booth-${D.spots[id]?.booths?.[0] ?? id}`);
    if (!$card) return;
    if ($card.hidden) resetFilter();
    if ($card.tagName === "DETAILS") $card.open = true;
    $card.scrollIntoView({ behavior: instant ? "auto" : behavior, block: "start" });
    $card.classList.remove("is-flash");
    void $card.offsetWidth;
    $card.classList.add("is-flash");
  }

  // マップへ移る。ほかのフロアのブースならフロアを切り替え、拡大しているときはブースが枠のまん中に来るよう横にずらす
  function showOnMap(id) {
    const key = spotOf.get(id) ?? id;
    const f = D.floors.find((x) => key in x.booths || x.areas.some((a) => a.spot === key));
    if (f && f !== floor) {
      floor = f;
      renderMap();
      initialZoom();
    }
    if (!twoCol.matches) $mapbox.scrollIntoView({ behavior, block: "start" });
    const el = $map.querySelector(`[data-pick="${CSS.escape(key)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const m = $map.getBoundingClientRect();
    $map.scrollTo({ left: $map.scrollLeft + r.left + r.width / 2 - (m.left + m.width / 2), behavior });
  }

  // ---------- しぼり込み・検索 ----------
  const state = { kind: "all", q: "" };
  const $chips = $("gmChips");
  const $query = $("gmQuery");

  const markItems = ($el, q) => $el.querySelectorAll(".gm-item").forEach((li) => li.classList.toggle("is-hit", !!q && li.dataset.text.includes(q)));

  function applyFilter() {
    const q = norm(state.q);
    const hits = new Set();
    for (const b of booths) {
      const i = info.get(b.no);
      const on = (state.kind === "all" || i.kinds.includes(state.kind)) && (!q || i.text.includes(q));
      const $card = $(`booth-${b.no}`);
      $card.hidden = !on;
      markItems($card, q);
      if (on) hits.add(b.no);
    }
    // 公式物販と、売り場の記載がないグッズ（どちらも販売だけ）。検索で当たったら開く
    for (const [id, gs] of [
      ["official", official],
      ["loose", loose],
    ]) {
      const $el = $(`booth-${id}`);
      if (!$el) continue;
      const on = (state.kind === "all" || state.kind === "sale") && (!q || gs.some((g) => norm(`${g.name}|${g.maker}`).includes(q)));
      $el.hidden = !on;
      markItems($el, q);
      if (on && q && $el.tagName === "DETAILS") $el.open = true;
      if (on) hits.add(id);
    }
    // マップは、しぼり込み中だけ当たらなかったところを薄くする
    $map.classList.toggle("is-filtering", state.kind !== "all" || !!q);
    $map.querySelectorAll("[data-pick]").forEach((el) => {
      const id = el.dataset.pick;
      el.classList.toggle("is-hit", hits.has(id) || (D.spots[id]?.booths ?? []).some((no) => hits.has(no)));
    });
    const n = booths.filter((b) => hits.has(b.no)).length;
    $("gmCount").textContent = TEXT.count(n, booths.length);
    $("gmEmpty").hidden = hits.size > 0;
  }

  const syncChips = () => $chips.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === state.kind)));
  function resetFilter() {
    state.kind = "all";
    state.q = "";
    $query.value = "";
    syncChips();
    applyFilter();
  }

  // ---------- 固定の文言 ----------
  function renderStatic() {
    if (D.notice) {
      $("gmNotice").textContent = D.notice;
      $("gmNotice").hidden = false;
    }
    $("gmBrand").textContent = E.name;
    $("gmTitle").innerHTML = `<small>${esc(E.venue)}</small>${esc(TEXT.title)}`;
    $("gmMeta").innerHTML = [
      `<li class="gm-hero__days">${E.days.map((d) => `${esc(d.label)}<small>${esc(d.week)}</small>`).join("・")}</li>`,
      `<li>${esc(E.place)}</li>`,
      `<li>${esc(E.hours)}<small>（${TEXT.lastEntry}${esc(E.lastEntry)}）</small></li>`,
      `<li>${esc(E.fee)}</li>`,
    ].join("");
    $("gmNav").innerHTML = TEXT.nav.map((n) => `<a class="gm-btn" href="${esc(n.href)}"><span>${esc(n.label)}</span></a>`).join("");
    $("gmMapTitle").textContent = TEXT.mapTitle;
    $("gmListTitle").textContent = TEXT.listTitle;
    $("gmZoom").innerHTML = Object.entries(TEXT.zoom)
      .map(([z, [label, aria]]) => `<button type="button" data-zoom="${z}" aria-label="${esc(aria)}">${esc(label)}</button>`)
      .join("");
    $("gmMapHint").textContent = TEXT.mapHint;
    $("gmMapNote").innerHTML = `${esc(TEXT.mapNote)}<a href="${esc(D.officialMap)}" target="_blank" rel="noopener">${esc(TEXT.officialMap)} ↗</a>`;
    $query.placeholder = TEXT.search;
    $query.setAttribute("aria-label", TEXT.search);
    $chips.setAttribute("aria-label", TEXT.filter);
    $chips.innerHTML = ["all", ...Object.keys(TEXT.kinds)]
      .map((k) => `<button type="button" class="gm-chip" data-kind="${k}" aria-pressed="${k === state.kind}">${k === "all" ? TEXT.all : TEXT.kinds[k]}</button>`)
      .join("");
    $("gmLead").textContent = D.priceNote;
    $("gmEmpty").textContent = TEXT.empty;
    $("gmToMap").textContent = TEXT.toMap;
    const [y, mo, d] = D.updated.split("-").map(Number);
    $("gmFooter").innerHTML = `
      <p class="site-footer__updated">${esc(TEXT.updated(`${y}年${mo}月${d}日`))}</p>
      <p>${br(TEXT.disclaimer)}</p>
      <p class="gm-sources">${esc(TEXT.sources)}：${D.sources
        .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(`${s.label}（${E.name}）`)} ↗</a>`)
        .join("／")}</p>
      <p class="site-footer__repo"><a href="../">${esc(TEXT.calendar)}</a></p>`;
  }

  // ---------- 操作 ----------
  // マップのブース・売り場を押す。2カラムでは右の一覧のカードへも移る。
  // 1カラムでは、マップの下の説明欄が画面の外なら、見えるところまで送る（スマホではマップが縦に長く、押しても何も起きないように見えるため）
  const activate = (el) => {
    pick(el.dataset.pick, { toCard: twoCol.matches });
    if (!twoCol.matches) $pick.scrollIntoView({ behavior, block: "nearest" });
  };
  $map.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-pick]");
    if (el) activate(el);
  });
  $map.addEventListener("keydown", (ev) => {
    const el = ev.target.closest("[data-pick]");
    if (!el || (ev.key !== "Enter" && ev.key !== " ")) return;
    ev.preventDefault();
    activate(el);
  });
  $pick.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-card]");
    if (el) showCard(el.dataset.card);
  });
  // カードの番号を押すと、マップでそのブースを示す
  $list.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-map]");
    if (el) pick(el.dataset.map, { toMap: true });
  });
  $chips.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-kind]");
    if (!el) return;
    state.kind = el.dataset.kind;
    syncChips();
    applyFilter();
  });
  $query.addEventListener("input", () => {
    state.q = $query.value;
    applyFilter();
  });
  $("gmZoom").addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-zoom]");
    if (!el) return;
    const z = el.dataset.zoom;
    setZoom(z === "in" ? zoom * ZOOM.step : z === "out" ? zoom / ZOOM.step : 1);
  });
  $("gmFloors").addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-floor]");
    if (!el) return;
    floor = D.floors.find((f) => f.id === el.dataset.floor) ?? floor;
    renderMap();
    initialZoom();
  });

  // マップが画面の上に外れたら「マップへ」ボタンを出す（2カラムではマップが常に見えているので、CSS で出さない）
  const $toMap = $("gmToMap");
  new IntersectionObserver(([e]) => {
    $toMap.hidden = e.isIntersecting || e.boundingClientRect.top > 0;
  }).observe($mapbox);
  $toMap.addEventListener("click", () => $mapbox.scrollIntoView({ behavior, block: "start" }));

  // #booth-○○ なら、そのブースを選んで一覧のカードへ（共有したリンクから開いたとき・開いたままハッシュが変わったとき）
  function openHash({ instant = false } = {}) {
    let id = "";
    try {
      id = decodeURIComponent(location.hash.match(/^#booth-(.+)$/)?.[1] ?? "");
    } catch {
      return false; // 壊れたハッシュは無視する
    }
    if (!boothBy.has(id) && id !== "official") return false;
    pick(id);
    showCard(id, { instant });
    return true;
  }
  window.addEventListener("hashchange", () => openHash());

  // ---------- 開始 ----------
  renderStatic();
  renderList();
  renderMap();
  initialZoom();
  if (!openHash({ instant: true })) $pick.innerHTML = pickHtml(null);
})();
