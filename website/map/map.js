// 会場マップ（map/index.html）。前半はマップの部品（window.GM_MAP）、最後にページの開始（「ページ」）。
// データはグッズと同じ../goods/data-○○○○.jsのwindow.GM_DATA（年ごとに差し替える）。ここは年に関係なく使う。
// 会場マップは公式の画像を使わず、データのブース・売り場の位置からSVGで描く。
// 一覧・しぼり込みはグッズのページ（../goods/goods.js）が受け持ち、ここはマップの描画と操作（拡大・移動・回す）だけ。
// 使い方：const M = window.GM_MAP(D, L, { onActivate })
//   Lは../goods/goodslist.jsの部品、onActivate(id)はマップのブース・売り場を押したとき。
window.GM_MAP = (D, L, { onActivate }) => {
  // 書き写しの確認（コンソールの警告）は、手元で開いたときだけ行う。公開版では毎回は行わない
  const DEV = ["localhost", "127.0.0.1"].includes(location.hostname);

  // 会場のタブ（このデータのフロア）。データに osm があれば、先頭に周辺の地図（OpenStreetMap）を置き、開いたときはそれを出す
  const OSM = "osm";
  const TABS = [...(D.osm ? [{ floor: OSM, label: D.osm.label }] : []), ...D.floors.map((f) => ({ floor: f.id, label: f.label, sub: f.sub }))];

  // 画面の文言（年に関係しないもの）。日付・会場・注意書きなど、年ごとに変わるものはデータ側
  const TEXT = {
    floors: "会場",
    legend: { sale: "販売あり", exhibit: "展示・体験だけ", gift: "配布・特典だけ", official: "公式物販", show: "主催展示", goods: "グッズ販売・展示など", marche: "マルシェ" },
    zoom: { out: ["－", "縮小"], fit: ["全体", "全体を表示"], in: ["＋", "拡大"] },
    turn: ["回転", "マップを右へ90度回す"],
    osmOffline: "オフラインのため、地図は表示できません。",
  };

  const $ = (id) => document.getElementById(id);
  const { esc, glassBar } = window.TT_UTIL; // カレンダーの ../util.js
  const r1 = (n) => Math.round(n * 10) / 10;
  const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const narrow = matchMedia("(max-width: 640px)"); // スマホの幅（開いたときの拡大に使う）

  const { short, yen, onSale, boothBy, goodsAt, info, boothLabel, srcOf, noticeBy } = L;
  const booths = D.booths;
  // 中にブースがある売り場（ガチャコーナー）。ブース → 売り場
  const spotOf = new Map(Object.entries(D.spots).flatMap(([id, s]) => (s.booths ?? []).map((no) => [no, id])));
  // 凡例の色（goodslist.js のブースの種類の色と同じ）
  const theme = (kind) => `theme-${{ sale: "pink", exhibit: "violet", gift: "orange" }[kind]}`;

  // 書き写しの確認（27年のデータを作るときに、ブースの割り当て漏れ・重複・マップとのずれに気づけるように）。画面には出さない
  if (DEV) {
    const warn = (msg) => console.warn(`[map] ${msg}`);
    const ids = new Set();
    for (const g of D.goods) {
      if (ids.has(g.id)) warn(`グッズの id が重複: ${g.id}`);
      ids.add(g.id);
      if (g.booth && !boothBy.has(g.booth)) warn(`グッズのブースが一覧に無い: ${g.id} → ${g.booth}`);
      if (!g.booth && onSale(g) && g.floor && g.floor !== "公式物販" && g.floor !== "ライブ物販") warn(`売り場が「${g.floor}」なのにブースが無い: ${g.id}`);
      for (const n of srcOf(g)) if (n !== "official" && !noticeBy.has(n)) warn(`グッズの情報元が notices に無い: ${g.id} → ${n}`);
    }
    const onMap = new Set(D.floors.flatMap((f) => [...Object.keys(f.booths), ...f.areas.flatMap((a) => D.spots[a.spot]?.booths ?? [])]));
    for (const b of booths) if (!onMap.has(b.no)) warn(`マップに無いブース: ${b.no}`);
    for (const no of onMap) if (!boothBy.has(no)) warn(`一覧に無いブースがマップにある: ${no}`);
  }

  // ---------- 会場マップ ----------
  const $map = $("gmMap");
  let floor = D.floors[0];
  let setFloorIndex = () => {};
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
    if (DEV) for (const [no, g] of big) {
      const t = tiles.find((x) => x.no === no);
      const edge = Math.min(g.x - vx, vx + vw - g.x - g.w, g.y - vy, vy + vh - g.y - g.h);
      if (edge < AISLE / 2) console.warn(`[map] ブース ${no} を大きくすると、マップの端に近すぎます（${r1(edge)}）`);
      for (const [no2, g2] of big) {
        if (no2 <= no) continue;
        const t2 = tiles.find((x) => x.no === no2);
        if (near(g, g2) && gapOf(t, t2) >= AISLE && gapOf(g, g2) < AISLE) console.warn(`[map] ブース ${no} と ${no2} の間の通路が狭すぎます（${r1(gapOf(g, g2))}）`);
      }
      for (const w of walls) if (near(g, w) && gapOf(g, w) < AISLE / 2) console.warn(`[map] ブース ${no} を大きくすると、売り場に近すぎます（${r1(gapOf(g, w))}）`);
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
            return text(c, tx, ty, /[ー－〜～（）()「」]/.test(c) ? ` transform="rotate(90 ${r1(tx)} ${r1(ty)})"` : "");
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
      // 元の大きさの四角と、ブース名が出るときの大きい四角（map.css で入れ替える）
      return `<g class="gm-tile theme-${info.get(no)?.theme ?? "pink"}" data-pick="${esc(no)}" tabindex="0" role="button" aria-label="${esc(L.TEXT.boothName(no) + (b ? `：${b.name}` : ""))}">
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
        <linearGradient id="gmPickedOrange" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="gm-svg__picked-orange-a"/><stop offset="1" class="gm-svg__picked-orange-b"/></linearGradient>
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
    markTabs();
    // マップの絵（SVG）と、拡大したときにブースの上に出す中身（HTML）を、同じ大きさの台に重ねる
    // ブースの配置が未発表のフロア（データの pending）は、絵をぼかして前にその文言（「準備中」）を出す（map.css の .is-pending）
    const pending = floor.pending ? `<p class="gm-pending">${esc(floor.pending)}</p>` : "";
    $map.innerHTML = `<div class="gm-canvas${pending ? " is-pending" : ""}">${mapSvg(shown)}<div class="gm-minis" aria-hidden="true">${labelsHtml(shown)}${minisHtml(shown)}</div>${pending}</div>`;
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
    markHits();
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
  function sizeMap(w = $map.clientWidth, hh = $map.clientHeight) {
    const $canvas = $map.firstElementChild;
    if (!$canvas) return;
    const [, , vw, vh] = shown.view;
    const fit = Math.min(w / vw, hh / vh);
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
    if (!$map.clientWidth) return void (inited = false); // 隠しているあいだは、見せたとき（show）にする
    zoom = 1;
    setZoom(1);
    if (!narrow.matches || rot) return;
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
  new ResizeObserver(() => {
    if (!$map.clientWidth) return; // 大きさが0のあいだは測らない
    if (!inited) return show(); // 大きさが0で読み込まれたときは、大きさが決まってから初めの拡大をする
    sizeMap();
    if (anchored) toCorner();
  }).observe($map);

  // 二本指で拡大縮小（カレンダーの時間割と同じ操作）。指の間の内容が動かないように、枠の中のスクロールで合わせる
  let pinch = null;
  // このマップの上で始まった指だけ（ev.touches は画面全体の指。一覧の指を数えると、別の列の指でピンチになってしまう）
  const mine = (ev) => [...ev.touches].filter((t) => $map.contains(t.target));
  const spread = (t) => ({
    d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY),
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
  });
  $map.addEventListener(
    "touchstart",
    (ev) => {
      if (mine(ev).length !== 2) return;
      drag = null; // 1本指の移動から、ピンチに切り替える
      anchored = false;
      const s = spread(mine(ev));
      const m = $map.getBoundingClientRect();
      pinch = { s, zoom, left: $map.scrollLeft, top: $map.scrollTop, ax: s.x - m.left, ay: s.y - m.top, raf: 0 };
    },
    { passive: true }
  );
  $map.addEventListener(
    "touchmove",
    (ev) => {
      if (!pinch || mine(ev).length !== 2) return;
      ev.preventDefault();
      const s = spread(mine(ev));
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
    if (!pinch || mine(ev).length >= 2) return;
    cancelAnimationFrame(pinch.raf);
    pinch = null;
    setZoom(zoom); // ボタンの状態を合わせる
  };
  $map.addEventListener("touchend", endPinch);
  $map.addEventListener("touchcancel", endPinch);

  // マウスのホイールは Google マップなどと同じく、カーソルの位置を中心に拡大縮小する
  $map.addEventListener(
    "wheel",
    (ev) => {
      if (!ev.deltaY) return;
      ev.preventDefault();
      const px = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? $map.clientHeight : 1; // 行・ページ単位の届き方を px にそろえる
      const m = $map.getBoundingClientRect();
      setZoom(zoom * Math.exp(-ev.deltaY * px * 0.0015), ev.clientX - m.left, ev.clientY - m.top); // マウスの1目盛り（約100px）で約1.16倍
    },
    { passive: false }
  );

  // 押したまま（タッチは1本指で）動かすと移動する。ブラウザのスクロールに任せると、動き始めの向きで縦か横に固定されて斜めに動かないので、自前で動かす。
  // 動かさずに離したときだけ、ブースを押したことにする。離す直前まで動かしていたら、その速さで少し流れる（慣性）。
  let drag = null;
  let glide = 0;
  const panBy = (dx, dy) => {
    anchored = false;
    $map.scrollLeft -= dx;
    $map.scrollTop -= dy;
  };
  const coast = (vx, vy) => {
    let prev = performance.now();
    const step = (now) => {
      const dt = Math.min(32, now - prev);
      prev = now;
      panBy(vx * dt, vy * dt);
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
    panBy(dx, dy);
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

  // 選んだブース・売り場をマップで強調する（ガチャコーナーとその中のブースは一緒に）
  function markPicked() {
    const ids = new Set(picked ? [picked, spotOf.get(picked), ...(D.spots[picked]?.booths ?? [])] : []);
    $map.querySelectorAll("[data-pick]").forEach((el) => {
      const on = ids.has(el.dataset.pick);
      el.classList.toggle("is-picked", on);
      if (el.hasAttribute("role")) el.setAttribute("aria-pressed", String(on));
    });
  }

  function pick(id, { toMap = false } = {}) {
    picked = id;
    markPicked();
    if (boothBy.has(id) || id === "official") history.replaceState(null, "", `#booth-${id}`);
    if (toMap) showOnMap(id);
  }

  // マップにあるブース・売り場か（中にブースがある売り場のブースは、その売り場）
  const onMap = (id) => {
    const key = spotOf.get(id) ?? id;
    return D.floors.some((x) => key in x.booths || x.areas.some((a) => a.spot === key));
  };

  // マップへ移る。ほかのフロアのブースならフロアを切り替え、拡大しているときはブースを枠のまん中に出す
  function showOnMap(id) {
    setOsm(false);
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

  // ---------- しぼり込み・検索の結果 ----------
  // 一覧で見えているカード（goods.js の setHits）。しぼり込み・検索中だけ、マップで当たらなかったところを薄くする
  let hits = new Set();
  let filtering = false;
  function markHits() {
    $map.classList.toggle("is-filtering", filtering);
    $map.querySelectorAll("[data-pick]").forEach((el) => {
      const id = el.dataset.pick;
      el.classList.toggle("is-hit", hits.has(id) || (D.spots[id]?.booths ?? []).some((no) => hits.has(no)));
    });
  }
  function setHits(next, active) {
    hits = next;
    filtering = active;
    markHits();
  }

  // ---------- 固定の文言 ----------
  function renderStatic() {
    $("gmZoom").innerHTML =
      `<button type="button" class="gm-turn" data-turn aria-label="${esc(TEXT.turn[1])}">${esc(TEXT.turn[0])}</button>` +
      Object.entries(TEXT.zoom)
        .map(([z, [label, aria]]) => `<button type="button" data-zoom="${z}" aria-label="${esc(aria)}">${esc(label)}</button>`)
        .join("");
    const $floors = $("gmFloors");
    $floors.hidden = TABS.length < 2;
    $floors.setAttribute("role", "tablist");
    $floors.setAttribute("aria-label", TEXT.floors);
    $floors.innerHTML = TABS.map(
      (t) =>
        `<button type="button" class="gm-chip gm-tab" role="tab" data-floor="${esc(t.floor)}" aria-selected="${t.floor === floor.id}"><span>${esc(t.label)}</span>${t.sub ? `<small>${esc(t.sub)}</small>` : ""}</button>`
    ).join("");
    setFloorIndex = glassBar($floors, "[data-floor]", (el) => el.click());
  }

  // ---------- 操作 ----------
  // マップのブース・売り場を押すと、一覧のそのカードへ移る（カレンダーの「予定タップで詳細」と同じ。移るのは goods.js）
  const activate = (el) => {
    pick(el.dataset.pick);
    onActivate(el.dataset.pick);
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
  $("gmZoom").addEventListener("click", (ev) => {
    if (ev.target.closest("[data-turn]")) return turnMap();
    const el = ev.target.closest("[data-zoom]");
    if (!el) return;
    const z = el.dataset.zoom;
    setZoom(z === "in" ? zoom * ZOOM.step : z === "out" ? zoom / ZOOM.step : 1);
  });
  $("gmFloors").addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-floor]");
    if (!el) return;
    setFloor(el.dataset.floor);
    history.replaceState(null, "", `#map-${osm ? OSM : floor.id}`);
  });
  // 会場のタブとガラスの板を、今のフロア（周辺の地図を出しているときはそのタブ）に合わせる
  function markTabs() {
    const cur = osm ? OSM : floor.id;
    $("gmFloors")
      .querySelectorAll("[data-floor]")
      .forEach((b) => b.setAttribute("aria-selected", b.dataset.floor === cur));
    setFloorIndex(Math.max(0, TABS.findIndex((t) => t.floor === cur)));
  }
  // 周辺の地図（OpenStreetMap の地図画像を Leaflet で出し、会場にピンを立てる。拡大縮小・移動は地図の中でできる）。会場マップ・凡例・操作のボタンの代わりに出す（map.css の .is-osm）。
  // 地図の画像は Service Worker が保存しないので、オフラインでは出せない。Leaflet はタブを開いたときにオンラインなら読み込んで地図を作り、オフラインならその旨を出す（オンラインに戻ったら作る）
  const LEAFLET = {
    js: ["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js", "sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH"],
    css: ["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css", "sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H"],
  };
  const loadLeaflet = () =>
    (loadLeaflet.p ??= new Promise((ok, ng) => {
      const css = Object.assign(document.createElement("link"), { rel: "stylesheet", href: LEAFLET.css[0], integrity: LEAFLET.css[1], crossOrigin: "anonymous" });
      const js = Object.assign(document.createElement("script"), { src: LEAFLET.js[0], integrity: LEAFLET.js[1], crossOrigin: "anonymous", onload: ok });
      js.onerror = () => {
        loadLeaflet.p = null; // 次に開いたときにもう一度読む
        js.remove();
        ng();
      };
      document.head.append(css, js);
    }));
  const $osm = $("gmOsm");
  let osm = false;
  let lmap = null;
  const osmMessage = () => ($osm.innerHTML = `<p class="gm-osm__off">${esc(TEXT.osmOffline)}</p>`);
  async function fillOsm() {
    if (!osm) return;
    if (lmap) return lmap.invalidateSize(); // 隠していたあいだに枠の大きさが変わっていることがある
    if (!navigator.onLine) return osmMessage();
    try {
      await loadLeaflet();
    } catch {
      return osmMessage();
    }
    if (lmap) return;
    $osm.innerHTML = "";
    const L = window.L;
    const [w, s, e, n] = D.osm.bbox;
    lmap = L.map($osm, { zoomSnap: 0.25 }).fitBounds([[s, w], [n, e]]);
    // 右下の帰属表示のリンクは、ほかの外部リンクと同じく新しいタブ（PWA ではアプリ内ブラウザ）で開く（Leaflet の既定のリンクは同じ画面で移ってしまう）
    lmap.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(lmap);
    // ピン：カレンダーの会場の記号（A・B…）と名前
    for (const p of D.osm.pins ?? []) {
      const icon = L.divIcon({ className: "gm-pin", html: `<span><b>${esc(p.letter)}</b></span>`, iconSize: [28, 28], iconAnchor: [14, 34] }); // しずく形の先（まん中から下へ約20px）が場所
      L.marker(p.at, { icon, title: p.name }).addTo(lmap).bindTooltip(esc(p.name), { permanent: true, direction: "right", offset: [14, -20], className: "gm-pin__label" });
    }
    new ResizeObserver(() => $osm.clientWidth && lmap.invalidateSize()).observe($osm);
  }
  addEventListener("online", fillOsm);
  function setOsm(on) {
    if (on === osm) return;
    osm = on;
    $("gmMapbox").classList.toggle("is-osm", on);
    markTabs();
    fillOsm();
  }
  // フロアを切り替える（#map-○○ で開いたときも）
  function setFloor(id) {
    if (id === OSM && D.osm) {
      setOsm(true);
      return true;
    }
    const f = D.floors.find((x) => x.id === id);
    if (!f) return false;
    setOsm(false);
    if (f !== floor) {
      floor = f;
      renderMap();
      initialZoom();
    }
    return true;
  }

  // マップを右へ90度ずつ回す（rot は回した回数。0〜3）。絵を回すのではなく、データの座標を回してから描くので、文字は立ったまま。
  // 回すあいだは文字を消し、TURN ms かけて回してから文字を出す（map.css の .is-turning）。
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
  // ---------- 開始とサイズ更新 ----------
  // 読み込み時に大きさが0だったときは、見えたとき（ResizeObserver）に初めの拡大率（initialZoom）にする
  let inited = false;
  function show() {
    window.GM_SYNC?.(); // カレンダーの中なら、下のバーに重なる高さを測り直す
    if (!$map.clientWidth) return;
    if (!inited) {
      inited = true;
      initialZoom();
      return;
    }
    sizeMap();
    if (anchored) toCorner();
  }

  // ---------- 開始 ----------
  renderStatic();
  renderMap();
  if (D.osm) setOsm(true);
  show();

  return { pick, showOnMap, onMap, setHits, setFloor, show, isPicked: (id) => picked === id };
};

