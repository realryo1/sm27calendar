// 運行情報（試験版）
// Cloudflare Worker（worker/）が5分ごとに集めた JSON を1本だけ取得して描画する。事業者サイトへは直接アクセスしない。
(() => {
  // Cloudflare Worker（worker/）の配信先。空にすると sample.json を表示する
  const ENDPOINT = "https://sm27-delay.realryo1.workers.dev/status.json";
  const REFRESH_MS = 60 * 1000;
  const STALE_MIN = 20; // これより古ければ「更新が止まっている」と表示

  const params = new URLSearchParams(location.search);
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  // ?sample でサンプル表示、手元確認のときだけ ?api=http://localhost:8787/status.json で取得先を差し替えられる
  const source = params.has("sample") || !ENDPOINT ? "sample.json" : (local && params.get("api")) || ENDPOINT;

  const $updated = document.getElementById("updated");
  const $banners = document.getElementById("banners");
  const $sections = document.getElementById("sections");
  const $reload = document.getElementById("reload");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // "2027-02-06T10:30:00+09:00" / "2027-02-06T10:14:03+0900" → "10:30"
  const hhmm = (iso) => (iso && /T(\d\d:\d\d)/.exec(iso)?.[1]) || "";

  const LABEL = {
    normal: "平常",
    delay: "遅れあり",
    suspended: "運休・見合わせ",
    unknown: "不明",
    offhours: "サービス時間外",
  };
  const badge = (status, label) => `<span class="dl-badge dl-badge--${esc(status)}">${esc(label || LABEL[status] || LABEL.unknown)}</span>`;

  // 取得に失敗した事業者：前回のデータに注意書きと公式リンクを添える
  function staleNote(svc) {
    if (svc.ok) return "";
    const last = svc.last_success_at ? `（最終取得 ${hhmm(svc.last_success_at)}）` : "";
    return `<div class="dl-warn">
      <p>情報元との通信が一時的に途切れています${esc(last)}。最新の状況は公式案内を確認してください。</p>
      <a class="dl-warn__btn" href="${esc(svc.url)}" target="_blank" rel="noopener">${esc(svc.name)} 公式の運行情報</a>
    </div>`;
  }

  // id（jr / subway / airport など）でカードにコーポレートカラーを付ける（delay.css の .dl-card--{id}）
  function card(id, svc, body, timeText) {
    const time = timeText ? `<span class="dl-card__time">${esc(timeText)}</span>` : "";
    // 情報元へのボタン。取得失敗時は staleNote に目立つ公式ボタンがあるので出さない
    const source = svc.ok
      ? `<a class="dl-source" href="${esc(svc.url)}" target="_blank" rel="noopener">情報元：${esc(svc.name)}</a>`
      : "";
    return `<section class="dl-card dl-card--${esc(id)}">
      <h2 class="dl-card__title"><a href="${esc(svc.url)}" target="_blank" rel="noopener">${esc(svc.name)}</a>${time}</h2>
      ${staleNote(svc)}
      ${svc.ok || svc.last_success_at ? body : ""}
      ${source}
    </section>`;
  }

  function renderJr(svc) {
    const rows = (svc.items || [])
      .map(
        (i) => `<tr>
          <th scope="row"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a></th>
          <td>${badge(i.status, i.status === "delay" ? "遅れ・運休" : "")}</td>
          <td>${badge(i.tomorrow, i.tomorrow === "delay" ? "運休など" : "")}</td>
        </tr>`
      )
      .join("");
    const body = `<table class="dl-table">
      <thead><tr><th></th><th>本日</th><th>明日</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="dl-card__note">JR北海道の情報は「運休・30分以上の遅れ・運転見合わせがあるかどうか」のみです。深夜はサービス時間外になります。詳しくは各線区のリンク先へ。</p>`;
    return card("jr", svc, body, svc.source_time);
  }

  function renderSubway(svc) {
    const rows = (svc.items || [])
      .map(
        (i) => `<li class="dl-row">
          <span class="dl-row__name dl-line dl-line--${esc(i.id)}">${esc(i.name)}</span>
          ${badge(i.status)}
          ${i.message ? `<span class="dl-row__msg">${esc(i.message)}</span>` : ""}
        </li>`
      )
      .join("");
    return card("subway", svc, `<ul class="dl-rows">${rows}</ul>`, svc.ok ? `${hhmm(svc.fetched_at)} 取得` : "");
  }

  // 1分ごとの描き直しで消えないよう、一覧の開閉とチェックの状態をここに持つ（出発・到着済の便は最初は隠す）
  const ui = { flightsOpen: false, showDone: false };

  const KIND = { cancelled: "欠航", delayed: "遅れ", diverted: "引き返し等" };
  const KIND_STATUS = { cancelled: "suspended", delayed: "delay", diverted: "suspended", done: "done" };
  // 出発・到着済みで30分以上遅れた便（kind: "done"）は、これから飛ぶ便と見分けられるよう薄い色にする
  // 一覧の社名の列に出す短い表記（運航会社コード → 名前）。ない会社は空港データの社名をそのまま出す
  const AIRLINE_SHORT = {
    ANA: "ANA",
    AKX: "ANA",
    ADO: "AIRDO",
    IBX: "IBEX",
    JAL: "JAL",
    JLJ: "J-AIR",
    NTH: "HAC",
    FDA: "FDA",
    SKY: "スカイマーク",
    APJ: "Peach",
    JJP: "ジェットスター",
    SJO: "春秋航空",
    SNJ: "ソラシド",
  };
  const kindLabel = (f) => (f.kind === "done" ? (f.dir === "arrival" ? "遅れ（到着済）" : "遅れ（出発済）") : KIND[f.kind]);

  function renderAirport(svc) {
    const groups = (svc.groups || [])
      .map((g) => {
        const label = g.status === "delay" ? "遅れ・欠航あり" : g.status === "suspended" ? "大規模欠航" : "";
        const parts = [`全${g.total}便`];
        if (g.cancelled) parts.push(`欠航 ${g.cancelled}`);
        if (g.diverted) parts.push(`引き返し等 ${g.diverted}`);
        if (g.delayed) parts.push(`遅れ ${g.delayed}`);
        if (g.done_late) parts.push(`30分以上遅れて出発・到着済 ${g.done_late}`);
        return `<li class="dl-row dl-airrow dl-air--${esc(g.id)}">
          <span class="dl-row__name">${esc(g.name)}</span>
          ${badge(g.status, label)}
          <span class="dl-row__msg">${esc(parts.join(" / "))}</span>
        </li>`;
      })
      .join("");

    const all = svc.flights || [];
    const doneCount = all.filter((f) => f.kind === "done").length;
    const flights = ui.showDone ? all : all.filter((f) => f.kind !== "done");
    const toggle = doneCount
      ? `<label class="dl-check"><input type="checkbox" data-show-done${ui.showDone ? " checked" : ""}> 出発・到着済を表示（${doneCount}便）</label>`
      : "";
    // 出発と到着で表を分ける。列は 航空会社・便名・行先（到着は出発地）・定刻・変更・状況 の順
    const flightTable = (dir, title, placeLabel) => {
      const rows = flights.filter((f) => f.dir === dir);
      if (!rows.length) return "";
      return `<h3 class="dl-flights__title">${title}（${rows.length}便）</h3>
          <table class="dl-table dl-table--flights">
            <colgroup><col class="dl-col-air"><col class="dl-col-no"><col><col class="dl-col-time"><col class="dl-col-est"><col class="dl-col-state"></colgroup>
            <thead><tr><th>航空会社</th><th>便名</th><th>${placeLabel}</th><th>定刻</th><th>変更</th><th>状況</th></tr></thead>
            <tbody>${rows
              .map(
                (f) => `<tr class="dl-airrow dl-air--${esc(String(f.flight).slice(0, 3))}${f.kind === "done" ? " is-done" : ""}">
                  <td class="dl-airname">${esc(AIRLINE_SHORT[String(f.flight).slice(0, 3)] || f.airline)}</td>
                  <td>${esc(f.flight)}</td>
                  <td>${esc(f.place)}</td>
                  <td>${esc(f.scheduled)}</td>
                  <td>${esc(f.estimated || "")}${f.delay_min > 0 ? `<small>（+${f.delay_min}分）</small>` : ""}</td>
                  <td>${badge(KIND_STATUS[f.kind] || "unknown", kindLabel(f))}</td>
                </tr>`
              )
              .join("")}</tbody>
          </table>`;
    };
    const table = flights.length
      ? flightTable("departure", "出発", "行先") + flightTable("arrival", "到着", "出発地")
      : `<p class="dl-card__note">これから出発・到着する便に、遅れ・欠航はありません。</p>`;
    const current = all.length - doneCount;
    const list = all.length
      ? `<details class="dl-flights"${ui.flightsOpen ? " open" : ""}>
          <summary>遅れ・欠航の便（${current}便）</summary>
          ${toggle}
          ${table}
        </details>`
      : "";
    const body = `<ul class="dl-rows">${groups}</ul>${list}
      <p class="dl-card__note">運航会社ごとの集計です（コードシェア便は運航会社側に数えます）。</p>`;
    return card("airport", svc, body, svc.source_time ? `${hhmm(svc.source_time)} 時点` : "");
  }

  // 高速道路：路線ごとの状態と、重要な規制（通行止・チェーン規制・事故など）の区間。車線規制・除雪作業などは件数だけ出す
  const ROAD_LABEL = { suspended: "通行止あり", delay: "規制あり", normal: "重要な規制なし" };
  function renderExpressway(svc) {
    const rows = (svc.roads || [])
      .map((r) => {
        const major = (r.items || []).filter((x) => x.major);
        const minor = (r.items || []).length - major.length;
        const items = major
          .map(
            (x) => `<li>${badge(x.kind === "closed" ? "suspended" : "delay", x.label)}
              <span>${esc(x.section)}${x.direction ? `（${esc(x.direction)}）` : ""}${x.reason ? `　原因：${esc(x.reason)}` : ""}</span></li>`
          )
          .join("");
        return `<li class="dl-row">
          <span class="dl-row__name">${esc(r.name)}</span>
          ${badge(r.status, ROAD_LABEL[r.status])}
          ${items ? `<ul class="dl-subitems">${items}</ul>` : ""}
          ${minor ? `<span class="dl-row__msg">そのほかの規制（車線規制・除雪作業など） ${minor}件</span>` : ""}
        </li>`;
      })
      .join("");
    const body = `<ul class="dl-rows">${rows}</ul>
      <p class="dl-card__note">表示まで10〜15分ほど遅れることがあります。通行止・チェーン規制は急に変わるので、出発前に必ず公式の交通情報を確認してください。</p>`;
    return card("expressway", svc, body, svc.source_time ? `${hhmm(svc.source_time)} 時点` : "");
  }

  // 北海道中央バス：運休のある系統・便だけが載る（RSS）。遅れの情報はない
  function renderChuobus(svc) {
    const rows = (svc.groups || [])
      .map((g) => {
        const items = (g.items || [])
          .map(
            (i) => `<li>${badge(i.status, i.label)}
              <span><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.route || g.name)}</a>
              ${i.direction ? `（${esc(i.direction)}）` : ""}${i.time ? ` ${esc(i.time)}発` : ""}</span></li>`
          )
          .join("");
        return `<li class="dl-row">
          <span class="dl-row__name">${esc(g.name)}</span>
          ${badge(g.status, g.status === "normal" ? "運休情報なし" : "運休あり")}
          ${items ? `<ul class="dl-subitems">${items}</ul>` : ""}
        </li>`;
      })
      .join("");
    const body = `<ul class="dl-rows">${rows}</ul>
      <p class="dl-card__note">中央バスの情報は運休のみで、道路状況などによる遅れは載りません。運休の理由や詳しい便は各系統のリンク先へ。</p>`;
    return card("chuobus", svc, body, svc.ok ? `${hhmm(svc.fetched_at)} 取得` : "");
  }

  // 北都交通：空港連絡バスの系統ごとの状態（平常運行・一部区間運休・全便運休）。文言は北都交通の表記のまま
  function renderHokto(svc) {
    const rows = (svc.items || [])
      .map(
        (i) => `<li class="dl-row">
          <span class="dl-row__name"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a></span>
          ${badge(i.status, i.label)}
          ${i.about ? `<span class="dl-row__msg">${esc(i.about)}</span>` : ""}
        </li>`
      )
      .join("");
    const body = `<ul class="dl-rows">${rows}</ul>
      <p class="dl-card__note">北都交通の情報は運休の有無のみで、道路状況などによる遅れは載りません。</p>`;
    return card("hokto", svc, body, svc.ok ? `${hhmm(svc.fetched_at)} 取得` : "");
  }

  const RENDER = {
    jr: renderJr,
    subway: renderSubway,
    airport: renderAirport,
    expressway: renderExpressway,
    chuobus: renderChuobus,
    hokto: renderHokto,
  };

  // Worker に一度もつながらなかったとき（前回の内容もない）に出す公式リンク。名前と URL は worker/src/collect.js の SOURCES と合わせる
  const OFFICIAL = [
    { name: "JR北海道", url: "https://www3.jrhokkaido.co.jp/webunkou/" },
    { name: "札幌市営地下鉄", url: "https://operationstatus.city.sapporo.jp/unkojoho/" },
    { name: "新千歳空港（国内線）", url: "https://www.hokkaido-airports.com/ja/new-chitose/airport/fis/" },
    { name: "高速道路（アイハイウェイ）", url: "https://ihighway.jp/" },
    { name: "北海道中央バス", url: "https://www.chuo-bus.co.jp/support/stop/" },
    { name: "北都交通", url: "https://www.hokto.co.jp/" },
  ];
  const officialLinks = () =>
    `<section class="dl-card">
      <h2 class="dl-card__title">各社の公式の運行情報</h2>
      <ul class="dl-links">${OFFICIAL.map((o) => `<li><a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.name)}</a></li>`).join("")}</ul>
    </section>`;

  function render(data) {
    const banners = [];
    if (data.sample) {
      banners.push(`<p class="dl-banner dl-banner--sample">サンプルデータを表示しています（実際の運行状況ではありません）。</p>`);
    } else {
      const age = (Date.now() - Date.parse(data.updated_at)) / 60000;
      if (!(age < STALE_MIN)) {
        banners.push(`<p class="dl-banner">情報の更新が止まっています（最終更新 ${esc(hhmm(data.updated_at))}）。各社の公式情報を確認してください。</p>`);
      }
    }
    $banners.innerHTML = banners.join("");
    // 次回の予定時刻は Worker が入れる（next_update_at）。配信のキャッシュ（60秒）と画面の再取得（60秒）の分だけ少し遅れて反映される
    let next = "";
    if (!data.sample && data.next_update_at) {
      next = Date.parse(data.next_update_at) > Date.now() ? ` ／ 次は ${hhmm(data.next_update_at)}ごろ` : " ／ まもなく更新";
    }
    $updated.textContent = `${hhmm(data.updated_at)} 更新${next}`;
    $sections.innerHTML = Object.entries(RENDER)
      .filter(([id]) => data.services?.[id])
      .map(([id, fn]) => fn(data.services[id]))
      .join("");
  }

  let last = null;
  async function load() {
    $reload.disabled = true;
    try {
      const res = await fetch(source, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      last = await res.json();
      render(last);
    } catch {
      // 取得できなくても、前に表示した内容は消さない
      $banners.innerHTML = `<p class="dl-banner">運行情報を取得できませんでした${last ? "（前回の内容を表示中）" : ""}。各社の公式情報を確認してください。</p>`;
      if (!last) {
        $updated.textContent = "取得できませんでした";
        $sections.innerHTML = officialLinks();
      }
    } finally {
      $reload.disabled = false;
    }
  }

  $reload.addEventListener("click", load);
  // カードは描き直すたびに作り直すので、イベントは外側の #sections で受ける（toggle は伝わらないので捕捉段階で）
  $sections.addEventListener(
    "toggle",
    (ev) => {
      if (ev.target.matches?.(".dl-flights")) ui.flightsOpen = ev.target.open;
    },
    true
  );
  $sections.addEventListener("change", (ev) => {
    if (!ev.target.matches("[data-show-done]")) return;
    ui.showDone = ev.target.checked;
    if (last) render(last);
  });
  // 画面を見ているあいだだけ1分ごとに更新し、戻ってきたときにもすぐ更新する
  setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && load());
  load();
})();
