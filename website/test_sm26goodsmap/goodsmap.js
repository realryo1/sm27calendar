// グッズ・出展ブースマップ（試験ページ）
// データは data-○○○○.js の window.GM_DATA（年ごとに差し替える）。ここは年に関係なく使う。
// 会場マップは公式の画像を使わず、データのブース・売り場の位置から SVG で描く
(() => {
  const D = window.GM_DATA;
  if (!D) return;
  const E = D.event;

  // 画面の文言（年に関係しないもの）。日付・会場・注意書きなど、年ごとに変わるものはデータ側
  const TEXT = {
    mapNote: "公式の会場マップをもとに描いた略図です。",
    mapHint: "二本指で拡大するとブースの中身が出ます",
    officialMap: "公式の会場マップ（画像）",
    pipBack: "マップに戻る",
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

  // ブースの無い売り場・設備（主催展示・ワークショップ・クロークなど）の説明。マップで押すと、ここへ移る
  const infoSpots = Object.entries(D.spots).filter(([, s]) => !s.booths && !s.official);
  const spotText = (s) => norm([s.title, ...(s.lines ?? [])].join("|"));
  function spotsHtml() {
    return infoSpots
      .map(
        ([id, s]) => `<section class="gm-card gm-spot theme-violet" id="spot-${esc(id)}" data-no="${esc(id)}">
          <h3 class="gm-card__name">${esc(s.title)}</h3>
          ${s.lines?.length ? `<ul class="gm-items">${s.lines.map((t) => textRow(t)).join("")}</ul>` : ""}
          ${linkList(s.links)}
        </section>`
      )
      .join("");
  }

  function renderList() {
    $list.innerHTML = booths.map(cardHtml).join("") + officialHtml() + looseHtml() + spotsHtml();
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
      return `<g class="gm-area gm-area--${a.kind}${spot ? " is-link" : ""}${spot?.booths ? " has-booths" : ""}"${attrs}>
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
    // 大きさは sizeMap が枠に合わせて入れる（width・height を書くと、その大きさが列の最小幅になって画面からはみ出す）
    return `<svg class="gm-svg" viewBox="${f.view.join(" ")}" width="0" height="0" role="group" aria-label="${esc(`${f.label}${f.sub ? `（${f.sub}）` : ""}の会場マップ`)}">
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

  // 拡大したときにブースの上に出す中身（一覧のカードを縮めたもの）。位置と大きさはマップに対する割合で置くので、拡大縮小に合わせて動く。
  // ガチャコーナーのように中にブースがある売り場は、売り場を縦に等分して並べる
  function minisHtml(f) {
    const [vx, vy, vw, vh] = f.view;
    const box = (no, x, y, w, h) => {
      const b = boothBy.get(no);
      if (!b) return "";
      const gs = goodsAt.get(b.no) ?? [];
      const rows = [
        ...gs.filter(onSale).map((g) => `<li><span>${esc(short(g.name))}</span>${g.price == null ? "" : `<b>${esc(g.unit ?? "")}${yen(g.price)}</b>`}</li>`),
        ...(b.more ?? []).map((t) => `<li><span>${esc(t)}</span></li>`),
        ...[...gs.filter((g) => !onSale(g)).map((g) => short(g.name)), ...(b.shows ?? [])].map((t) => `<li class="theme-violet"><span>${esc(t)}</span></li>`),
        ...(b.gifts ?? []).map((t) => `<li class="theme-orange"><span>${esc(t)}</span></li>`),
      ];
      const pct = (v, o, all) => `${r1(((v - o) / all) * 1000) / 10}%`;
      return `<div class="gm-mini theme-${info.get(no).theme}" data-pick="${esc(no)}" style="left:${pct(x, vx, vw)};top:${pct(y, vy, vh)};width:${pct(w + vx, vx, vw)};height:${pct(h + vy, vy, vh)}">
        <p class="gm-mini__head"><span class="gm-mini__no">${esc(boothLabel(b))}</span>${esc(b.name)}</p>
        <ul class="gm-mini__items">${rows.join("")}</ul>
      </div>`;
    };
    const tiles = Object.entries(f.booths).map(([no, [x, y]]) => box(no, x, y, TILE[0], TILE[1]));
    const inAreas = f.areas
      .filter((a) => a.label && D.spots[a.spot]?.booths)
      .flatMap((a) => {
        const nos = D.spots[a.spot].booths;
        const h = (a.h - INSET * 2) / nos.length;
        return nos.map((no, i) => box(no, a.x + INSET, a.y + INSET + h * i, a.w - INSET * 2, h));
      });
    return [...tiles, ...inAreas].join("");
  }

  function renderMap() {
    $("gmFloorLabel").innerHTML = `${esc(floor.label)}${floor.sub ? `<small>${esc(floor.sub)}</small>` : ""}`;
    const $floors = $("gmFloors");
    $floors.hidden = D.floors.length < 2;
    $floors.innerHTML = D.floors
      .map((f) => `<button type="button" class="gm-chip" data-floor="${esc(f.id)}" aria-pressed="${f === floor}">${esc(f.label)}</button>`)
      .join("");
    // マップの絵（SVG）と、拡大したときにブースの上に出す中身（HTML）を、同じ大きさの台に重ねる
    $map.innerHTML = `<div class="gm-canvas">${mapSvg(floor)}<div class="gm-minis" aria-hidden="true">${minisHtml(floor)}</div></div>`;
    sizeMap();
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

  // ---------- 大きさと拡大縮小 ----------
  // マップの枠の大きさは画面の大きさだけで決まり（カレンダーの時間割と同じ）、マップはその枠に収まる大きさを1倍とする。
  // 拡大したら枠の中を縦横にスクロールして見る（列やページは動かない）
  // めいっぱい拡大すると、ブースの上にそのブースの中身（カード）が出る（DETAIL）。そこまで拡大できるよう上限を大きくとる
  const ZOOM = { min: 1, max: 10, step: 1.5 };
  const DETAIL = 2.4; // マップの1単位が画面でこの px 以上になったら中身を出す（ブースの幅が約140px）
  let zoom = 1;
  const clampZoom = (z) => Math.min(ZOOM.max, Math.max(ZOOM.min, z));
  function sizeMap() {
    const $canvas = $map.firstElementChild;
    if (!$canvas) return;
    const [, , vw, vh] = floor.view;
    const fit = Math.min($map.clientWidth / vw, $map.clientHeight / vh);
    const u = fit * zoom; // マップの1単位の、画面での px
    $canvas.style.width = `${vw * u}px`;
    $canvas.style.height = `${vh * u}px`;
    $map.style.setProperty("--u", u);
    $map.classList.toggle("is-detail", u >= DETAIL);
  }
  // (ax, ay)（枠の左上からの位置）の下にある内容が動かないように、スクロールを直す。
  // マップが枠より小さいあいだは枠のまん中に置いているので、その余白（マップの左上の位置）も含めて合わせる
  function setZoom(z, ax, ay) {
    // スマホは、拡大したときだけフルスクリーンにする（枠が変わるので、枠の大きさはそのあとで測る）
    if (!twoCol.matches) setFull(clampZoom(z) > 1);
    ax ??= $map.clientWidth / 2;
    ay ??= $map.clientHeight / 2;
    const k = clampZoom(z) / zoom;
    zoom = clampZoom(z);
    const at = () => {
      const r = $map.firstElementChild.getBoundingClientRect();
      const m = $map.getBoundingClientRect();
      return [r.left - m.left + $map.scrollLeft, r.top - m.top + $map.scrollTop]; // スクロールの中でのマップの左上
    };
    const [x0, y0] = at();
    const px = $map.scrollLeft + ax - x0; // マップの中での、枠の (ax, ay) の位置
    const py = $map.scrollTop + ay - y0;
    sizeMap();
    const [x1, y1] = at();
    $map.scrollLeft = x1 + px * k - ax;
    $map.scrollTop = y1 + py * k - ay;
    $("gmZoom")
      .querySelectorAll("[data-zoom]")
      .forEach((b) => (b.disabled = b.dataset.zoom === "in" ? zoom >= ZOOM.max : zoom <= ZOOM.min));
  }
  // 枠の中で、マップ上の点 (x, y)（viewBox の座標）をまん中に出す
  function centerOn([x, y], smooth = false) {
    const [vx, vy, vw, vh] = floor.view;
    const r = $map.firstElementChild.getBoundingClientRect();
    const m = $map.getBoundingClientRect();
    const left = $map.scrollLeft + r.left - m.left + ((x - vx) / vw) * r.width - m.width / 2;
    const top = $map.scrollTop + r.top - m.top + ((y - vy) / vh) * r.height - m.height / 2;
    $map.scrollTo({ left, top, behavior: smooth ? behavior : "auto" });
  }
  // スマホなど枠が狭いときは、ブースの番号が読める大きさまで拡大して開き、ブースの並びをまん中に出す
  function initialZoom() {
    zoom = 1;
    setZoom(1);
  }
  // 画面の大きさが変わったら（端末を回したときなど）、枠に合わせて描き直す
  new ResizeObserver(() => sizeMap()).observe($map);

  // 二本指で拡大縮小（カレンダーの時間割と同じ操作）。指の間の内容が動かないように、枠の中のスクロールで合わせる
  let pinch = null;
  const spread = (t) => ({
    d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY),
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
  });
  $map.addEventListener(
    "touchstart",
    (ev) => {
      if (ev.touches.length !== 2 || preview) return; // プレビューでは拡大縮小しない
      drag = null; // 1本指の移動から、ピンチに切り替える
      setFull(true); // スマホは、二本指で拡大し始めたらフルスクリーンにする（枠が変わるので、基準はそのあとで測る）
      const s = spread(ev.touches);
      const m = $map.getBoundingClientRect();
      pinch = { s, zoom, left: $map.scrollLeft, top: $map.scrollTop, ax: s.x - m.left, ay: s.y - m.top, raf: 0 };
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
        const m = $map.getBoundingClientRect();
        sizeMap();
        $map.scrollLeft = (pinch.left + pinch.ax) * k - (s.x - m.left);
        $map.scrollTop = (pinch.top + pinch.ay) * k - (s.y - m.top);
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

  // マウスのホイールは Google マップなどと同じく、カーソルの位置を中心に拡大縮小する
  $map.addEventListener(
    "wheel",
    (ev) => {
      if (!ev.deltaY || preview) return;
      ev.preventDefault();
      const px = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? $map.clientHeight : 1; // 行・ページ単位の届き方を px にそろえる
      const m = $map.getBoundingClientRect();
      setZoom(zoom * Math.exp(-ev.deltaY * px * 0.0015), ev.clientX - m.left, ev.clientY - m.top); // マウスの1目盛り（約100px）で約1.16倍
    },
    { passive: false }
  );

  // 押したまま（タッチは1本指で）動かすと移動する。ブラウザのスクロールに任せると、動き始めの向きで縦か横に固定されて斜めに動かないので、自前で動かす。
  // 動かさずに離したときだけ、ブースを押したことにする。離す直前まで動かしていたら、その速さで少し流れる（慣性）。
  // スマホ（1カラム）では、マップの上下の端まで来た分をページのスクロールに渡す（マップの上でページが止まらないように）
  let drag = null;
  let glide = 0;
  const panBy = (dx, dy, chain) => {
    const top = $map.scrollTop;
    $map.scrollLeft -= dx;
    $map.scrollTop -= dy;
    const rest = dy - (top - $map.scrollTop); // マップで動かしきれなかった縦の量
    if (chain && rest && !twoCol.matches) window.scrollBy(0, -rest);
  };
  const coast = (vx, vy) => {
    let prev = performance.now();
    const step = (now) => {
      const dt = Math.min(32, now - prev);
      prev = now;
      panBy(vx * dt, vy * dt, false);
      const f = Math.pow(0.995, dt); // 約1秒で止まる
      vx *= f;
      vy *= f;
      if (Math.hypot(vx, vy) > 0.02) glide = requestAnimationFrame(step);
    };
    glide = requestAnimationFrame(step);
  };
  $map.addEventListener("pointerdown", (ev) => {
    cancelAnimationFrame(glide);
    // 2本目の指（ピンチ）が来たら、移動はやめる
    if (ev.pointerType === "mouse" ? ev.button !== 0 : !ev.isPrimary) {
      drag = null;
      return;
    }
    if (ev.pointerType === "mouse") ev.preventDefault(); // 文字の選択や画像のドラッグを始めない
    const p = { x: ev.clientX, y: ev.clientY };
    drag = { id: ev.pointerId, start: p, x: p.x, y: p.y, t: ev.timeStamp, vx: 0, vy: 0, moved: false, slop: ev.pointerType === "mouse" ? 4 : 8 };
  });
  $map.addEventListener("pointermove", (ev) => {
    if (!drag || ev.pointerId !== drag.id || pinch) return;
    // 少しの手ぶれは押しただけのまま。動かしたと決まってから掴む（先に掴むと、クリックがブースに届かない）
    if (!drag.moved) {
      if (Math.hypot(ev.clientX - drag.start.x, ev.clientY - drag.start.y) < drag.slop) return;
      drag.moved = true;
      $map.setPointerCapture(ev.pointerId);
      $map.classList.add("is-dragging");
    }
    const dx = ev.clientX - drag.x;
    const dy = ev.clientY - drag.y;
    const dt = ev.timeStamp - drag.t;
    if (dt > 0) {
      drag.vx = 0.8 * drag.vx + 0.2 * (dx / dt);
      drag.vy = 0.8 * drag.vy + 0.2 * (dy / dt);
    }
    drag.x = ev.clientX;
    drag.y = ev.clientY;
    drag.t = ev.timeStamp;
    panBy(dx, dy, true);
  });
  const endDrag = (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    if (drag.moved) {
      if ($map.hasPointerCapture(ev.pointerId)) $map.releasePointerCapture(ev.pointerId);
      $map.classList.remove("is-dragging");
      // 動かしたあとのクリックは、ブースを押したことにしない（クリックは離した直後に同じ流れで届くので、次の順番で外す）
      $map.addEventListener("click", stopClick, true);
      setTimeout(() => $map.removeEventListener("click", stopClick, true), 0);
      if (ev.type === "pointerup" && ev.timeStamp - drag.t < 80) coast(drag.vx, drag.vy);
    }
    drag = null;
  };
  const stopClick = (e) => e.stopPropagation();
  $map.addEventListener("pointerup", endDrag);
  $map.addEventListener("pointercancel", endDrag);

  // ---------- 選択（マップ ⇄ 一覧） ----------
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

  // ブース・売り場・設備の名前から、一覧のカードを探す（中にブースがある売り場は、その先頭のブース）
  const cardOf = (id) => $(`booth-${D.spots[id]?.booths?.[0] ?? id}`) ?? $(`spot-${id}`);

  function pick(id, { toCard = false, toMap = false } = {}) {
    picked = id;
    markPicked();
    if (boothBy.has(id) || id === "official") history.replaceState(null, "", `#booth-${id}`);
    if (toCard) showCard(id);
    if (toMap) showOnMap(id);
  }

  // 一覧のカードへ移って光らせる。しぼり込みで隠れているときは、しぼり込みを解く
  function showCard(id, { instant = false } = {}) {
    const $card = cardOf(id);
    if (!$card) return;
    if ($card.hidden) resetFilter();
    if ($card.tagName === "DETAILS") $card.open = true;
    $card.scrollIntoView({ behavior: instant ? "auto" : behavior, block: "start" });
    $card.classList.remove("is-flash");
    void $card.offsetWidth;
    $card.classList.add("is-flash");
  }

  // マップへ移る。ほかのフロアのブースならフロアを切り替え、拡大しているときはブースを枠のまん中に出す
  function showOnMap(id) {
    const key = spotOf.get(id) ?? id;
    const f = D.floors.find((x) => key in x.booths || x.areas.some((a) => a.spot === key));
    if (f && f !== floor) {
      floor = f;
      renderMap();
      initialZoom();
    }
    const pos = floor.booths[key];
    const a = floor.areas.find((x) => x.spot === key && x.label);
    if (pos) centerOn([pos[0] + TILE[0] / 2, pos[1] + TILE[1] / 2], true);
    else if (a) centerOn([a.x + a.w / 2, a.y + a.h / 2], true);
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
    // 売り場・設備の説明は「すべて」のときだけ
    for (const [id, s] of infoSpots) {
      const on = state.kind === "all" && (!q || spotText(s).includes(q));
      const $el = $(`spot-${id}`);
      $el.hidden = !on;
      markItems($el, q);
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
    $("gmZoom").innerHTML = Object.entries(TEXT.zoom)
      .map(([z, [label, aria]]) => `<button type="button" data-zoom="${z}" aria-label="${esc(aria)}">${esc(label)}</button>`)
      .join("");
    $("gmMapHint").textContent = TEXT.mapHint;
    $query.placeholder = TEXT.search;
    $query.setAttribute("aria-label", TEXT.search);
    $chips.setAttribute("aria-label", TEXT.filter);
    $chips.innerHTML = ["all", ...Object.keys(TEXT.kinds)]
      .map((k) => `<button type="button" class="gm-chip" data-kind="${k}" aria-pressed="${k === state.kind}">${k === "all" ? TEXT.all : TEXT.kinds[k]}</button>`)
      .join("");
    $("gmLead").textContent = D.priceNote;
    $("gmEmpty").textContent = TEXT.empty;
    $("gmPipBack").setAttribute("aria-label", TEXT.pipBack);
    const [y, mo, d] = D.updated.split("-").map(Number);
    $("gmFooter").innerHTML = `
      <p class="site-footer__updated">${esc(TEXT.updated(`${y}年${mo}月${d}日`))}</p>
      <p>${br(TEXT.disclaimer)}</p>
      <p>${esc(TEXT.mapNote)}<a href="${esc(D.officialMap)}" target="_blank" rel="noopener">${esc(TEXT.officialMap)} ↗</a></p>
      <p class="gm-sources">${esc(TEXT.sources)}：${D.sources
        .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(`${s.label}（${E.name}）`)} ↗</a>`)
        .join("／")}</p>
      <p class="site-footer__repo"><a href="../">${esc(TEXT.calendar)}</a></p>`;
  }

  // ---------- 操作 ----------
  // マップのブース・売り場を押すと、一覧のそのカードへ移る（カレンダーの「予定タップで詳細」と同じ）
  const activate = (el) => {
    setFull(false); // フルスクリーンで押したら、閉じてから一覧へ
    pick(el.dataset.pick, { toCard: true });
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

  // 2カラムの持ち手：ドラッグ（ダブルクリックで初期の幅、← → キーでも動く）でマップの幅を変え、この端末に覚える（カレンダーの持ち手と同じ操作）
  {
    const $split = $("gmSplit");
    const $main = $("gmMain");
    const KEY = "sm27-goodsmap-w";
    const DEFAULT = 55;
    const MIN_MAP = 360; // マップと一覧が読める幅の下限（px）
    const MIN_LIST = 340;
    const setW = (pct, save) => {
      const total = $main.clientWidth || innerWidth;
      const w = Math.min(100 - ((MIN_LIST + 16) / total) * 100, Math.max((MIN_MAP / total) * 100, pct));
      $main.style.setProperty("--gm-map-w", `${w}%`);
      $split.setAttribute("aria-valuenow", String(Math.round(w)));
      if (!save) return;
      try {
        localStorage.setItem(KEY, String(Math.round(w * 10) / 10));
      } catch {
        // 保存できなくても、幅は変えられる
      }
    };
    let saved = NaN;
    try {
      saved = parseFloat(localStorage.getItem(KEY));
    } catch {
      saved = NaN;
    }
    setW(Number.isFinite(saved) ? saved : DEFAULT, false);
    // 持ち手の列（16px）の中央を指の位置に合わせる
    const pctAt = (x) => {
      const r = $main.getBoundingClientRect();
      return ((x - r.left - 8) / r.width) * 100;
    };
    $split.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      $split.setPointerCapture(ev.pointerId);
      $split.classList.add("is-dragging");
    });
    $split.addEventListener("pointermove", (ev) => {
      if ($split.hasPointerCapture(ev.pointerId)) setW(pctAt(ev.clientX), false);
    });
    const end = (ev) => {
      if (!$split.hasPointerCapture(ev.pointerId)) return;
      $split.releasePointerCapture(ev.pointerId);
      $split.classList.remove("is-dragging");
      setW(pctAt(ev.clientX), true);
    };
    $split.addEventListener("pointerup", end);
    $split.addEventListener("pointercancel", end);
    $split.addEventListener("dblclick", () => setW(DEFAULT, true));
    $split.addEventListener("keydown", (ev) => {
      const step = { ArrowLeft: -2, ArrowRight: 2 }[ev.key];
      if (!step) return;
      ev.preventDefault();
      setW(parseFloat($main.style.getPropertyValue("--gm-map-w")) + step, true);
    });
    // 画面の幅が変わったら、下限をかけ直す
    window.addEventListener("resize", () => setW(parseFloat($main.style.getPropertyValue("--gm-map-w")), false));
  }

  // スマホ（1カラム）のマップ：開いたときは、画面の幅にマップ全体がちょうど収まる高さで出す（1倍）。
  // マップは画面の上に貼り付き、ページを下へスクロールするほど低くなり（下端は一覧と一緒に上がる）、最後は検索欄の上の細いプレビュー（PREVIEW px）で残る。
  // 拡大（＋ボタン・二本指）したときだけ、画面いっぱい（フルスクリーン）にして、その中で動かす。「全体」か右上の×で元に戻る。
  // プレビューのブースを押せば一覧のカードへ、カードの番号を押せばプレビューの中で光る。プレビューの右上のボタンでいちばん上へ戻る。
  // 2カラムではマップが常に見えているので、どれも使わない
  const $sec = $("map");
  const PREVIEW = 160; // goodsmap.css の --gm-preview と合わせる
  const rootStyle = document.documentElement.style;
  let preview = false; // プレビューのあいだは拡大縮小しない（小さすぎて操作しにくい）
  let full = false;
  let chrome = 0; // マップの枠の上のボタンの行などの高さ（プレビューでは隠れるので、隠れていないときに測っておく）
  let shrinkRaf = 0;
  function shrink() {
    shrinkRaf = 0;
    if (twoCol.matches) {
      for (const k of ["--gm-map-top", "--gm-map-h", "--gm-pv", "--gm-sec-h"]) rootStyle.removeProperty(k);
      $mapbox.classList.remove("is-shrunk", "is-preview");
      preview = false;
      return sizeMap();
    }
    if (full) return sizeMap();
    // 開いたときの高さ：マップ全体が画面の幅にちょうど収まる高さ＋上のボタンの行（これがマップの列の高さになる）
    const [, , vw, vh] = floor.view;
    if (!$mapbox.classList.contains("is-preview")) chrome = $mapbox.offsetHeight - $map.offsetHeight;
    const H = Math.round(($map.clientWidth * vh) / vw + chrome);
    rootStyle.setProperty("--gm-sec-h", `${H}px`);
    const top0 = $sec.offsetTop; // ページの中での、マップの列の上端
    const y = window.scrollY;
    const h = Math.max(PREVIEW, H - Math.max(0, y - top0));
    rootStyle.setProperty("--gm-map-top", `${Math.max(0, top0 - y)}px`);
    rootStyle.setProperty("--gm-map-h", `${h}px`);
    rootStyle.setProperty("--gm-pv", `${h}px`); // 検索欄は、この高さの下に貼り付く
    preview = h <= PREVIEW;
    $mapbox.classList.toggle("is-shrunk", h < H);
    $mapbox.classList.toggle("is-preview", preview);
    sizeMap();
  }
  // フルスクリーンにする・戻す。戻すときは1倍に戻す。フルスクリーンのあいだ、うしろのページはスクロールさせない
  function setFull(on) {
    on = on && !twoCol.matches;
    if (on === full) return;
    full = on;
    $mapbox.classList.toggle("is-full", on);
    document.documentElement.classList.toggle("gm-noscroll", on);
    if (!on) {
      zoom = 1;
      $map.scrollTo(0, 0);
    }
    shrink();
  }
  const requestShrink = () => {
    if (!shrinkRaf) shrinkRaf = requestAnimationFrame(shrink);
  };
  window.addEventListener("scroll", requestShrink, { passive: true });
  window.addEventListener("resize", requestShrink);
  twoCol.addEventListener("change", () => {
    setFull(false);
    requestShrink();
  });
  // 右上のボタン：フルスクリーンなら閉じる、プレビューならいちばん上へ戻る
  $("gmPipBack").addEventListener("click", () => (full ? setFull(false) : window.scrollTo({ top: 0, behavior })));

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
  shrink();
  openHash({ instant: true });
})();