// ---------- ページ（map/index.html） ----------
// 会場マップだけを画面いっぱいに出す。ブース・売り場を押すと、グッズのページ（../goods/）のそのカードへ移る。
// カレンダーの中（iframe）では、親（nav.js）にメッセージを送ってグッズのページに切り替えてもらい、取り次いでもらう（やりとりの中身は ../goods/goods.js の「ページどうしのやりとり」）。
//   送る：{ type: "booth", id }（グッズに切り替えてそのカードへ）／{ type: "ready" }（読み込み終わり）
//   受ける：{ type: "pick", id, show }（showならそのブースを枠のまん中へ）／{ type: "hits", hits, active }（しぼり込みの結果）
// 親が無いとき（このページを直接開いたとき）は、グッズのページを、ブースの番号つきのハッシュ（#booth-○○）で開く
(() => {
  const D = window.GM_DATA;
  if (!D) return;
  const EMBED = new URLSearchParams(location.search).has("embed"); // .is-embed は ../goods/embed.js が付ける
  const TALK = "goodsmap"; // nav.js・../goods/goods.js と合わせる
  const embedded = EMBED && parent !== window;
  const tell = (msg) => parent.postMessage({ sm27: TALK, ...msg }, location.origin);
  const toGoods = (id) => {
    if (embedded) return tell({ type: "booth", id });
    const url = new URL("../goods/", location.href);
    url.search = location.search;
    url.hash = id ? `#booth-${id}` : "";
    location.assign(url);
  };

  // 高さは dvh ではなく innerHeight で決める（map.css の --app-h）
  const resize = () => document.documentElement.style.setProperty("--app-h", `${innerHeight}px`);
  window.addEventListener("resize", resize);
  resize();

  // 一覧の部品（../goods/goodslist.js）から、ブース・グッズを整理したデータを受け取る
  const L = window.GM_LIST(D);
  const M = window.GM_MAP(D, L, { onActivate: toGoods });
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
  addEventListener("message", (ev) => {
    const m = ev.data;
    if (ev.origin !== location.origin || ev.source !== parent || m?.sm27 !== TALK) return;
    if (m.type === "pick") M.onMap(m.id) && M.pick(m.id, { toMap: m.show });
    else if (m.type === "hits") M.setHits(new Set(m.hits), m.active);
  });
  tell({ type: "ready" });
})();
