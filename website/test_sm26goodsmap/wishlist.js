// ほしいものリスト（グッズマップ・グッズ一覧で共通）。品の行の左端の♡（goodslist.js の .gm-wish）で入れ、浮かぶボタンからリストを開く。
// リストは年ごとにブラウザ（localStorage の sm27-wish-年）に保存し、マップとグッズ一覧で同じものを使う（カレンダーの中の2つの iframe も storage イベントで合わせる）。
// まとめ方（タグ・ブース）とソート（値段・ブース）、個数を持ち、PDF はブラウザの印刷で、画像は印刷と同じ表を写して PNG で出す（印刷用の表 #gmWishPrint だけを印刷する。goodsmap.css の @media print）。
// リストはリンク（カレンダーの ?view=goods&wish=id.個数,…）にでき、PDF にはそのリンクと QR コードを載せる。リンクを開くと、今のリストに合わせるか置き換えるかを選んで読み込む。
// 使い方：ページの一覧を描いたあとに window.GM_WISH(GM_DATA, GM_LIST の戻り値)
window.GM_WISH = (D, L) => {
  const { esc } = window.TT_UTIL;
  const KEY = `sm27-wish-${D.year}`;
  const GROUP_KEY = "sm27-wish-group";
  const SORT_KEY = "sm27-wish-sort";

  const TEXT = {
    fab: "ほしいもの",
    title: "ほしいものリスト",
    close: "閉じる",
    // まとめ方：tag＝いちばん上のタグ（限定＞企業＞公式＞…）ごと、where＝ブース（売り場）ごと。ソート：まとまりの中の並び（値段は高い順、ブースはブースの順）
    groups: { tag: "タグ", where: "ブース" },
    groupLabel: "まとめ方",
    sorts: { price: "値段", where: "ブース" },
    sortLabel: "ソート",
    noTag: "タグなし",
    printOrder: (g, s) => `まとめ方：${g}／ソート：${s}`,
    empty: "まだ入っていません。品の行の♡を押すと入ります。",
    total: "合計",
    count: (n) => `${n}点`,
    noPrice: "価格未定",
    noPriceNote: (n) => `価格未定の品${n}点は合計に含みません`,
    minus: (name) => `${name}を1つ減らす`,
    plus: (name) => `${name}を1つ増やす`,
    remove: (name) => `${name}をリストから外す`,
    print: "PDFに保存（印刷）",
    copy: "リンクをコピー",
    copied: "コピーしました",
    copyPrompt: "このリンクをコピーしてください",
    clear: "すべて消す",
    // リンクから読み込む
    importTitle: "リンクのほしいものリスト",
    importLead: (n, q) => `${n}品（${q}点）が入ったリンクです。今のリストにどう入れますか？`,
    importMissing: (n) => `${n}品はこのページのデータに無いので入れません。`,
    importHave: (n) => `リストに${n}`,
    importMerge: "今のリストに合わせる",
    importReplace: "置き換える",
    importCancel: "読み込まない",
    clearConfirm: "ほしいものリストをすべて消しますか？",
    // 印刷（PDF）
    printTitle: (name) => `ほしいものリスト　${name}`,
    printMade: (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日に作成`,
    printNote: "SNOWMIKU2027非公式カレンダーで作成。価格は税込。売り場・価格は変わることがあります。",
    printCols: ["", "売り場", "品名", "単価", "個数", "小計"],
    printFile: (name) => `ほしいものリスト_${name}`,
    printLink: "QRコードかリンクから、このリストをスマホなどで開けます",
    printOpen: "このリストを開く",
    image: "画像で保存",
    imageFail: "画像を作れませんでした。通信できるところで、もう一度試してください。",
    imageNote: "画像を長押し（パソコンは右クリック）して保存してください。",
    imageAlt: "ほしいものリストの画像",
    download: "ダウンロード",
  };
  // QR コードを作るライブラリ（qrcode-generator 1.4.4、MIT）。リストを開いたときに読み込み始め、PDF を作るときに使う
  const QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
  const QR_SRI = "sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1";
  // 画像で保存：PDF（印刷）と同じ表を画像に写すライブラリ（html2canvas 1.4.1、MIT）。押したときに読み込む
  const H2C_SRC = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  const H2C_SRI = "sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H";

  const goodsBy = new Map(D.goods.map((g) => [g.id, g]));
  const yen = (n) => `¥${n.toLocaleString("ja-JP")}`;

  // ---------- 保存（{ グッズの id: 個数 }。データに無くなった id は捨てる） ----------
  const load = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      return Object.fromEntries(Object.entries(v).filter(([id, n]) => goodsBy.has(id) && n > 0));
    } catch {
      return {};
    }
  };
  let wish = load();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(wish));
    } catch {
      // 保存できない（プライベートブラウズなど）ときは、このページを開いているあいだだけ覚える
    }
  };
  const loadPref = (key, list, def) => {
    try {
      const v = localStorage.getItem(key);
      return v in list ? v : def;
    } catch {
      return def;
    }
  };
  let group = loadPref(GROUP_KEY, TEXT.groups, "where");
  let sort = loadPref(SORT_KEY, TEXT.sorts, "price");

  // ---------- リンク（カレンダーの ?view=goods&wish=id.個数,…。1個なら .個数 を省く。年は今のページの ?year= を引き継ぐ） ----------
  // カレンダー（このページの1つ上）を開き、カレンダーの nav.js がグッズの表示へ wish・year を渡す（data.js の nav の pass）
  const params = new URLSearchParams(location.search);
  function shareUrl() {
    const u = new URL("../", location.href);
    const q = new URLSearchParams({ view: "goods" });
    if (params.get("year")) q.set("year", params.get("year"));
    const list = Object.entries(wish).map(([id, n]) => encodeURIComponent(id) + (n > 1 ? `.${n}` : ""));
    return `${u.href}?${q}&wish=${list.join(",")}`;
  }
  // リンクの wish を読む（{ id: 個数 } と、データに無い品の数）
  function parseWish(v) {
    const got = {};
    let missing = 0;
    for (const part of v.split(",").filter(Boolean)) {
      const i = part.lastIndexOf(".");
      const id = i > 0 ? part.slice(0, i) : part;
      const n = i > 0 ? parseInt(part.slice(i + 1), 10) : 1;
      if (!goodsBy.has(id)) missing++;
      else if (n > 0) got[id] = Math.min(99, n);
    }
    return { got, missing };
  }

  // ---------- 並べ替え ----------
  const byPrice = (a, b) => (b.price ?? -1) - (a.price ?? -1);
  const byWhere = (a, b) => {
    const wa = L.whereOf(a);
    const wb = L.whereOf(b);
    return wa.order - wb.order || wa.sub - wb.sub;
  };
  const tagOpts = (g) => ({ src: !!g.booth });
  const byTags = (a, b) => L.byTags({ src: true })(a, b);
  // タグの名前と色（goodslist.js の tagHtml と同じ決まり。タグの無いまとまりは「タグなし」）
  const tagName = (k) => (!k ? TEXT.noTag : k === "maker" || k === "official" ? L.TEXT.tags[k] : D.places[k] ?? k);
  const tagKind = (k) => (!k ? "" : k === "maker" || k === "official" || k in D.places ? k : "note");
  // まとまり（[{ head: 見出しの文字, kind: 見出しの帯の色（タグでまとめたときのタグの色。goodsmap.css の .gm-tag--○○）, items }]）。
  // まとめ方で分け、まとまりの順はタグなら TAG_ORDER、ブースならブースの順。中はソートで並べる。
  // map は { id: 個数 }（既定は今のリスト。リンクから読み込む前のプレビューでも使う）
  function groupsOf(map = wish) {
    const within = sort === "price" ? (a, b) => byPrice(a, b) || byWhere(a, b) || byTags(a, b) : (a, b) => byWhere(a, b) || byTags(a, b) || byPrice(a, b);
    const keyOf = group === "tag" ? (g) => L.tagKeys(g, tagOpts(g))[0] ?? "" : (g) => L.whereOf(g).label;
    const groups = new Map();
    for (const id of Object.keys(map)) {
      const g = goodsBy.get(id);
      groups.set(keyOf(g), [...(groups.get(keyOf(g)) ?? []), g]);
    }
    const order = ([k, list]) => {
      if (group === "tag") return k ? L.rank(k) : Infinity;
      const w = L.whereOf(list[0]);
      return w.order * 10000 + w.sub;
    };
    return [...groups]
      .sort((a, b) => order(a) - order(b))
      .map(([k, list]) => ({ head: group === "tag" ? tagName(k) : k, kind: group === "tag" ? tagKind(k) : "", items: list.sort(within) }));
  }
  const totals = (map = wish) => {
    let n = 0;
    let sum = 0;
    let unpriced = 0;
    for (const [id, q] of Object.entries(map)) {
      const g = goodsBy.get(id);
      n += q;
      if (g.price == null) unpriced += q;
      else sum += g.price * q;
    }
    return { n, sum, unpriced };
  };

  // ---------- 浮かぶボタンとリスト（dialog） ----------
  const $fab = document.createElement("button");
  $fab.type = "button";
  $fab.className = "gm-wishfab";
  const $dlg = document.createElement("dialog");
  $dlg.className = "gm-wishlist";
  $dlg.setAttribute("aria-label", TEXT.title);
  const $print = document.createElement("div");
  $print.className = "gm-wishprint";
  $print.id = "gmWishPrint";
  document.body.append($fab, $dlg, $print);

  const short = (g) => L.short(g.name);
  function rowHtml(g, showWhere) {
    const q = wish[g.id];
    const name = short(g);
    return `<li class="gm-wishitem">
      <div class="gm-wishitem__body">
        ${showWhere ? `<p class="gm-wishitem__where">${esc(L.whereOf(g).label)}</p>` : ""}
        <p class="gm-wishitem__name">${L.tagsOf(g, tagOpts(g))}<a href="${esc(L.urlOf(g))}" target="_blank" rel="noopener">${esc(name)}</a></p>
      </div>
      <div class="gm-wishitem__buy">
        <span class="gm-wishitem__price">${g.price == null ? esc(TEXT.noPrice) : `${g.unit ? `<small>${esc(g.unit)}</small>` : ""}${yen(g.price)}`}</span>
        <span class="gm-wishitem__qty">
          <button type="button" data-qty="-1" data-id="${esc(g.id)}" aria-label="${esc(q > 1 ? TEXT.minus(name) : TEXT.remove(name))}">${q > 1 ? "−" : "×"}</button>
          <b>${q}</b>
          <button type="button" data-qty="1" data-id="${esc(g.id)}" aria-label="${esc(TEXT.plus(name))}">＋</button>
        </span>
      </div>
    </li>`;
  }
  // まとまりごとに見出しと小計。タグでまとめたときは、前の品とブースが変わったときだけブースを書く（同じブースが続くときは1回）。
  // row(g, showWhere) は1行の HTML、map は個数（小計に使う）。リストとリンクのプレビューで共通
  const subOf = (list, map) => list.reduce((n, g) => n + (g.price ?? 0) * map[g.id], 0);
  function listHtml(row = rowHtml, map = wish) {
    return groupsOf(map)
      .map((gr) => {
        let prev = null;
        const rows = gr.items.map((g) => {
          const label = L.whereOf(g).label;
          const html = row(g, group === "tag" && label !== prev);
          prev = label;
          return html;
        });
        return `<section class="gm-wishgroup">
          <h3 class="gm-wishgroup__head${gr.kind ? ` gm-tag--${esc(gr.kind)}` : ""}"><span>${esc(gr.head)}</span><span>${yen(subOf(gr.items, map))}</span></h3>
          <ul class="gm-wishgroup__items">${rows.join("")}</ul>
        </section>`;
      })
      .join("");
  }
  const optHtml = (attr, label, list, now) =>
    `<div class="gm-wishlist__opt"><span>${esc(label)}</span><div class="gm-chips" role="group" aria-label="${esc(label)}">${Object.entries(list)
      .map(([k, v]) => `<button type="button" class="gm-chip" data-${attr}="${k}" aria-pressed="${k === now}">${esc(v)}</button>`)
      .join("")}</div></div>`;
  function renderDialog() {
    const gs = Object.keys(wish);
    const t = totals();
    $dlg.innerHTML = `<div class="gm-wishlist__inner">
      <header class="gm-wishlist__head">
        <h2 class="gm-wishlist__title">${esc(TEXT.title)}</h2>
        <button type="button" class="gm-wishlist__close" data-close aria-label="${esc(TEXT.close)}"></button>
      </header>
      <div class="gm-wishlist__sorts">${optHtml("group", TEXT.groupLabel, TEXT.groups, group)}${optHtml("sort", TEXT.sortLabel, TEXT.sorts, sort)}</div>
      <div class="gm-wishlist__body">${gs.length ? listHtml() : `<p class="gm-wishlist__empty">${esc(TEXT.empty)}</p>`}</div>
      <footer class="gm-wishlist__foot">
        <p class="gm-wishlist__total"><span>${esc(TEXT.total)} ${esc(TEXT.count(t.n))}</span><b>${yen(t.sum)}</b></p>
        ${t.unpriced ? `<p class="gm-wishlist__note">${esc(TEXT.noPriceNote(t.unpriced))}</p>` : ""}
        <div class="gm-wishlist__actions">
          <button type="button" class="gm-wishlist__clear" data-clear${gs.length ? "" : " disabled"}>${esc(TEXT.clear)}</button>
          <button type="button" class="gm-wishlist__copy" data-copy${gs.length ? "" : " disabled"}>${esc(TEXT.copy)}</button>
          <button type="button" class="gm-wishlist__print" data-print${gs.length ? "" : " disabled"}>${esc(TEXT.print)}</button>
          <button type="button" class="gm-wishlist__print gm-wishlist__image" data-image${gs.length ? "" : " disabled"}>${esc(TEXT.image)}</button>
        </div>
      </footer>
    </div>`;
  }

  // 品の行の♡と、浮かぶボタンの件数・合計を今のリストに合わせる
  function refresh() {
    document.querySelectorAll(".gm-wish[data-wish]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wish in wish)));
    const t = totals();
    $fab.innerHTML = `<span class="gm-wishfab__icon" aria-hidden="true"></span><span class="gm-wishfab__label">${esc(TEXT.fab)}</span>${
      t.n ? `<span class="gm-wishfab__n">${esc(TEXT.count(t.n))}</span><span class="gm-wishfab__sum">${yen(t.sum)}</span>` : ""
    }`;
    $fab.classList.toggle("is-empty", !t.n);
    if ($dlg.open) renderDialog();
  }
  const setQty = (id, q) => {
    if (q > 0) wish[id] = q;
    else delete wish[id];
    save();
    refresh();
  };

  // ---------- 操作 ----------
  // ♡はどの一覧の行でも（あとから描き直した行でも）効くように、ページ全体で受ける。押すと入れる（1個）／外す
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest(".gm-wish[data-wish]");
    if (!b) return;
    ev.preventDefault();
    ev.stopPropagation(); // カードの見出しの開け閉め・マップへの移動などに渡さない
    setQty(b.dataset.wish, b.dataset.wish in wish ? 0 : 1);
  });
  $fab.addEventListener("click", () => {
    renderDialog();
    $dlg.showModal();
    loadQr().catch(() => {}); // PDF を作るときに待たないよう、先に読み込んでおく
  });
  $dlg.addEventListener("click", (ev) => {
    if (ev.target === $dlg || ev.target.closest("[data-close]")) return $dlg.close(); // 外側（うしろの暗いところ）か × で閉じる
    const q = ev.target.closest("[data-qty]");
    if (q) return setQty(q.dataset.id, (wish[q.dataset.id] ?? 0) + Number(q.dataset.qty));
    const o = ev.target.closest("[data-group], [data-sort]");
    if (o) {
      if (o.dataset.group) group = o.dataset.group;
      else sort = o.dataset.sort;
      try {
        localStorage.setItem(GROUP_KEY, group);
        localStorage.setItem(SORT_KEY, sort);
      } catch {}
      return renderDialog();
    }
    if (ev.target.closest("[data-clear]") && confirm(TEXT.clearConfirm)) {
      wish = {};
      save();
      return refresh();
    }
    const c = ev.target.closest("[data-copy]");
    if (c) return copyLink(c);
    if (ev.target.closest("[data-print]")) printList();
    const im = ev.target.closest("[data-image]");
    if (im) saveImage(im);
  });
  // リンクをコピー（できないブラウザでは、選んでコピーできる欄で見せる）
  async function copyLink($b) {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      $b.textContent = TEXT.copied;
      setTimeout(() => ($b.textContent = TEXT.copy), 2000);
    } catch {
      prompt(TEXT.copyPrompt, url);
    }
  }
  // ほかのページ（カレンダーの中のもう1つの iframe・別のタブ）で変えたら合わせる
  window.addEventListener("storage", (ev) => {
    if (ev.key !== KEY) return;
    wish = load();
    refresh();
  });

  // ---------- PDF（印刷） ----------
  let qrLib = null;
  const loadQr = () =>
    (qrLib ??= new Promise((ok, ng) => {
      if (window.qrcode) return ok(window.qrcode);
      const $s = document.createElement("script");
      $s.src = QR_SRC;
      $s.integrity = QR_SRI;
      $s.crossOrigin = "anonymous";
      $s.onload = () => ok(window.qrcode);
      $s.onerror = () => {
        qrLib = null; // 次に押したときにもう一度試す
        ng(new Error("qrcode"));
      };
      document.head.append($s);
    }));
  // QR コードの SVG（ライブラリを3秒待っても読めなければ、QR コード無しで印刷する）
  async function qrSvg(url) {
    try {
      const qrcode = await Promise.race([loadQr(), new Promise((_, ng) => setTimeout(ng, 3000))]);
      const qr = qrcode(0, "M");
      qr.addData(url);
      qr.make();
      return qr.createSvgTag(4, 0);
    } catch {
      return "";
    }
  }
  // 印刷用の表（#gmWishPrint）を作る。PDF（印刷）と画像の両方がこれを使う。
  // 右上にリストを開くリンクと QR コード（PDF に保存してもリンクは押せる）
  async function buildPrint() {
    const url = shareUrl();
    const qr = await qrSvg(url);
    const t = totals();
    const name = D.event?.name ?? "";
    // まとまりごとに見出しの行（小計つき）と品の行。ブースでまとめたときは見出しがブースなので、売り場の列を出さない。
    // タグでまとめたときは、見出しの行の背景をそのタグの薄い色にする（goodsmap.css の --tag-bg）
    const showWhere = group === "tag";
    const cols = TEXT.printCols.filter((_, i) => showWhere || i !== 1);
    const row = (g) => {
      const q = wish[g.id];
      return `<tr>
          <td class="gm-wishprint__check">□</td>
          ${showWhere ? `<td>${esc(L.whereOf(g).label)}</td>` : ""}
          <td>${L.tagsOf(g, tagOpts(g))}${esc(short(g))}</td>
          <td class="gm-wishprint__num">${g.price == null ? esc(TEXT.noPrice) : `${g.unit ? esc(g.unit) : ""}${yen(g.price)}`}</td>
          <td class="gm-wishprint__num">${q}</td>
          <td class="gm-wishprint__num">${g.price == null ? "" : yen(g.price * q)}</td>
        </tr>`;
    };
    const bodies = groupsOf()
      .map(
        (gr) => `<tbody>
          <tr class="gm-wishprint__group${gr.kind ? ` gm-tag--${esc(gr.kind)}` : ""}"><td colspan="${cols.length - 1}">${esc(gr.head)}</td><td class="gm-wishprint__num">${yen(subOf(gr.items, wish))}</td></tr>
          ${gr.items.map(row).join("")}
        </tbody>`
      )
      .join("");
    $print.innerHTML = `<header class="gm-wishprint__head">
        <div>
          <h1>${esc(TEXT.printTitle(name))}</h1>
          <p class="gm-wishprint__meta">${esc(TEXT.printMade(new Date()))}　${esc(TEXT.printOrder(TEXT.groups[group], TEXT.sorts[sort]))}</p>
        </div>
        <div class="gm-wishprint__share">
          ${qr ? `<div class="gm-wishprint__qr">${qr}</div>` : ""}
          <p>${esc(TEXT.printLink)}<br><a href="${esc(url)}">${esc(TEXT.printOpen)}</a></p>
        </div>
      </header>
      <table>
        <thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
        ${bodies}
        <tfoot><tr><td></td><td colspan="${cols.length - 3}">${esc(TEXT.total)}${t.unpriced ? `（${esc(TEXT.noPriceNote(t.unpriced))}）` : ""}</td><td class="gm-wishprint__num">${t.n}</td><td class="gm-wishprint__num">${yen(t.sum)}</td></tr></tfoot>
      </table>
      <p class="gm-wishprint__note">${esc(TEXT.printNote)}</p>`;
  }
  // リストを閉じてから印刷する。ファイル名に使われるので、印刷のあいだだけページのタイトルを変える
  async function printList() {
    await buildPrint();
    $dlg.close();
    const title = document.title;
    document.title = TEXT.printFile(D.event?.name ?? "");
    window.addEventListener("afterprint", () => (document.title = title), { once: true });
    window.print();
  }

  // ---------- 画像で保存 ----------
  // PDF（印刷）と同じ表（buildPrint）を、画面の外に A4 の幅で出して html2canvas で写し、PNG にする（goodsmap.css の .gm-wishprint.is-capture）。
  // できた画像はそのまま画面に出し、長押し（パソコンは右クリック）で保存してもらう（共有シートは、ホーム画面に追加した PWA でうまく動かないため）。パソコン向けにダウンロードのボタンも置く
  let h2cLib = null;
  const loadH2c = () =>
    (h2cLib ??= new Promise((ok, ng) => {
      if (window.html2canvas) return ok(window.html2canvas);
      const $s = document.createElement("script");
      $s.src = H2C_SRC;
      $s.integrity = H2C_SRI;
      $s.crossOrigin = "anonymous";
      $s.onload = () => ok(window.html2canvas);
      $s.onerror = () => {
        h2cLib = null; // 次に押したときにもう一度試す
        ng(new Error("html2canvas"));
      };
      document.head.append($s);
    }));
  async function saveImage($b) {
    $b.disabled = true;
    try {
      const [h2c] = await Promise.all([loadH2c(), buildPrint(), document.fonts?.ready]);
      $print.classList.add("is-capture");
      const canvas = await h2c($print, { scale: 2, backgroundColor: "#ffffff", logging: false });
      // data URL にする（iPhone で長押しの「写真に保存」が確実に出るように）
      showImage(canvas.toDataURL("image/png"), `${TEXT.printFile(D.event?.name ?? "")}.png`);
    } catch {
      alert(TEXT.imageFail);
    } finally {
      $print.classList.remove("is-capture");
      $b.disabled = false;
    }
  }

  // 画像を出す（リストの上に重ねる。× か外側で閉じるとリストに戻る）
  function showImage(src, name) {
    const $img = document.createElement("dialog");
    $img.className = "gm-wishlist gm-wishimg";
    $img.setAttribute("aria-label", TEXT.image);
    $img.innerHTML = `<div class="gm-wishlist__inner">
      <header class="gm-wishlist__head">
        <h2 class="gm-wishlist__title">${esc(TEXT.image)}</h2>
        <button type="button" class="gm-wishlist__close" data-close aria-label="${esc(TEXT.close)}"></button>
      </header>
      <p class="gm-wishimg__note">${esc(TEXT.imageNote)}</p>
      <div class="gm-wishlist__body gm-wishimg__body"><img src="${src}" alt="${esc(TEXT.imageAlt)}"></div>
      <div class="gm-wishlist__actions gm-wishimg__actions"><a class="gm-wishlist__print" href="${src}" download="${esc(name)}">${esc(TEXT.download)}</a></div>
    </div>`;
    document.body.append($img);
    $img.addEventListener("click", (ev) => {
      if (ev.target === $img || ev.target.closest("[data-close]")) $img.close();
    });
    $img.addEventListener("close", () => $img.remove());
    $img.showModal();
  }

  // ---------- リンクから読み込む ----------
  // ?wish= 付きで開いたとき。今のリストが空ならそのまま入れてリストを開き、空でなければ合わせるか置き換えるかを選ぶ。どちらでも URL から wish を消す
  function importFromUrl() {
    const v = params.get("wish");
    if (v == null) return;
    const u = new URL(location.href);
    u.searchParams.delete("wish");
    history.replaceState(null, "", u);
    const { got, missing } = parseWish(v);
    const ids = Object.keys(got);
    if (!ids.length) return;
    const apply = (mode) => {
      if (mode === "replace") wish = { ...got };
      else if (mode === "merge") for (const id of ids) wish[id] = Math.max(wish[id] ?? 0, got[id]); // 同じリンクを2回読んでも増えないよう、多い方
      else return;
      save();
      refresh();
      renderDialog();
      $dlg.showModal();
    };
    if (!Object.keys(wish).length) return apply("replace");
    // プレビュー：リンクの品を、リストと同じまとめ方・ソート（listHtml）で並べる。タグ・値段・個数を出し、今のリストに入っている品は品名のあとに薄く「リストに○」（縦を詰めるため、値段と個数は1段）
    const t = totals(got);
    const previewRow = (g, showWhere) => `<li class="gm-wishitem gm-wishitem--preview">
        ${showWhere ? `<p class="gm-wishitem__where">${esc(L.whereOf(g).label)}</p>` : ""}
        <p class="gm-wishitem__name">${L.tagsOf(g, tagOpts(g))}${esc(short(g))}${wish[g.id] ? `<span class="gm-wishitem__have">${esc(TEXT.importHave(wish[g.id]))}</span>` : ""}</p>
        <p class="gm-wishitem__buy"><span class="gm-wishitem__price">${g.price == null ? esc(TEXT.noPrice) : `${g.unit ? `<small>${esc(g.unit)}</small>` : ""}${yen(g.price)}`}</span><span class="gm-wishitem__n">×${got[g.id]}</span></p>
      </li>`;
    const preview = listHtml(previewRow, got);
    const $ask = document.createElement("dialog");
    $ask.className = "gm-wishlist gm-wishask";
    $ask.setAttribute("aria-label", TEXT.importTitle);
    $ask.innerHTML = `<div class="gm-wishlist__inner">
      <header class="gm-wishlist__head"><h2 class="gm-wishlist__title">${esc(TEXT.importTitle)}</h2></header>
      <div class="gm-wishask__lead">
        <p>${esc(TEXT.importLead(ids.length, t.n))}</p>
        ${missing ? `<p class="gm-wishlist__note">${esc(TEXT.importMissing(missing))}</p>` : ""}
      </div>
      <div class="gm-wishlist__body">${preview}</div>
      <div class="gm-wishlist__foot">
        <p class="gm-wishlist__total"><span>${esc(TEXT.total)} ${esc(TEXT.count(t.n))}</span><b>${yen(t.sum)}</b></p>
        ${t.unpriced ? `<p class="gm-wishlist__note">${esc(TEXT.noPriceNote(t.unpriced))}</p>` : ""}
      </div>
      <div class="gm-wishlist__actions gm-wishask__actions">
        <button type="button" class="gm-wishlist__print" data-imp="merge">${esc(TEXT.importMerge)}</button>
        <button type="button" class="gm-wishlist__copy" data-imp="replace">${esc(TEXT.importReplace)}</button>
        <button type="button" class="gm-wishlist__clear" data-imp="cancel">${esc(TEXT.importCancel)}</button>
      </div>
    </div>`;
    document.body.append($ask);
    $ask.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-imp]");
      if (!b) return;
      $ask.close();
      $ask.remove();
      apply(b.dataset.imp);
    });
    $ask.showModal();
  }

  refresh();
  importFromUrl();
};
