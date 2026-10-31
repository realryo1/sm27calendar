// グッズの一覧の部品（グッズマップ goodsmap.js と、グッズ一覧 goods.js（同じ index.html の ?page=goods）で共通）。
// 品の行・タグ・ブースのカード・公式物販のカード・売り場の記載なしのカード・カードの開け閉めを、どちらのページでも同じ形で作る。
// 使い方：const L = window.GM_LIST(window.GM_DATA, { boothNo })。boothNo(b) はカードの見出しのブースの番号の HTML（マップはボタン、グッズ一覧はマップへのリンク）
window.GM_LIST = (D, { boothNo }) => {
  const { esc } = window.TT_UTIL; // カレンダーの ../util.js

  // 一覧の文言（年に関係しないもの）
  const TEXT = {
    // カードの中の見出し
    kinds: { sale: "販売", intro: "公式掲載", exhibit: "展示・体験", gift: "配布・特典" },
    // 品名の前のタグ。情報元（ブースの品だけ。公式物販は公式の一覧に載るものだけなので付けない）
    tags: { official: "公式", maker: "企業" },
    noPrice: "価格未掲載",
    notSold: "会場では販売なし",
    count: (n) => `${n}点`,
    officialLead: "公式グッズの売り場です。商品の写真や詳しい説明は、公式のグッズ一覧で見られます。",
    officialLink: "公式のグッズ一覧",
    loose: "売り場の記載がないグッズ",
    looseLead: "公式のグッズ一覧ではウイングベイで扱うとあるものの、売り場が書かれていません。",
    boothName: (no) => `ブース${no}`,
    showOnMap: (name) => `${name}をマップで見る`,
  };

  const yen = (n) => `¥${n.toLocaleString("ja-JP")}`;
  // 品名の先頭の「SNOW MIKU 2026」は、ほとんどに付くので表示では省く（検索は元の名前で）
  const short = (name) => name.replace(/^「?SNOW MIKU \d{4}」?\s*/, "");
  // 検索用：全角半角・大文字小文字・カタカナとひらがなの違いと、空白・中黒を無視する
  const norm = (s) =>
    String(s)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s・]/g, "");
  // Map.groupBy の代わり（iOS 17.3 以前にも無いため）
  const groupBy = (list, key) => list.reduce((m, x) => m.set(key(x), [...(m.get(key(x)) ?? []), x]), new Map());

  // ---------- データの整理 ----------
  const booths = D.booths;
  const boothBy = new Map(booths.map((b) => [b.no, b]));
  const noticeBy = new Map((D.notices ?? []).map((n) => [n.id, n]));
  // 情報元：src が無いグッズは公式のグッズ一覧だけに載るもの。url が無ければ先頭の情報元（企業のお品書きなど）へリンクする
  const srcOf = (g) => g.src ?? ["official"];
  const urlOf = (g) => g.url ?? noticeBy.get(srcOf(g)[0])?.url;
  // 会場（ウイングベイ・チ・カ・ホ）で売るか
  const onSale = (g) => g.places.some((p) => p === "wingbay" || p === "chikaho");
  // 売り場ごとに分ける：ブース／公式物販／ライブ物販／売り場の記載なし（会場で売らず、ブースで展示もしないものは出さない）
  const goodsAt = new Map();
  const official = [];
  const live = [];
  const loose = [];
  for (const g of D.goods) {
    if (g.booth) goodsAt.set(g.booth, [...(goodsAt.get(g.booth) ?? []), g]);
    else if (g.floor === "公式物販") official.push(g);
    else if (g.floor === "ライブ物販") live.push(g);
    else if (onSale(g)) loose.push(g);
  }
  // ブースで売る品（タグの順に並べる。下の byTags）
  const saleOf = (no) => (goodsAt.get(no) ?? []).filter(onSale).sort(byTags({ src: true }));

  // ブースの種類と色。マップとカードの色は先頭のもの（販売＞展示・体験＞配布・特典）
  const THEME = { sale: "pink", exhibit: "violet", gift: "orange" }; // 下の BLOCK_THEME と同じ色
  const boothText = (b) => [b.name, b.short, b.org, b.label].filter(Boolean).join("|");
  const info = new Map(
    booths.map((b) => {
      const gs = goodsAt.get(b.no) ?? [];
      const kinds = [
        (gs.some(onSale) || b.more?.length) && "sale",
        (gs.some((g) => !onSale(g)) || b.shows?.length) && "exhibit",
        b.gifts?.length && "gift",
      ].filter(Boolean);
      const words = [boothText(b), ...gs.flatMap((g) => [g.name, g.maker]), ...(b.more ?? []), ...(b.shows ?? []), ...(b.gifts ?? []), ...(b.notes ?? [])];
      return [b.no, { kinds, theme: THEME[kinds[0] ?? "sale"], text: norm(words.filter(Boolean).join("|")) }];
    })
  );
  const boothLabel = (b) => b.label ?? b.no;
  const boothName = (b) => b.label ?? TEXT.boothName(b.no);

  // ---------- 品の行とタグ ----------
  // タグはどれも同じ大きさ（goodsmap.css の .gm-tag）で、品名の前に TAG_ORDER の順に並べる：
  // 限定＞企業＞公式＞HMV＞スカイタウン＞先行＞受注（限定・先行・受注はデータの note、企業・公式は情報元でブースの品だけ、HMV・スカイタウンは places）。
  // TAG_ORDER に無いもの（チ・カ・ホ以外の売り場・ほかの note）は最後。会場（ウイングベイ・チ・カ・ホ）と、その節の売り場（here。ライブ会場など）のタグは出さない。
  // カードの中の品もこの順に並べる（限定のある品が先、次に企業のタグのある品…。byTags）
  const TAG_ORDER = ["限定", "maker", "official", "hmv", "skytown", "先行", "受注"];
  const rank = (k) => (TAG_ORDER.includes(k) ? TAG_ORDER.indexOf(k) : TAG_ORDER.length);
  const tagKeys = (g, { src = false, here = [] } = {}) =>
    [
      g.note,
      src && srcOf(g).some((id) => id !== "official") && "maker",
      src && srcOf(g).includes("official") && "official",
      ...g.places.filter((p) => p !== "wingbay" && p !== "chikaho" && !here.includes(p)),
    ]
      .filter(Boolean)
      .sort((a, b) => rank(a) - rank(b));
  function byTags(opts) {
    return (a, b) => {
      const ka = tagKeys(a, opts);
      const kb = tagKeys(b, opts);
      for (const k of TAG_ORDER) if (ka.includes(k) !== kb.includes(k)) return ka.includes(k) ? -1 : 1;
      return 0;
    };
  }
  const tag = (kind, text) => `<span class="gm-tag gm-tag--${esc(kind)}">${esc(text)}</span>`;
  const tagHtml = (k) =>
    k === "maker" || k === "official" ? tag(k, TEXT.tags[k]) : k in D.places ? tag(k, D.places[k]) : tag("note", k);
  const tagsOf = (g, opts) => tagKeys(g, opts).map(tagHtml).join("");
  const priceOf = (g) => (g.price == null ? "" : `<span class="gm-price">${g.unit ? `<small>${esc(g.unit)}</small>` : ""}${yen(g.price)}</span>`);

  // 品の1行：左に品名とタグ（折り返す）、右に値段。data-text は検索用（品名・会社名・ブース名）
  const itemRow = (text, body, price = "", mod = "") =>
    `<li class="gm-item${mod}" data-text="${esc(norm(text))}"><span class="gm-item__body">${body}</span>${price}</li>`;
  const goodsLink = (g) => `<a class="gm-item__name" href="${esc(urlOf(g))}" target="_blank" rel="noopener">${esc(short(g.name))}</a>`;
  const goodsText = (g) => `${g.name}|${g.maker}|${g.booth ? boothText(boothBy.get(g.booth)) : ""}`;
  // 売る品。opts は tagKeys と同じ（src: 情報元のタグを付ける、here: 出さない売り場）
  const goodsRow = (g, opts) => itemRow(goodsText(g), tagsOf(g, opts) + goodsLink(g), priceOf(g));
  // ブースで売る品（情報元のタグ付き）
  const boothRow = (g) => goodsRow(g, { src: true });
  // ブースで展示だけする品（会場では売らない）。ほかで売るなら、その売り場のタグ（スカイタウンなど）を付け、どこでも売らないなら「会場では販売なし」
  const showRow = (g) => itemRow(goodsText(g), (g.places.length ? "" : tag("no", TEXT.notSold)) + tagsOf(g) + goodsLink(g), priceOf(g));
  // 品名・展示・配布などの文だけの行（値段は公式に無い）
  const textRow = (t, { note = "", b } = {}) =>
    itemRow(`${t}|${b ? boothText(b) : ""}`, `<span class="gm-item__name">${esc(t)}</span>`, note ? `<span class="gm-price gm-price--none">${esc(note)}</span>` : "", " gm-item--text");
  // カードの中の見出しと品のまとまり（色は種類ごと：販売＝ピンク・公式掲載＝金・展示・体験＝紫・配布・特典＝オレンジ。カレンダーの style.css の .theme-○○）
  const BLOCK_THEME = { sale: "pink", intro: "gold", exhibit: "violet", gift: "orange" };
  const block = (kind, rows) =>
    rows.length ? `<div class="gm-block theme-${BLOCK_THEME[kind]}"><h4 class="gm-sub">${TEXT.kinds[kind]}</h4><ul class="gm-items">${rows.join("")}</ul></div>` : "";
  const md = (s) => s.split("-").slice(1).map(Number).join("/");
  const linkList = (links = []) =>
    links.length
      ? `<div class="gm-links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}${l.date ? `（${md(l.date)}）` : ""} ↗</a>`).join("")}</div>`
      : "";

  // ---------- カード ----------
  // カードは開け閉めできる（details.gm-fold。goodsmap.css）。初めは閉じていて、選んだ・しぼった・さがしたときに開く（fold）。
  // 見出しの行（summary）の右端に売る品の件数。見出しの中のブースの番号を押したときは開け閉めしない（summary の中のボタン・リンクは、それ自体として働くため）
  const foldCard = ({ theme, head, body, n = 0, id = "", no = id, cls = "" }) =>
    `<details class="gm-card gm-fold${cls} theme-${theme}"${id ? ` id="${esc(id)}" data-no="${esc(no)}"` : ""}>
      <summary class="gm-card__head">${head}${n ? `<span class="gm-fold__n">${TEXT.count(n)}</span>` : ""}</summary>
      ${body}
    </details>`;
  const titleHtml = (name, sub = "") => `<div class="gm-card__title"><h3 class="gm-card__name">${esc(name)}</h3>${sub}</div>`;

  // 出展ブースのカード：販売（公式の一覧に載る品が先。情報元のタグ付き）・公式掲載（公式のブース紹介にある品名）・展示・体験・配布・特典、補足、リンク（企業のお品書き・告知を先に）
  function boothCard(b) {
    const gs = goodsAt.get(b.no) ?? [];
    const sale = saleOf(b.no);
    return foldCard({
      theme: info.get(b.no).theme,
      id: `booth-${b.no}`,
      no: b.no,
      n: sale.length,
      head: boothNo(b) + titleHtml(b.name, b.org ? `<p class="gm-card__org">${esc(b.org)}</p>` : ""),
      body: `${block("sale", sale.map(boothRow))}
        ${block("intro", (b.more ?? []).map((t) => textRow(t, { note: TEXT.noPrice, b })))}
        ${block("exhibit", [...gs.filter((g) => !onSale(g)).map(showRow), ...(b.shows ?? []).map((t) => textRow(t, { b }))])}
        ${block("gift", (b.gifts ?? []).map((t) => textRow(t, { b })))}
        ${(b.notes ?? []).map((t) => `<p class="gm-note">${esc(t)}</p>`).join("")}
        ${linkList([...(D.notices ?? []).filter((n) => n.booth === b.no), ...(b.links ?? [])])}`,
    });
  }

  // 公式物販：1枚のカードに、グッズを会社ごとにまとめる（ブースではないため）。見出しはグラデーション（.gm-official）
  const officialTitle = D.spots?.official?.title ?? "公式物販";
  function officialCard() {
    if (!official.length) return "";
    const url = D.officialGoods ?? noticeBy.get("official")?.url;
    return `<details class="gm-card gm-official theme-gold" id="booth-official" data-no="official">
      <summary class="gm-official__head">
        <span class="gm-official__title">${esc(officialTitle)}</span>
        <span class="gm-official__count">${TEXT.count(official.length)}</span>
      </summary>
      <div class="gm-official__body">
        <p class="gm-note">${esc(TEXT.officialLead)}${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(TEXT.officialLink)} ↗</a>` : ""}</p>
        ${[...groupBy(official, (g) => g.maker)].map(([m, gs]) => `<h4 class="gm-official__maker">${esc(m)}</h4><ul class="gm-items">${gs.sort(byTags()).map((g) => goodsRow(g)).join("")}</ul>`).join("")}
      </div>
    </details>`;
  }

  function looseCard() {
    if (!loose.length) return "";
    return foldCard({
      theme: "indigo",
      id: "booth-loose",
      no: "loose",
      cls: " gm-loose",
      n: loose.length,
      head: titleHtml(TEXT.loose),
      body: `<p class="gm-note">${esc(TEXT.looseLead)}</p><ul class="gm-items theme-pink">${[...loose].sort(byTags()).map((g) => goodsRow(g)).join("")}</ul>`,
    });
  }

  // しぼり込み・検索中は、見えているカードを開く。外したら、そうして開いたカードだけ閉じる（自分で開いた・選んで開いたものは残す）
  function fold($el, on, active) {
    if (on && active && !$el.open) {
      $el.open = true;
      $el.dataset.auto = "";
    } else if (!active && "auto" in $el.dataset) {
      $el.open = false;
      delete $el.dataset.auto;
    }
  }
  // 選んで開く（しぼり込みを外しても閉じない）
  const openCard = ($el) => {
    $el.open = true;
    delete $el.dataset.auto;
  };

  return {
    TEXT, norm, short, yen, srcOf, urlOf, onSale, boothBy, noticeBy, goodsAt, official, live, loose, info, boothLabel, boothName,
    tag, byTags, goodsRow, textRow, block, linkList, foldCard, titleHtml, boothCard, officialCard, looseCard, fold, openCard,
  };
};
