// グッズ・出展ブースマップ（試験ページ）
// データは data-○○○○.js の window.GM_DATA（年ごとに差し替える）。ここは年に関係なく使う。
// 会場マップは公式の画像を使わず、データのブース・売り場の位置から SVG で描く
(() => {
  const D = window.GM_DATA;
  if (!D) return;
  const E = D.event;

  // 会場のタブ。index.html の GM_TABS（年ごとのデータをまたいで並べる）。無ければ、このデータのフロア
  const TABS = window.GM_TABS ?? D.floors.map((f) => ({ year: D.year, floor: f.id, label: f.label }));
  // カレンダーのサイドバーから iframe で開いたとき（?embed=1。カレンダーの nav.js）。カレンダーへ戻るリンクを出さない
  const EMBED = new URLSearchParams(location.search).has("embed");
  if (EMBED) document.documentElement.classList.add("is-embed"); // goodsmap.css（左右の金の帯を消す）

  // 画面の文言（年に関係しないもの）。日付・会場・注意書きなど、年ごとに変わるものはデータ側
  const TEXT = {
    mapNote: "公式の会場マップをもとに描いた略図です。",
    floors: "会場",
    mapHint: "二本指で拡大するとブースの中身が出ます",
    officialMap: "公式の会場マップ（画像）",
    fullOn: "全画面で表示",
    fullOff: "全画面を閉じる",
    search: "商品名・会社名でさがす",
    filter: "種類でしぼる",
    all: "すべて",
    // カードの中の見出しと、しぼり込みのボタン
    kinds: { sale: "販売", exhibit: "展示・体験", gift: "配布・特典" },
    legend: { sale: "販売あり", exhibit: "展示・体験だけ", gift: "配布・特典だけ", official: "公式物販", show: "主催展示", goods: "グッズ販売・展示など", marche: "マルシェ" },
    noPrice: "価格未掲載",
    notSold: "会場では販売なし",
    soldAt: (where) => `${where}で販売`,
    also: (where) => `${where}でも`,
    more: (n) => `ほか${n}件`,
    empty: "見つかりませんでした。ほかのことばでさがしてみてください。",
    officialLead: "公式グッズの売り場です。商品の写真や詳しい説明は、公式のグッズ一覧で見られます。",
    officialLink: "公式のグッズ一覧",
    officialCount: (n) => `${n}点`,
    loose: "売り場の記載がないグッズ",
    looseLead: "公式のグッズ一覧ではウイングベイで扱うとあるものの、売り場が書かれていません。",
    zoom: { out: ["－", "縮小"], fit: ["全体", "全体を表示"], in: ["＋", "拡大"] },
    turn: ["↻", "マップを右へ90度回す"],
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
  const twoCol = matchMedia("(min-width: 641px)");

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
      const words = [b.name, b.short, b.org, b.label, ...gs.flatMap((g) => [g.name, g.maker]), ...(b.more ?? []), ...(b.shows ?? []), ...(b.gifts ?? []), ...(b.notes ?? [])];
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
  const tileOf = (f) => f.tile ?? [57, 35]; // ブースの大きさ（フロアごとのデータ。無ければ公式の会場マップのブースと同じ）
  const INSET = 2.5; // 売り場・設備の四角を少し縮めて、となりとの間を空ける
  // ブース名が出る拡大率（NAMED 以上）では、通路を狭めてその分ブースを大きくする（番号だけのあいだは元の大きさ）。
  // どのブースも同じ大きさ（縦横とも GROW ずつ大きく）にそろえる。広げるのは通路に面した辺だけで、となりのブースとくっついている辺は広げない
  // （両側が通路なら右・下へ。半分ずつにすると、片側だけ広げるとなりのブースと端がずれる。26 と 27 など）。広げたあとに、向かいとの間が AISLE より狭くなるところがあれば警告する（データの配置を直す）
  const GROW = 12; // 縦横それぞれ大きくする量（マップの単位）
  const AISLE = 16; // 広げても残したい通路の幅
  const grownCache = new WeakMap(); // フロアごとに1回だけ計算する（警告も1回だけ）
  function grownOf(f) {
    if (grownCache.has(f)) return grownCache.get(f);
    const [vx, vy, vw, vh] = f.view;
    const [tw, th] = tileOf(f);
    const tiles = Object.entries(f.booths).map(([no, [x, y]]) => ({ no, x, y, w: tw, h: th }));
    const overlapY = (a, b) => a.y < b.y + b.h && a.y + a.h > b.y;
    const overlapX = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x;
    // その辺のすぐ向こうに、となりのブースがくっついているか
    const joined = (t, side) =>
      tiles.some((o) => {
        if (o === t) return false;
        if (side === "l") return overlapY(t, o) && t.x - (o.x + o.w) >= 0 && t.x - (o.x + o.w) < AISLE;
        if (side === "r") return overlapY(t, o) && o.x - (t.x + t.w) >= 0 && o.x - (t.x + t.w) < AISLE;
        if (side === "t") return overlapX(t, o) && t.y - (o.y + o.h) >= 0 && t.y - (o.y + o.h) < AISLE;
        return overlapX(t, o) && o.y - (t.y + t.h) >= 0 && o.y - (t.y + t.h) < AISLE;
      });
    const split = (a, b) => (b ? [0, GROW] : a ? [GROW, 0] : [0, 0]);
    const big = new Map(
      tiles.map((t) => {
        const [l, r] = split(!joined(t, "l"), !joined(t, "r"));
        const [tp, bt] = split(!joined(t, "t"), !joined(t, "b"));
        return [t.no, { x: t.x - l, y: t.y - tp, w: t.w + l + r, h: t.h + tp + bt }];
      })
    );
    // 広げたブースどうし・売り場・マップの端との間が狭すぎないか（通路側の辺だけ。くっついている辺は元のすき間のまま）
    const walls = f.areas.map((a) => ({ x: a.x + INSET, y: a.y + INSET, w: a.w - INSET * 2, h: a.h - INSET * 2 }));
    const near = (a, b) => overlapX(a, b) || overlapY(a, b);
    const gapOf = (a, b) => Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    for (const [no, g] of big) {
      const t = tiles.find((x) => x.no === no);
      const edge = Math.min(g.x - vx, vx + vw - g.x - g.w, g.y - vy, vy + vh - g.y - g.h);
      if (edge < AISLE / 2) console.warn(`[goodsmap] ブース ${no} を大きくすると、マップの端に近すぎます（${r1(edge)}）`);
      for (const [no2, g2] of big) {
        if (no2 <= no) continue;
        const t2 = tiles.find((x) => x.no === no2);
        if (near(g, g2) && gapOf(t, t2) >= AISLE && gapOf(g, g2) < AISLE) console.warn(`[goodsmap] ブース ${no} と ${no2} の間の通路が狭すぎます（${r1(gapOf(g, g2))}）`);
      }
      for (const w of walls) if (near(g, w) && gapOf(g, w) < AISLE / 2) console.warn(`[goodsmap] ブース ${no} を大きくすると、売り場に近すぎます（${r1(gapOf(g, w))}）`);
    }
    grownCache.set(f, big);
    return big;
  }
  // マップを右へ90度ずつ回す（rot は回した回数。0〜3）。絵を回すのではなく、データの座標を回してから描くので、文字は立ったまま。
  // 大きくしたブース（grownOf）は回す前のもので計算して一緒に回す（広げる向きが変わらないように）。
  // 横に長かった売り場が縦長になり、名前が横書きで収まらないとき（エスカレーターなど）は縦書きにする（vert）
  let rot = 0;
  const turnedCache = new WeakMap();
  const ARROWS = "↑→↓←"; // 右へ90度ずつ回した順
  function turned(f, q) {
    if (!q) return f;
    const all = turnedCache.get(f) ?? [];
    turnedCache.set(f, all);
    if (all[q]) return all[q];
    let view = f.view;
    let [tw, th] = tileOf(f);
    let booths = Object.entries(f.booths).map(([no, [x, y]]) => [no, { x, y, w: tw, h: th }]);
    let big = [...grownOf(f)];
    let areas = f.areas.map((a) => ({ ...a, lx: a.x + a.w / 2, ly: a.labelY ?? a.y + a.h / 2 }));
    for (let i = 0; i < q; i++) {
      const [vx, vy, vw, vh] = view;
      const rect = (r) => ({ ...r, x: vx + vy + vh - r.y - r.h, y: vy + r.x - vx, w: r.h, h: r.w });
      booths = booths.map(([no, r]) => [no, rect(r)]);
      big = big.map(([no, r]) => [no, rect(r)]);
      areas = areas.map((a) => ({ ...rect(a), lx: vx + vy + vh - a.ly, ly: vy + a.lx - vx }));
      view = [vx, vy, vh, vw];
      [tw, th] = [th, tw];
    }
    const [vx, vy, vw, vh] = view;
    areas = areas.map(({ lx, ly, ...a }) => {
      const size = a.size ?? 15;
      // 矢印はマップと一緒に向きを変える
      let lines = (a.label ?? []).map((t) => [...t].map((c) => (ARROWS.includes(c) ? ARROWS[(ARROWS.indexOf(c) + q) % 4] : c)).join(""));
      // 見えている部分（表示範囲の外まで続く区画は、その内側）に横書きで収まるか
      const w = Math.min(a.x + a.w - INSET, vx + vw) - Math.max(a.x + INSET, vx);
      const h = Math.min(a.y + a.h - INSET, vy + vh) - Math.max(a.y + INSET, vy);
      const fits = Math.max(0, ...lines.map((t) => [...t].length)) * size <= w && lines.length * size * 1.2 <= h;
      let vert = false;
      if (q % 2 && !fits) {
        // 1文字ずつの行（縦に並べた出入口など）は1行の横書きに、それ以外は縦書きにする
        if (lines.every((t) => [...t].length === 1)) lines = [lines.join("")];
        else vert = true;
      }
      return { ...a, label: lines, labelX: lx, labelY: ly, vert };
    });
    const t = { ...f, view, tile: [tw, th], booths: Object.fromEntries(booths.map(([no, r]) => [no, [r.x, r.y]])), areas };
    grownCache.set(t, new Map(big));
    all[q] = t;
    return t;
  }
  let shown = floor; // 描いているフロア（floor を rot だけ回したもの）
  function mapSvg(f) {
    const [vx, vy, vw, vh] = f.view;
    const [tw, th] = tileOf(f);
    const big = grownOf(f);
    const area = (a) => {
      const x = a.x + INSET;
      const y = a.y + INSET;
      const w = a.w - INSET * 2;
      const h = a.h - INSET * 2;
      const lines = a.label ?? [];
      const size = a.size ?? 15;
      // labelY：文字の中心の高さ（区画が表示範囲の外まで続くとき、見えている部分に文字を置く）。labelX・vert はマップを回したとき（turned）
      const cx = a.labelX ?? x + w / 2;
      const cy = a.labelY ?? y + h / 2;
      const top = cy - ((lines.length - 1) * size * 1.2) / 2;
      const text = (t, tx, ty, attr = "") => `<text x="${r1(tx)}" y="${r1(ty)}" dy=".36em" font-size="${size}"${attr}>${esc(t)}</text>`;
      // 縦書き：行を右から左へ並べ、1文字ずつ下へ置く。長音などは90度回す
      const vert = () =>
        lines.flatMap((t, i) =>
          [...t].map((c, j, cs) => {
            const tx = cx + ((lines.length - 1) / 2 - i) * size * 1.2;
            const ty = cy + (j - (cs.length - 1) / 2) * size * 1.05;
            return text(c, tx, ty, /[ー－〜～]/.test(c) ? ` transform="rotate(90 ${r1(tx)} ${r1(ty)})"` : "");
          })
        );
      const spot = a.spot && D.spots[a.spot];
      // 名前のない帯やパネルも押せるが、Tab では止まらない（同じ説明に何度も止まらないように）
      const attrs = spot
        ? ` data-pick="${esc(a.spot)}"${lines.length ? ` tabindex="0" role="button" aria-label="${esc(spot.title)}"` : ""}`
        : ' aria-hidden="true"';
      return `<g class="gm-area gm-area--${a.kind}${spot ? " is-link" : ""}${spot?.booths ? " has-booths" : ""}"${attrs}>
        <rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(Math.min(10, h / 3))}"/>
        ${(a.vert ? vert() : lines.map((t, i) => text(t, cx, top + i * size * 1.2))).join("")}
      </g>`;
    };
    const tile = ([no, [x, y]]) => {
      const b = boothBy.get(no);
      const g = big.get(no);
      // 元の大きさの四角と、ブース名が出るときの大きい四角（goodsmap.css で入れ替える）
      return `<g class="gm-tile theme-${info.get(no)?.theme ?? "pink"}" data-pick="${esc(no)}" tabindex="0" role="button" aria-label="${esc(TEXT.boothName(no) + (b ? `：${b.name}` : ""))}">
        <rect class="gm-tile__box" x="${x}" y="${y}" width="${tw}" height="${th}" rx="8"/>
        <rect class="gm-tile__big" x="${r1(g.x)}" y="${r1(g.y)}" width="${r1(g.w)}" height="${r1(g.h)}" rx="8"/>
        <text x="${r1(x + tw / 2)}" y="${r1(y + th / 2)}" dy=".36em" font-size="${r1(Math.min(th * 0.55, tw * 0.48))}">${esc(no)}</text>
      </g>`;
    };
    // 大きさは sizeMap が枠に合わせて入れる（width・height を書くと、その大きさが列の最小幅になって画面からはみ出す）
    return `<svg class="gm-svg" viewBox="${f.view.join(" ")}" width="0" height="0" role="group" aria-label="${esc(`${f.label}${f.sub ? `（${f.sub}）` : ""}の会場マップ`)}">
      <defs>
        <pattern id="gmStripe" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" class="gm-svg__stripe-bg"/><rect width="5" height="12" class="gm-svg__stripe"/></pattern>
        <pattern id="gmHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" class="gm-svg__hatch-bg"/><rect width="2" height="10" class="gm-svg__hatch"/></pattern>
        <linearGradient id="gmPicked" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="gm-svg__picked-a"/><stop offset="1" class="gm-svg__picked-b"/></linearGradient>
      </defs>
      <rect class="gm-svg__base" x="${vx}" y="${vy}" width="${vw}" height="${vh}"/>
      ${f.areas.map(area).join("")}
      ${Object.entries(f.booths).map(tile).join("")}
    </svg>`;
  }

  // 拡大したときにブースの上に出す中身（一覧のカードを縮めたもの）。位置と大きさはマップに対する割合で置くので、拡大縮小に合わせて動く。
  // ガチャコーナーのように中にブースがある売り場は、売り場を縦に等分して並べる
  // 中身の見出しのブース名は「株式会社」などを省き、四角の幅にできるだけ収まる文字の大きさにする（--hk はマップの1単位あたりの文字の px）
  const miniName = (name) => name.replace(/株式会社|有限会社|[（(]株[)）]/g, "").trim();
  const headK = (no, name, w) => r1(Math.min(7.5, (w - 6) / ([...name].length + [...no].length * 0.7 + 0.5)));
  // 中くらいの拡大で、ブースの上に出す番号とブース名（押せるのは下のブースの絵。名前は2行まで、長い名前は文字を小さくして収める）
  // 置くのは、通路を狭めて大きくしたブースの四角（grownOf）
  function labelsHtml(f) {
    const [vx, vy, vw, vh] = f.view;
    const big = grownOf(f);
    const pct = (v, all) => `${r1((v / all) * 1000) / 10}%`;
    return Object.keys(f.booths)
      .map((no) => {
        const { x, y, w: tw, h: th } = big.get(no);
        const b = boothBy.get(no);
        if (!b) return "";
        const name = miniName(b.short ?? b.name);
        // 名前の文字の大きさ（マップの単位）：2行に収まる大きさ。小さくしすぎると読めないので下限を置き、それでも入らない分は見切れる
        const k = r1(Math.max(9, Math.min(th * 0.2, (2 * (tw - 8)) / [...name].length)));
        return `<div class="gm-label theme-${info.get(no).theme}" data-pick="${esc(no)}" style="left:${pct(x - vx, vw)};top:${pct(y - vy, vh)};width:${pct(tw, vw)};height:${pct(th, vh)};--nk:${k};--th:${th}">
          <b class="gm-label__no">${esc(no)}</b><span class="gm-label__name">${esc(name)}</span>
        </div>`;
      })
      .join("");
  }

  function minisHtml(f) {
    const [vx, vy, vw, vh] = f.view;
    const box = (no, x, y, w, h) => {
      const b = boothBy.get(no);
      if (!b) return "";
      const gs = goodsAt.get(b.no) ?? [];
      // 四角に入るのは4品まで。品名は改行せず、はみ出した分は見切れる。価格は次の行に出す
      const li = (name, price = "", cls = "") => `<li${cls ? ` class="${cls}"` : ""}><span>${esc(name)}</span>${price}</li>`;
      const rows = [
        ...gs.filter(onSale).map((g) => li(short(g.name), g.price == null ? "" : `<b>${esc(g.unit ?? "")}${yen(g.price)}</b>`)),
        ...(b.more ?? []).map((t) => li(t)),
        ...[...gs.filter((g) => !onSale(g)).map((g) => short(g.name)), ...(b.shows ?? [])].map((t) => li(t, "", "theme-violet")),
        ...(b.gifts ?? []).map((t) => li(t, "", "theme-orange")),
      ].slice(0, 4);
      const pct = (v, o, all) => `${r1(((v - o) / all) * 1000) / 10}%`;
      return `<div class="gm-mini theme-${info.get(no).theme}" data-pick="${esc(no)}" style="left:${pct(x, vx, vw)};top:${pct(y, vy, vh)};width:${pct(w + vx, vx, vw)};height:${pct(h + vy, vy, vh)}">
        <p class="gm-mini__head" style="--hk:${headK(boothLabel(b), miniName(b.short ?? b.name), w)}"><span class="gm-mini__no">${esc(boothLabel(b))}</span><span class="gm-mini__name">${esc(miniName(b.short ?? b.name))}</span></p>
        <ul class="gm-mini__items">${rows.join("")}</ul>
      </div>`;
    };
    const big = grownOf(f);
    const tiles = Object.keys(f.booths).map((no) => {
      const { x, y, w, h } = big.get(no);
      return box(no, x, y, w, h);
    });
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
    shown = turned(floor, rot);
    $("gmFloorLabel").innerHTML = `${esc(floor.label)}${floor.sub ? `<small>${esc(floor.sub)}</small>` : ""}`;
    // 会場（ウイングベイ・チ・カ・ホ・前年のウイングベイ）はタブで切り替える。同じ年のデータの中はそのまま切り替え、別の年のタブは、その年のデータで読み込み直す
    const $floors = $("gmFloors");
    $floors.hidden = TABS.length < 2;
    $floors.innerHTML = TABS.map(
      (t) => `<button type="button" class="gm-chip gm-tab" role="tab" data-year="${t.year}" data-floor="${esc(t.floor)}" aria-selected="${t.year === D.year && t.floor === floor.id}">${esc(t.label)}</button>`
    ).join("");
    $("gmMapHint").textContent = floor.hint ?? (booths.length ? TEXT.mapHint : "");
    // マップの絵（SVG）と、拡大したときにブースの上に出す中身（HTML）を、同じ大きさの台に重ねる
    $map.innerHTML = `<div class="gm-canvas">${mapSvg(shown)}<div class="gm-minis" aria-hidden="true">${labelsHtml(shown)}${minisHtml(shown)}</div></div>`;
    sizeMap();
    // 凡例は、このフロアにあるものだけ
    const kinds = new Set(Object.keys(floor.booths).map((no) => info.get(no)?.kinds[0] ?? "sale"));
    const areas = new Set(floor.areas.map((a) => a.kind));
    $("gmLegend").innerHTML = [
      ...["sale", "exhibit", "gift"].filter((k) => kinds.has(k)).map((k) => `<li><i class="${theme(k)}"></i>${TEXT.legend[k]}</li>`),
      areas.has("official") ? `<li><i class="theme-gold"></i>${TEXT.legend.official}</li>` : "",
      areas.has("exhibit") ? `<li><i class="gm-legend__show"></i>${TEXT.legend.show}</li>` : "",
      areas.has("goods") ? `<li><i class="theme-pink"></i>${TEXT.legend.goods}</li>` : "",
      areas.has("marche") ? `<li><i class="theme-orange"></i>${TEXT.legend.marche}</li>` : "",
    ].join("");
    markPicked();
    applyFilter();
  }

  // ---------- 大きさと拡大縮小 ----------
  // マップの枠の大きさは画面の大きさだけで決まり（カレンダーの時間割と同じ）、マップはその枠に収まる大きさを1倍とする。
  // 拡大したら枠の中を縦横にスクロールして見る（列やページは動かない）
  // めいっぱい拡大すると、ブースの上にそのブースの中身（カード）が出る（DETAIL）。そこまで拡大できるよう上限を大きくとる
  const ZOOM = { min: 1, max: 10, step: 1.5 };
  // ブースの表示は3段階：小さいうちは番号だけ、幅が NAMED px 以上で番号とブース名、DETAIL px 以上で中身（品名・価格）
  const NAMED = 44;
  const DETAIL = 140;
  let zoom = 1;
  const clampZoom = (z) => Math.min(ZOOM.max, Math.max(ZOOM.min, z));
  function sizeMap() {
    const $canvas = $map.firstElementChild;
    if (!$canvas) return;
    const [, , vw, vh] = shown.view;
    const fit = Math.min($map.clientWidth / vw, $map.clientHeight / vh);
    const u = fit * zoom; // マップの1単位の、画面での px
    $canvas.style.width = `${vw * u}px`;
    $canvas.style.height = `${vh * u}px`;
    $map.style.setProperty("--u", u);
    const tilePx = u * tileOf(floor)[0];
    $map.classList.toggle("is-detail", tilePx >= DETAIL);
    $map.classList.toggle("is-named", tilePx >= NAMED && tilePx < DETAIL);
  }
  // (ax, ay)（枠の左上からの位置）の下にある内容が動かないように、スクロールを直す。
  // マップが枠より小さいあいだは枠のまん中に置いているので、その余白（マップの左上の位置）も含めて合わせる
  function setZoom(z, ax, ay) {
    anchored = false;
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
    const [vx, vy, vw, vh] = shown.view;
    const r = $map.firstElementChild.getBoundingClientRect();
    const m = $map.getBoundingClientRect();
    const left = $map.scrollLeft + r.left - m.left + ((x - vx) / vw) * r.width - m.width / 2;
    const top = $map.scrollTop + r.top - m.top + ((y - vy) / vh) * r.height - m.height / 2;
    anchored = false;
    $map.scrollTo({ left, top, behavior: smooth ? behavior : "auto" });
  }
  // スマホ（1カラム）は、ブース名が出る大きさ（NAMED）まで拡大して開き、右下に寄せる（左端の売り場はあえて見切れさせる）。
  // 枠が広くて、いちばん左のブースの列とその左の売り場の端まで入るなら、そこまで入る大きさにする（左にも売り場があるとわかるように）。2カラムと、回しているときは全体
  function initialZoom() {
    zoom = 1;
    setZoom(1);
    if (twoCol.matches || rot) return;
    const [vx, , vw, vh] = floor.view;
    const fit = Math.min($map.clientWidth / vw, $map.clientHeight / vh);
    if (!Object.keys(floor.booths).length) return; // ブースがまだ無いフロアは全体のまま
    const left = Math.min(...Object.values(floor.booths).map(([x]) => x)) - 120; // いちばん左のブースの列に、その左の売り場が少し見える分を足す
    const u = Math.max((NAMED + 0.5) / tileOf(floor)[0], $map.clientWidth / (vx + vw - left));
    setZoom(u / fit);
    anchored = true;
    toCorner();
  }
  // 開いたときの右下寄せは、利用者がマップを動かすまで保つ（開いた直後に枠の大きさが変わると、スクロールの位置が左上に残るため）
  let anchored = false;
  const toCorner = () => {
    $map.scrollLeft = $map.scrollWidth;
    $map.scrollTop = $map.scrollHeight;
  };
  // 画面の大きさが変わったら（端末を回したときなど）、枠に合わせて描き直す
  // 2カラムの持ち手を動かしているあいだは測り直さない（毎フレーム --u が変わると、ブースの文字をすべて組み直して重い）。
  // 中身は押した時の大きさのまま、枠だけが動く。手を止めたら持ち手の処理が sizeMap を呼ぶ
  let resizing = false;
  new ResizeObserver(() => {
    if (resizing) return;
    sizeMap();
    if (anchored) toCorner();
  }).observe($map);

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
      anchored = false;
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
    anchored = false;
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
    const pos = shown.booths[key];
    const a = shown.areas.find((x) => x.spot === key && x.label);
    if (pos) centerOn([pos[0] + tileOf(shown)[0] / 2, pos[1] + tileOf(shown)[1] / 2], true);
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
    $("gmZoom").innerHTML =
      `<button type="button" class="gm-turn" data-turn aria-label="${esc(TEXT.turn[1])}">${esc(TEXT.turn[0])}</button>` +
      Object.entries(TEXT.zoom)
        .map(([z, [label, aria]]) => `<button type="button" data-zoom="${z}" aria-label="${esc(aria)}">${esc(label)}</button>`)
        .join("") + `<button type="button" class="gm-full" id="gmFull" aria-pressed="false" aria-label="${esc(TEXT.fullOn)}"></button>`;
    $("gmFloors").setAttribute("role", "tablist");
    $("gmFloors").setAttribute("aria-label", TEXT.floors);
    $("gmTools").hidden = !booths.length; // ブース・グッズがまだ無いあいだは、検索としぼり込みを出さない
    $query.placeholder = TEXT.search;
    $query.setAttribute("aria-label", TEXT.search);
    $chips.setAttribute("aria-label", TEXT.filter);
    $chips.innerHTML = ["all", ...Object.keys(TEXT.kinds)]
      .map((k) => `<button type="button" class="gm-chip" data-kind="${k}" aria-pressed="${k === state.kind}">${k === "all" ? TEXT.all : TEXT.kinds[k]}</button>`)
      .join("");
    $("gmLead").textContent = D.priceNote;
    $("gmEmpty").textContent = TEXT.empty;
    const [y, mo, d] = D.updated.split("-").map(Number);
    $("gmFooter").innerHTML = `
      <p class="site-footer__updated">${esc(TEXT.updated(`${y}年${mo}月${d}日`))}</p>
      <p>${br(TEXT.disclaimer)}</p>
      <p>${esc(D.mapNote ?? TEXT.mapNote)}${[].concat(D.officialMap)
        .map((m) => (typeof m === "string" ? { label: TEXT.officialMap, url: m } : m))
        .map((m) => `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.label)} ↗</a>`)
        .join("")}</p>
      <p class="gm-sources">${esc(TEXT.sources)}：${D.sources
        .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(`${s.label}（${E.name}）`)} ↗</a>`)
        .join("／")}</p>
      ${EMBED ? "" : `<p class="site-footer__repo"><a href="../">${esc(TEXT.calendar)}</a></p>`}`;
  }

  // ---------- 操作 ----------
  // マップのブース・売り場を押すと、一覧のそのカードへ移る（カレンダーの「予定タップで詳細」と同じ）
  const activate = (el) => {
    setFull(false); // フルスクリーンで押したら、閉じてから一覧へ
    pick(el.dataset.pick, { toCard: true });
  };
  $map.addEventListener("click", (ev) => {
    // プレビューは、どこを押してもマップだけを大きくする（一覧はスクロールさせない。ブースを選ぶのは大きくしてから）
    if (preview) return expand();
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
    // 全画面のボタン（＋の右）。押したときだけ切り替える（拡大しても自動では全画面にしない）
    if (ev.target.closest("#gmFull")) return setFull(!full);
    if (ev.target.closest("[data-turn]")) return turnMap();
    const el = ev.target.closest("[data-zoom]");
    if (!el) return;
    const z = el.dataset.zoom;
    setZoom(z === "in" ? zoom * ZOOM.step : z === "out" ? zoom / ZOOM.step : 1);
  });
  $("gmFloors").addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-floor]");
    if (!el) return;
    // 別の年のデータのタブは、その年のデータで読み込み直す
    if (+el.dataset.year !== D.year) return location.assign(`?year=${el.dataset.year}${EMBED ? "&embed=1" : ""}#map-${el.dataset.floor}`);
    floor = D.floors.find((f) => f.id === el.dataset.floor) ?? floor;
    history.replaceState(null, "", `#map-${floor.id}`);
    renderMap();
    initialZoom();
  });

  // 2カラムの持ち手：ドラッグ（ダブルクリックで半々、← → キーでも動く）でマップの幅を変え、この端末に覚える（カレンダーの持ち手と同じ操作・同じ処理）
  {
    const $split = $("gmSplit");
    const $main = $("gmMain");
    const KEY = "sm27-goodsmap-w";
    const DEFAULT = 50;
    const MIN_MAP = 300; // マップと一覧が読める幅の下限（px）。カレンダーの持ち手と同じ（641px でも両方が収まる）
    const MIN_LIST = 260;
    // .gm-main の位置と幅はドラッグ中は変わらないので押した時に1回だけ測る（動かすたびに測ると、直前の幅の変更をその場でレイアウトさせて重い）
    let rect = null;
    // 持ち手の列の幅＝ページの隙間（カレンダーの style.css の --gap）
    const gap = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gap")) || 16;
    const setW = (pct, save) => {
      const total = rect?.width || $main.clientWidth || innerWidth;
      const w = Math.min(100 - ((MIN_LIST + gap()) / total) * 100, Math.max((MIN_MAP / total) * 100, pct));
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
    // 持ち手の列（幅は --gap）の中央を指の位置に合わせる
    const pctAt = (x) => {
      const r = rect ?? $main.getBoundingClientRect();
      return ((x - r.left - gap() / 2) / r.width) * 100;
    };
    // ドラッグ中はカードの枠だけを幅に合わせ、中身は押した時の幅のまま組み直さない（goodsmap.css の .is-frozen）。
    // 動かす手を止めたら（SETTLE ms）、その幅で中身も組み直す
    const $side = $("booths");
    const SETTLE = 200;
    let settle = 0;
    const freeze = () => {
      if ($side.classList.contains("is-frozen")) return;
      $side.querySelectorAll(".gm-card").forEach((card) => {
        const cs = getComputedStyle(card);
        card.style.setProperty("--cw", `${card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)}px`);
      });
      $side.classList.add("is-frozen");
      resizing = true;
    };
    // 幅を変えたか（持ち手を選んだだけで列が広がったときは、マップを測り直さない。外したら元の幅に戻るので、中身は元の大きさのままでぴったり収まる）
    let moved = false;
    const thaw = () => {
      $side.classList.remove("is-frozen");
      if (!resizing) return;
      // 持ち手の列が広がる動き（goodsmap.css の --gm-split-extra）が終わってから測る
      const grow = $main.getAnimations().filter((a) => a.transitionProperty === "--gm-split-extra");
      Promise.allSettled(grow.map((a) => a.finished)).then(() => {
        if ($side.classList.contains("is-frozen")) return; // また動かし始めた
        resizing = false;
        if (!moved) return;
        moved = false;
        settleMap(); // 止めた幅でマップを1回だけ測り直す（回すときと同じ動きで）
      });
    };
    // 持ち手を選ぶ・外すと列が広がる・戻るので、そのあいだ中身を止めておく（ドラッグ中は pointerdown からの処理に任せる）
    const hold = () => {
      if ($split.classList.contains("is-dragging")) return;
      freeze();
      clearTimeout(settle);
      settle = setTimeout(thaw, SETTLE);
    };
    for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) $split.addEventListener(type, hold);
    // 幅の変更は1フレームに1回だけにまとめる
    let moveX = 0;
    let moveRaf = 0;
    $split.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      rect = $main.getBoundingClientRect();
      freeze();
      $split.setPointerCapture(ev.pointerId);
      $split.classList.add("is-dragging");
      document.documentElement.classList.add("is-resizing");
    });
    $split.addEventListener("pointermove", (ev) => {
      if (!$split.hasPointerCapture(ev.pointerId)) return;
      moveX = ev.clientX;
      if (!moveRaf)
        moveRaf = requestAnimationFrame(() => {
          moveRaf = 0;
          freeze();
          moved = true;
          setW(pctAt(moveX), false);
          clearTimeout(settle);
          settle = setTimeout(thaw, SETTLE);
        });
    });
    const end = (ev) => {
      if (!$split.hasPointerCapture(ev.pointerId)) return;
      cancelAnimationFrame(moveRaf);
      moveRaf = 0;
      clearTimeout(settle);
      $split.releasePointerCapture(ev.pointerId);
      $split.classList.remove("is-dragging");
      document.documentElement.classList.remove("is-resizing");
      moved = true;
      setW(pctAt(ev.clientX), true);
      thaw(); // 離した幅が決まってから、マップを測り直す
      rect = null;
    };
    $split.addEventListener("pointerup", end);
    $split.addEventListener("pointercancel", end);
    // ダブルクリックと矢印キーも、ドラッグと同じく枠だけ先に動かし、マップは測り直して動かす
    const jump = (pct) => {
      freeze();
      moved = true;
      setW(pct, true);
      thaw();
    };
    $split.addEventListener("dblclick", () => jump(DEFAULT));
    $split.addEventListener("keydown", (ev) => {
      const step = { ArrowLeft: -2, ArrowRight: 2 }[ev.key];
      if (!step) return;
      ev.preventDefault();
      jump(parseFloat($main.style.getPropertyValue("--gm-map-w")) + step);
    });
    // 2カラムの高さは dvh ではなく innerHeight で決める（goodsmap.css の --app-h。カレンダーと同じ）。
    // Android の Chrome は、更新ボタンで読み込み直したあと dvh が古い高さのまま残り、resize の後も直らないことがある
    const setAppH = () => $main.style.setProperty("--app-h", `${innerHeight}px`);
    setAppH();
    // 画面の幅が変わったら（端末を回したときなど）、下限をかけ直す
    window.addEventListener("resize", () => {
      setW(parseFloat($main.style.getPropertyValue("--gm-map-w")), false);
      setAppH();
    });
  }

  // スマホ（1カラム）のマップ：開いたときは、画面の上半分に出す（1倍。マップと一覧が上下1:1）。
  // マップは画面の上に貼り付き、ページを下へスクロールするほど低くなり（下端は一覧と一緒に上がる）、最後は検索欄の上の細いプレビュー（PREVIEW px）で残る。
  // 全画面は、＋の右のボタンを押したときだけにする（拡大しても自動では切り替えない）。もう一度押すと元に戻る。
  // プレビューはどこを押しても、一覧はそのままでマップだけが大きくなる（一覧をスクロールすると、またプレビューに戻る）。カードの番号を押せばプレビューの中で光る。
  // 2カラムではマップが常に見えているので、どれも使わない
  const $sec = $("map");
  const PREVIEW = 160; // goodsmap.css の --gm-preview と合わせる
  // 縮む高さと位置は、使う要素に直接入れる（:root に入れると、スクロールのたびにページ全体のスタイルを計算し直して重い。goodsmap.css の @property）
  const $tools = document.querySelector(".gm-tools");
  const boxStyle = $mapbox.style;
  const toolsStyle = $tools.style;
  const secStyle = $sec.style;
  let fitTimer = 0; // スクロールのあいだ止めているマップの測り直し（下の shrink）を、止まってからやる
  let scrolled = false; // 次の shrink がスクロール（か、プレビューを開く動き）によるもの
  let preview = false; // プレビューのあいだは拡大縮小しない（小さすぎて操作しにくい）
  let expanded = null; // プレビューを押して大きくしたときの、ページのスクロール位置（一覧をスクロールしたら、プレビューに戻す）
  let full = false;
  let shrinkRaf = 0;
  // deferMs：枠の高さが動いているあいだはマップの絵（SVG とブースの文字）を描き直さず、枠で切るだけにして、止まってから1回だけ測り直す
  // （描き直すのは枠の高さが変わる毎フレームだと重く、スクロールがガクガクする。測り直しは settleMap。大きさが変わらなければ何も動かない）
  const FIT_SCROLL = 150;
  const FIT_EXPAND = 300; // プレビューを開く動き（.is-animating の 0.25 秒）が終わってから
  function shrink() {
    shrinkRaf = 0;
    const deferMs = scrolled ? (expanded != null && $mapbox.classList.contains("is-animating") ? FIT_EXPAND : FIT_SCROLL) : 0;
    scrolled = false;
    if (twoCol.matches) {
      for (const style of [boxStyle, toolsStyle, secStyle]) for (const k of ["--gm-map-top", "--gm-map-h", "--gm-pv", "--gm-sec-h"]) style.removeProperty(k);
      $mapbox.classList.remove("is-shrunk", "is-preview");
      preview = false;
      return sizeMap();
    }
    if (full) return sizeMap();
    // 開いたときの高さ：画面の上半分（マップと一覧が上下1:1。これがマップの列の高さになる）。マップはその中に収まる大きさで描く
    const top0 = $sec.offsetTop; // ページの中での、マップの列の上端
    const H = Math.round(window.innerHeight / 2 - top0);
    secStyle.setProperty("--gm-sec-h", `${H}px`);
    const y = window.scrollY;
    if (expanded != null && Math.abs(y - expanded) > 4) expanded = null;
    const h = expanded != null ? H : Math.max(PREVIEW, H - Math.max(0, y - top0));
    boxStyle.setProperty("--gm-map-top", `${Math.max(0, top0 - y)}px`);
    boxStyle.setProperty("--gm-map-h", `${h}px`);
    toolsStyle.setProperty("--gm-pv", `${h}px`); // 検索欄は、この高さの下に貼り付く
    preview = h <= PREVIEW;
    $mapbox.classList.toggle("is-shrunk", h < H);
    $mapbox.classList.toggle("is-preview", preview);
    if (!deferMs) return sizeMap();
    resizing = true; // 枠の大きさが変わっても、ResizeObserver は測り直さない
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
      resizing = false;
      settleMap();
    }, deferMs);
    if (anchored) toCorner(); // 右下寄せは枠の動きに合わせて保つ
  }
  // 全画面にする・戻す。拡大率はそのまま。全画面のあいだ、うしろのページはスクロールさせない
  function setFull(on) {
    on = on && !twoCol.matches;
    if (on === full) return;
    full = on;
    $mapbox.classList.toggle("is-full", on);
    document.documentElement.classList.toggle("gm-noscroll", on);
    $("gmFull").setAttribute("aria-pressed", String(on));
    $("gmFull").setAttribute("aria-label", on ? TEXT.fullOff : TEXT.fullOn);
    // 枠の大きさが変わるので、まん中に見えていたところをまん中に保つ
    const r = $map.firstElementChild.getBoundingClientRect();
    const m = $map.getBoundingClientRect();
    const cx = (m.left + m.width / 2 - r.left) / r.width;
    const cy = (m.top + m.height / 2 - r.top) / r.height;
    shrink();
    const [vx, vy, vw, vh] = shown.view;
    centerOn([vx + cx * vw, vy + cy * vh]);
  }
  // マップを右へ90度回す（turned）。拡大率はそのままで、まん中に見えていたところをまん中に保つ。
  // 回すあいだは文字を消し、TURN ms かけて回してから文字を出す（goodsmap.css の .is-turning）。
  // 縦横が入れ替わると枠に収まる大きさ（1倍）も変わるので、先に回したデータで描き直し、その絵に「回す前の向き・大きさ・位置」に見える変形をかけてから、
  // 変形を外していく（回転と拡大縮小が一緒に滑らかに動く）
  const TURN = 375; // 0.3秒の0.8倍速
  let turning = 0;
  function turnMap() {
    if (turning) return; // 回している途中は、絵に変形がかかっていて位置を測れない
    const r0 = $map.firstElementChild.getBoundingClientRect();
    const m = $map.getBoundingClientRect();
    const cx = Math.min(1, Math.max(0, (m.left + m.width / 2 - r0.left) / r0.width));
    const cy = Math.min(1, Math.max(0, (m.top + m.height / 2 - r0.top) / r0.height));
    const [vx, vy, vw, vh] = shown.view;
    rot = (rot + 1) % 4;
    renderMap();
    // 回す前の (x, y) は、回したあと (vx + vy + vh - y, vy + x - vx) に来る
    centerOn([vx + vh * (1 - cy), vy + vw * cx]);
    if (behavior === "auto") return; // 動きを減らす設定では、すぐ切り替える
    cancelAnimationFrame(glide);
    $map.classList.add("is-turning");
    const $canvas = $map.firstElementChild;
    const rn = $canvas.getBoundingClientRect();
    // 新しい絵の点 p（絵の左上からの px）が、回す前の絵で同じ場所だった画面の位置：r0 + (p.y / s, r0.height - p.x / s)（s は大きさの比）。
    // 枠のまん中 o を軸に、左へ90度回して 1/s 倍し、残りのずれを translate で足す
    const s = rn.width / r0.height;
    const o = [m.left + m.width / 2 - rn.left, m.top + m.height / 2 - rn.top];
    const tx = r0.left - rn.left - o[0] + o[1] / s;
    const ty = r0.top - rn.top + r0.height - o[1] - o[0] / s;
    $canvas.style.transition = "none";
    $canvas.style.transformOrigin = `${o[0]}px ${o[1]}px`;
    $canvas.style.transform = `translate(${tx}px, ${ty}px) rotate(-90deg) scale(${1 / s})`;
    void $canvas.offsetWidth; // 回す前の見た目から動き始める
    $canvas.style.transition = "";
    $canvas.style.transform = "";
    // 描き直した文字は、回し終わってから出す
    turning = setTimeout(() => {
      $map.classList.remove("is-turning");
      turning = 0;
    }, TURN);
  }
  // 2カラムの持ち手を止めて幅が決まったとき：止めていたマップを新しい枠の大きさに測り直す。
  // まん中に見えていたところをまん中に保ち、大きさと位置の変わり目を回すときと同じ動き（TURN ms・easeOutQuint）で動かす。文字は動かさず、終わってから出す
  function settleMap() {
    if (turning) return sizeMap(); // 回している途中は、絵に変形がかかっていて位置を測れない
    const $canvas = $map.firstElementChild;
    const r0 = $canvas.getBoundingClientRect();
    const m = $map.getBoundingClientRect();
    const cx = Math.min(1, Math.max(0, (m.left + m.width / 2 - r0.left) / r0.width));
    const cy = Math.min(1, Math.max(0, (m.top + m.height / 2 - r0.top) / r0.height));
    sizeMap();
    if (anchored) toCorner();
    else {
      const [vx, vy, vw, vh] = shown.view;
      centerOn([vx + cx * vw, vy + cy * vh]);
    }
    if (behavior === "auto") return; // 動きを減らす設定では、すぐ切り替える
    const rn = $canvas.getBoundingClientRect();
    if (Math.abs(rn.width - r0.width) < 0.5 && Math.abs(rn.left - r0.left) < 0.5 && Math.abs(rn.top - r0.top) < 0.5) return;
    $map.classList.add("is-turning");
    $canvas.style.transition = "none";
    $canvas.style.transformOrigin = "0 0";
    $canvas.style.transform = `translate(${r0.left - rn.left}px, ${r0.top - rn.top}px) scale(${r0.width / rn.width})`;
    void $canvas.offsetWidth; // 測り直す前の見た目から動き始める
    $canvas.style.transition = "";
    $canvas.style.transform = "";
    turning = setTimeout(() => {
      $map.classList.remove("is-turning");
      turning = 0;
    }, TURN);
  }
  // プレビューを押したとき：一覧はそのまま、マップだけを開いたときの高さに戻す（大きさの変わり目だけ、なめらかに動かす）
  function expand() {
    expanded = window.scrollY;
    $mapbox.classList.add("is-animating");
    scrolled = true;
    shrink();
    setTimeout(() => $mapbox.classList.remove("is-animating"), 300);
  }
  const requestShrink = () => {
    if (!shrinkRaf) shrinkRaf = requestAnimationFrame(shrink);
  };
  window.addEventListener(
    "scroll",
    () => {
      scrolled = true;
      requestShrink();
    },
    { passive: true }
  );
  window.addEventListener("resize", requestShrink);
  twoCol.addEventListener("change", () => {
    setFull(false);
    requestShrink();
  });


  // #booth-○○ なら、そのブースを選んで一覧のカードへ（共有したリンクから開いたとき・開いたままハッシュが変わったとき）
  function openHash({ instant = false } = {}) {
    let id = "";
    let tab = "";
    try {
      id = decodeURIComponent(location.hash.match(/^#booth-(.+)$/)?.[1] ?? "");
      tab = decodeURIComponent(location.hash.match(/^#map-(.+)$/)?.[1] ?? "");
    } catch {
      return false; // 壊れたハッシュは無視する
    }
    // #map-○○ ならそのフロアのタブで開く
    const f = D.floors.find((x) => x.id === tab);
    if (f) {
      if (f !== floor) {
        floor = f;
        renderMap();
        initialZoom();
      }
      return true;
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
  shrink(); // スマホは、先にマップの枠を開いたときの高さにしてから拡大する（右下に寄せるため）
  initialZoom();
  openHash({ instant: true });
})();
