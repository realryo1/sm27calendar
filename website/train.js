// 雪ミク電車 在線予測
(() => {
  const T = window.TT_DATA.train;
  const N = T.stations.length; // pos N は一周して戻った西4丁目
  const L = T.loopMinutes;

  const $root = document.getElementById("trainLive");
  if (!$root) return;

  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const fmt = (min) => {
    const r = Math.round(min);
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
  };
  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
  const weekOf = (dateId) => {
    const [y, m, d] = dateId.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  };
  const nameAt = (pos) => T.stations[pos % N].name;

  function dayType(dateId) {
    if (dateId < T.period.start || dateId > T.period.end) return null;
    const w = weekOf(dateId);
    return w === 0 || w === 6 || T.holidays.includes(dateId) ? "holiday" : "weekday";
  }

  // 1日分の走行キーポイント { t: 分, pos: 停留場位置, trip }
  function buildKeypoints(type) {
    const { direction, trips } = T[type];
    const ts = trips.map(([a, b]) => [toMin(a), toMin(b)]);
    const gaps = ts.slice(0, -1).map(([, b], k) => ts[k + 1][0] - b);
    const avgGap = gaps.reduce((x, y) => x + y, 0) / gaps.length;
    const kps = [];
    const push = (pos, t, trip) => kps.push({ pos, t, trip });

    ts.forEach(([first, second], k) => {
      const isLast = k === ts.length - 1;
      const D = isLast ? avgGap : ts[k + 1][0] - second;
      const scale = D / L;

      if (direction === "outer") {
        // 西4丁目 → 狸小路 → すすきの → … → 西8丁目 → 西4丁目
        push(0, first, k);
        push(1, (first + second) / 2, k);
        push(2, second, k);
        for (let i = 3; i < N; i++) {
          const st = T.stations[i];
          push(i, second + st.offset * scale, k);
          if (st.depOffset != null && !(isLast && st.name === T.lastStop)) push(i, second + st.depOffset * scale, k);
          if (isLast && st.name === T.lastStop) return;
        }
        push(N, second + D, k);
      } else {
        // すすきの → 狸小路 → 西4丁目 → 西8丁目 → … → 資生館小学校前 → すすきの
        push(2, first, k);
        push(1, (first + second) / 2, k);
        push(0, second, k);
        push(N, second, k);
        for (let i = N - 1; i >= 3; i--) {
          const st = T.stations[i];
          push(i, second + (L - (st.depOffset ?? st.offset)) * scale, k);
          if (st.depOffset != null && !(isLast && st.name === T.lastStop)) push(i, second + (L - st.offset) * scale, k);
          if (isLast && st.name === T.lastStop) return;
        }
        push(2, second + D, k);
      }
    });
    return kps;
  }

  function locate(kps, t) {
    if (t < kps[0].t) return { state: "before" };
    if (t >= kps[kps.length - 1].t) return { state: "after" };
    for (let i = 0; i < kps.length - 1; i++) {
      const a = kps[i];
      const b = kps[i + 1];
      if (a.t <= t && t < b.t) {
        if (a.pos === b.pos) return { state: "stop", pos: a.pos, at: a, until: b, trip: a.trip };
        const frac = (t - a.t) / (b.t - a.t);
        return { state: "run", pos: a.pos + (b.pos - a.pos) * frac, from: a, to: b, frac, trip: a.trip };
      }
    }
    return { state: "after" };
  }

  function nextTimes(kps, t) {
    const res = new Array(N).fill(null);
    for (const kp of kps) {
      if (kp.t < t) continue;
      const i = kp.pos % N;
      if (res[i] == null) res[i] = kp.t;
    }
    return res;
  }

  // ---------- 状態 ----------
  const nowJST = () => {
    const now = new Date();
    const dateId = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const [h, m, s] = now
      .toLocaleTimeString("en-GB", { timeZone: "Asia/Tokyo", hour12: false })
      .split(":")
      .map(Number);
    return { dateId, min: h * 60 + m + s / 60 };
  };

  const init = nowJST();
  const inPeriod = !!dayType(init.dateId);
  const state = {
    live: inPeriod,
    dateId: inPeriod ? init.dateId : "2027-02-06",
    min: inPeriod ? init.min : Math.min(Math.max(init.min, 7 * 60), 21 * 60),
  };
  // ?at=2027-02-06T08:10 で日時を指定して表示（共有・確認用）
  const at = new URLSearchParams(location.search).get("at")?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  if (at) Object.assign(state, { live: false, dateId: at[1], min: toMin(at[2]) });

  // ---------- 路線図レイアウト（札幌市電 ループ線） ----------
  // 停留場の座標と名前ラベルの位置（外回りの順＝stations と同じ並び）と、線路の折れ点（その停留場の直後に入る角）。
  // スマホでは横幅をつめた配置に切り替え、縮小しすぎずに画面幅へ収める
  const LAYOUTS = {
    wide: {
      width: 600,
      st: [
        [440, 60, "below"], [500, 140, "left"], [450, 220, "belowRight"], [380, 220, "above"],
        [330, 270, "right"], [330, 317, "right"], [330, 363, "right"], [330, 410, "right"],
        [330, 457, "right"], [330, 503, "right"], [330, 550, "right"],
        [290, 600, "below"], [200, 600, "below"], [110, 600, "below"],
        [60, 550, "right"], [60, 480, "right"], [60, 410, "right"], [60, 340, "right"],
        [60, 270, "right"], [60, 200, "right"], [60, 130, "right"],
        [110, 60, "below"], [220, 60, "below"], [330, 60, "below"],
      ],
      corners: { 0: [[500, 60]], 1: [[500, 220]], 3: [[330, 220]], 10: [[330, 600]], 13: [[60, 600]], 20: [[60, 60]] },
    },
    narrow: {
      width: 400,
      st: [
        [326, 60, "below"], [370, 140, "left"], [325, 220, "below"], [275, 220, "above"],
        [230, 300, "right"], [230, 342, "right"], [230, 383, "right"], [230, 425, "right"],
        [230, 467, "right"], [230, 508, "right"], [230, 550, "right"],
        [208, 600, "below"], [148, 600, "below"], [60, 600, "below"],
        [40, 550, "right"], [40, 480, "right"], [40, 410, "right"], [40, 340, "right"],
        [40, 270, "right"], [40, 200, "right"], [40, 130, "right"],
        [66, 60, "below"], [160, 60, "below"], [258, 60, "below"],
      ],
      corners: { 0: [[370, 60]], 1: [[370, 220]], 3: [[230, 220]], 10: [[230, 600]], 13: [[40, 600]], 20: [[40, 60]] },
    },
  };
  const SC = (i) => String(i === 0 ? 1 : 25 - i).padStart(2, "0");
  const TRANSFER = ["01", "04", "17", "20", "23", "24"]; // 地下鉄乗継指定駅の最寄り
  const GAP = 9; // 外回り・内回り線の中心線からのずれ

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = (v) => Math.hypot(v[0], v[1]);
  // 時計回り（画面座標）なので (dy, -dx) が外側の法線
  const normal = (a, b) => {
    const v = sub(b, a);
    const l = len(v);
    return [v[1] / l, -v[0] / l];
  };

  let layout, MAP_ST, pts, P, miter, cum, TOTAL, stDist;
  function setLayout(name) {
    layout = LAYOUTS[name];
    MAP_ST = layout.st;
    pts = [];
    const stIdx = [];
    MAP_ST.forEach(([x, y], i) => {
      stIdx[i] = pts.length;
      pts.push([x, y]);
      (layout.corners[i] ?? []).forEach((c) => pts.push(c));
    });
    P = pts.length;
    miter = pts.map((p, k) => {
      const n1 = normal(pts[(k - 1 + P) % P], p);
      const n2 = normal(p, pts[(k + 1) % P]);
      const dot = n1[0] * n2[0] + n1[1] * n2[1];
      return [(n1[0] + n2[0]) / (1 + dot), (n1[1] + n2[1]) / (1 + dot)];
    });
    cum = [0];
    for (let k = 0; k < P; k++) cum.push(cum[k] + len(sub(pts[(k + 1) % P], pts[k])));
    TOTAL = cum[P];
    stDist = [...stIdx.map((k) => cum[k]), TOTAL];
  }
  const offPt = (k, d) => [pts[k % P][0] + miter[k % P][0] * d, pts[k % P][1] + miter[k % P][1] * d];

  function pointAt(dist, d) {
    const t = ((dist % TOTAL) + TOTAL) % TOTAL;
    let k = 0;
    while (k < P - 1 && cum[k + 1] <= t) k++;
    const f = (t - cum[k]) / (cum[k + 1] - cum[k]);
    const a = offPt(k, d);
    const b = offPt(k + 1, d);
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
  }
  const posDist = (p) => {
    const i = Math.min(Math.floor(p), N);
    return i >= N ? TOTAL : stDist[i] + (p - i) * (stDist[i + 1] - stDist[i]);
  };
  const trackPath = (d) => "M" + pts.map((_, k) => offPt(k, d).map((v) => v.toFixed(1)).join(",")).join("L") + "Z";

  const arrows = (d, reverse) =>
    MAP_ST.map((_, i) => {
      const p = pointAt((stDist[i] + stDist[i + 1]) / 2, d);
      return `<path d="M-4,-4L4,0L-4,4Z" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${p.angle + (reverse ? 180 : 0)})"/>`;
    }).join("");

  const label = ([x, y, side], st, i) => {
    if (side === "right")
      return `<text x="${x + 22}" y="${y - 1}"><tspan>${st.name}</tspan><tspan x="${x + 22}" dy="1.2em" class="tl-map__time" data-time="${i}"></tspan></text>`;
    if (side === "left")
      return `<text x="${x - 22}" y="${y - 1}" text-anchor="end"><tspan>${st.name}</tspan><tspan x="${x - 22}" dy="1.2em" class="tl-map__time" data-time="${i}"></tspan></text>`;
    if (side === "belowRight")
      return `<text x="${x - 12}" y="${y + 30}"><tspan>${st.name}</tspan><tspan dx="6" class="tl-map__time" data-time="${i}"></tspan></text>`;
    const y0 = side === "below" ? y + 32 : y - 36;
    return `<text x="${x}" y="${y0}" text-anchor="middle"><tspan>${st.name}</tspan><tspan x="${x}" dy="1.2em" class="tl-map__time" data-time="${i}"></tspan></text>`;
  };

  const buildMapSvg = (name) => `
    <svg class="tl-map tl-map--${name}" id="tlMap" viewBox="0 0 ${layout.width} 660" role="img" aria-label="札幌市電ループ線の路線図と雪ミク電車の予測位置">
      <g class="tl-map__track tl-map__track--outer">
        <path d="${trackPath(GAP)}"/>
        <g class="tl-map__arrows">${arrows(GAP, false)}</g>
      </g>
      <g class="tl-map__track tl-map__track--inner">
        <path d="${trackPath(-GAP)}"/>
        <g class="tl-map__arrows">${arrows(-GAP, true)}</g>
      </g>
      ${MAP_ST.map(
        (m, i) => `<g class="tl-map__st${TRANSFER.includes(SC(i)) ? " is-transfer" : ""}" data-st="${i}">
          <circle cx="${m[0]}" cy="${m[1]}" r="14"/>
          <text x="${m[0]}" y="${m[1] - 2}" class="tl-map__sc">SC</text>
          <text x="${m[0]}" y="${m[1] + 8}" class="tl-map__sc">${SC(i)}</text>
          <g class="tl-map__label">${label(m, T.stations[i], i)}</g>
        </g>`
      ).join("")}
      <g class="tl-map__train" id="tlTrain">
        <circle class="tl-map__pulse" r="18"/>
        <g class="tl-map__heading" id="tlHeading"><path d="M23,-11L41,0L23,11L27,0Z"/></g>
        <circle class="tl-map__body" r="16"/>
        <g transform="translate(-9,-10) scale(.75)">
          <rect x="5" y="3" width="14" height="15" rx="3" fill="#fff"/>
          <rect x="7.5" y="6" width="9" height="5" rx="1" class="tl-map__win"/>
          <circle cx="9" cy="14.5" r="1.3" class="tl-map__win"/><circle cx="15" cy="14.5" r="1.3" class="tl-map__win"/>
          <path d="M8 18l-2 3M16 18l2 3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
        </g>
      </g>
    </svg>`;

  // ---------- 描画 ----------
  $root.innerHTML = `
    <div class="tl-controls">
      <button type="button" class="tl-now" id="tlNow">いま</button>
      <input type="date" class="tl-date" id="tlDate" min="${T.period.start}" max="${T.period.end}" aria-label="日付">
      <div class="tl-slider">
        <input type="range" id="tlTime" min="${6 * 60}" max="${22 * 60}" step="1" aria-label="時刻">
        <output class="tl-clock" id="tlClock"></output>
      </div>
    </div>
    <div class="tl-grid">
      <div class="tl-status" id="tlStatus"></div>
      <div class="tl-map-wrap">
        <div id="tlMapHost"></div>
        <ul class="tl-legend">
          <li><span class="tl-legend__line tl-legend__line--outer"></span>外回り</li>
          <li><span class="tl-legend__line tl-legend__line--inner"></span>内回り</li>
          <li><span class="tl-legend__dot"></span>地下鉄乗継駅の最寄り</li>
          <li>数字＝次に来る予測時刻</li>
        </ul>
      </div>
    </div>
    <details class="tl-trips">
      <summary>発車時刻（2024年ダイヤ）</summary>
      <div id="tlTrips"></div>
    </details>
    <p class="tl-note">※ 2024年の雪ミク電車時刻表（平日＝内回り／土日祝＝外回り）と市電の実ダイヤをもとにした<strong>予測</strong>です。2026-27年の運行ダイヤ・車両運用とは異なる場合があります。狸小路の時刻は推定です。</p>
  `;

  const $now = document.getElementById("tlNow");
  const $date = document.getElementById("tlDate");
  const $time = document.getElementById("tlTime");
  const $clock = document.getElementById("tlClock");
  const $status = document.getElementById("tlStatus");
  let $map, $train, $heading, $times, $sts;
  const $trips = document.getElementById("tlTrips");

  // 電車マーカーは線路に沿ってアニメーション（直線補間だと角で線路から外れるため）
  const anim = { dist: null, gap: 0, raf: 0 };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const placeTrain = (dist, gap) => {
    const p = pointAt(dist, gap);
    $train.setAttribute("transform", `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
    // 進行方向の矢印: 外回りは線路順、内回りはその逆向き（駅ちょうどでは手前の区間の向き）
    const angle = gap >= 0 ? p.angle : pointAt(dist - 0.5, gap).angle + 180;
    $heading.setAttribute("transform", `rotate(${angle.toFixed(1)})`);
    anim.dist = dist;
    anim.gap = gap;
  };
  function moveTrain(dist, gap) {
    cancelAnimationFrame(anim.raf);
    if (anim.dist == null || reduceMotion) return placeTrain(dist, gap);
    // ループ上で近い方向へ進む
    let delta = (((dist - anim.dist) % TOTAL) + TOTAL) % TOTAL;
    if (delta > TOTAL / 2) delta -= TOTAL;
    const from = anim.dist;
    const fromGap = anim.gap;
    const t0 = performance.now();
    const dur = 450;
    const step = (now) => {
      const e = Math.min(1, (now - t0) / dur);
      const k = 1 - (1 - e) ** 3;
      placeTrain(from + delta * k, fromGap + (gap - fromGap) * k);
      if (e < 1) anim.raf = requestAnimationFrame(step);
    };
    anim.raf = requestAnimationFrame(step);
  }

  // 画面幅に応じて路線図の配置を切り替えて描き直す
  const $mapHost = document.getElementById("tlMapHost");
  const narrowMQ = matchMedia("(max-width: 767px)");
  function mountMap() {
    const name = narrowMQ.matches ? "narrow" : "wide";
    setLayout(name);
    $mapHost.innerHTML = buildMapSvg(name);
    $map = document.getElementById("tlMap");
    $train = document.getElementById("tlTrain");
    $heading = document.getElementById("tlHeading");
    $times = [...$map.querySelectorAll("[data-time]")];
    $sts = [...$map.querySelectorAll("[data-st]")];
    cancelAnimationFrame(anim.raf);
    anim.dist = null;
  }

  const cache = {};
  const keypoints = (type) => (cache[type] ??= buildKeypoints(type));

  const DIR = {
    outer: { name: "外回り", desc: "西4丁目 → すすきの → 中島公園 → 中央図書館 → 西線 → 西15丁目 の順（時計回り）" },
    inner: { name: "内回り", desc: "すすきの → 西4丁目 → 西15丁目 → 西線 → 中央図書館 → 中島公園 の順（反時計回り）" },
  };

  function render() {
    if (state.live) Object.assign(state, nowJST());
    $now.classList.toggle("is-active", state.live);
    $date.value = state.dateId;
    $time.value = Math.floor(state.min);
    $clock.textContent = fmt(Math.floor(state.min));

    const [, mo, d] = state.dateId.split("-").map(Number);
    const dateText = `${mo}/${d}(${WEEK[weekOf(state.dateId)]})`;
    const type = dayType(state.dateId);

    $sts.forEach((g) => g.classList.remove("is-current", "is-next"));
    if (!type) {
      $map.dataset.dir = "";
      $status.innerHTML = `
        <p class="tl-mode">${dateText}</p>
        <p class="tl-main">運行期間外</p>
        <p class="tl-sub">雪ミク電車の運行期間は 2026/11/21〜2027/3/21 です。日付を変えるとシミュレーションできます。</p>`;
      $train.style.display = "none";
      $times.forEach((t) => (t.textContent = ""));
      $trips.innerHTML = "";
      return;
    }

    const cfg = T[type];
    const kps = keypoints(type);
    const loc = locate(kps, state.min);
    const next = nextTimes(kps, state.min);
    const dir = DIR[cfg.direction];
    $map.dataset.dir = cfg.direction;

    let main = "";
    let sub = "";
    if (loc.state === "before") {
      const first = kps[0];
      main = "運行前";
      sub = `初発は ${nameAt(first.pos)} ${fmt(first.t)}頃 発の予定`;
    } else if (loc.state === "after") {
      main = "本日の運行終了";
      sub = `最終便は ${T.lastStop} 行きです`;
    } else if (loc.state === "stop") {
      main = nameAt(loc.pos);
      sub = `に停車中（${fmt(loc.until.t)}頃 発）`;
    } else {
      const to = nameAt(loc.to.pos);
      if (loc.frac > 0.6) {
        main = to;
        sub = `にまもなく到着（${fmt(loc.to.t)}頃）`;
      } else {
        main = `${nameAt(loc.from.pos)} → ${to}`;
        sub = `間を走行中（${to} ${fmt(loc.to.t)}頃）`;
      }
    }

    const baseNext = (pos) => (next[pos] != null ? `${fmt(next[pos])}頃` : "—");
    $status.innerHTML = `
      <p class="tl-mode">${dateText} ${type === "holiday" ? "土日祝" : "平日"}ダイヤ
        <span class="badge badge--tentative">予測</span>${state.live ? '<span class="tl-live">LIVE</span>' : ""}</p>
      <p class="tl-dir tl-dir--${cfg.direction}"><span class="tl-dir__pill">${dir.name}</span><span class="tl-dir__desc">${dir.desc}</span></p>
      <p class="tl-main">${main}</p>
      <p class="tl-sub">${sub}</p>
      <dl class="tl-next">
        <dt>次の 西4丁目</dt><dd>${baseNext(0)}</dd>
        <dt>次の すすきの</dt><dd>${baseNext(2)}</dd>
      </dl>`;

    $times.forEach((t) => {
      const v = next[Number(t.dataset.time)];
      t.textContent = v != null ? fmt(v) : "";
    });

    if (loc.state === "stop" || loc.state === "run") {
      const dist = posDist(loc.pos);
      const gap = cfg.direction === "outer" ? GAP : -GAP;
      $train.style.display = "";
      moveTrain(dist, gap);
      if (loc.state === "stop") $sts[loc.pos % N].classList.add("is-current");
      else $sts[loc.to.pos % N].classList.add("is-next");
    } else {
      $train.style.display = "none";
      anim.dist = null;
    }

    const [h1, h2] = cfg.direction === "outer" ? ["西4丁目発", "すすきの発"] : ["すすきの発", "西4丁目発"];
    $trips.innerHTML = `<table class="tl-table">
      <thead><tr><th>${h1}</th><th>${h2}</th></tr></thead>
      <tbody>${cfg.trips
        .map(
          ([a, b], k) => `<tr class="${k === loc.trip ? "is-current" : ""}"><td>${a}</td><td>${b}${
            k === cfg.trips.length - 1 ? ` <small>${T.lastStop}行</small>` : ""
          }</td></tr>`
        )
        .join("")}</tbody></table>`;
  }

  $now.addEventListener("click", () => {
    state.live = true;
    render();
  });
  $date.addEventListener("change", () => {
    if (!$date.value) return;
    state.live = false;
    state.dateId = $date.value;
    render();
  });
  $time.addEventListener("input", () => {
    state.live = false;
    state.min = Number($time.value);
    render();
  });

  mountMap();
  render();
  narrowMQ.addEventListener("change", () => {
    mountMap();
    render();
  });
  setInterval(() => state.live && render(), 15 * 1000);
})();
