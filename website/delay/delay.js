// 運行情報（試験版）
// Cloudflare Worker（worker/）が5分ごとに集めた JSON を1本だけ取得して描画する。事業者サイトへは直接アクセスしない。
(() => {
  // Worker を公開したら URL を入れる（例 "https://sm27-delay.<account>.workers.dev/status.json"）。空のあいだは sample.json を表示する
  const ENDPOINT = "";
  const REFRESH_MS = 60 * 1000;
  const STALE_MIN = 20; // これより古ければ「更新が止まっている」と表示（Cron は5分ごと）

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

  function card(svc, body, timeText) {
    const time = timeText ? `<span class="dl-card__time">${esc(timeText)}</span>` : "";
    return `<section class="dl-card">
      <h2 class="dl-card__title"><a href="${esc(svc.url)}" target="_blank" rel="noopener">${esc(svc.name)}</a>${time}</h2>
      ${staleNote(svc)}
      ${svc.ok || svc.last_success_at ? body : ""}
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
    <p class="dl-card__note">JR北海道の情報は「遅れや運休があるかどうか」のみです。詳しくは各線区のリンク先へ。</p>`;
    return card(svc, body, svc.source_time);
  }

  function renderSubway(svc) {
    const rows = (svc.items || [])
      .map(
        (i) => `<li class="dl-row">
          <span class="dl-row__name">${esc(i.name)}</span>
          ${badge(i.status)}
          ${i.message ? `<span class="dl-row__msg">${esc(i.message)}</span>` : ""}
        </li>`
      )
      .join("");
    return card(svc, `<ul class="dl-rows">${rows}</ul>`, svc.ok ? `${hhmm(svc.fetched_at)} 取得` : "");
  }

  const KIND = { cancelled: "欠航", delayed: "遅れ", diverted: "引き返し等" };
  const KIND_STATUS = { cancelled: "suspended", delayed: "delay", diverted: "suspended" };

  function renderAirport(svc) {
    const groups = (svc.groups || [])
      .map((g) => {
        const label = g.status === "delay" ? "遅れ・欠航あり" : g.status === "suspended" ? "大規模欠航" : "";
        const parts = [`全${g.total}便`];
        if (g.cancelled) parts.push(`欠航 ${g.cancelled}`);
        if (g.diverted) parts.push(`引き返し等 ${g.diverted}`);
        if (g.delayed) parts.push(`遅れ ${g.delayed}`);
        return `<li class="dl-row">
          <span class="dl-row__name">${esc(g.name)}</span>
          ${badge(g.status, label)}
          <span class="dl-row__msg">${esc(parts.join(" / "))}</span>
        </li>`;
      })
      .join("");

    const flights = svc.flights || [];
    const list = flights.length
      ? `<details class="dl-flights">
          <summary>遅れ・欠航の便（${flights.length}便）</summary>
          <table class="dl-table dl-table--flights">
            <thead><tr><th>出/着</th><th>定刻</th><th>変更</th><th>便名</th><th>行先・出発地</th><th>状況</th></tr></thead>
            <tbody>${flights
              .map(
                (f) => `<tr>
                  <td>${f.dir === "arrival" ? "着" : "発"}</td>
                  <td>${esc(f.scheduled)}</td>
                  <td>${esc(f.estimated || "")}${f.delay_min > 0 ? `<small>（+${f.delay_min}分）</small>` : ""}</td>
                  <td>${esc(f.flight)}</td>
                  <td>${esc(f.place)}</td>
                  <td>${badge(KIND_STATUS[f.kind] || "unknown", KIND[f.kind])}</td>
                </tr>`
              )
              .join("")}</tbody>
          </table>
        </details>`
      : "";
    const body = `<ul class="dl-rows">${groups}</ul>${list}
      <p class="dl-card__note">運航会社ごとの集計です（コードシェア便は運航会社側に数えます）。</p>`;
    return card(svc, body, svc.source_time ? `${hhmm(svc.source_time)} 時点` : "");
  }

  const RENDER = { jr: renderJr, subway: renderSubway, airport: renderAirport };

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
    $updated.textContent = `${hhmm(data.updated_at)} 更新`;
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
      if (!last) $updated.textContent = "取得できませんでした";
    } finally {
      $reload.disabled = false;
    }
  }

  $reload.addEventListener("click", load);
  // 画面を見ているあいだだけ1分ごとに更新し、戻ってきたときにもすぐ更新する
  setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && load());
  load();
})();
