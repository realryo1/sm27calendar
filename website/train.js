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
      width: 630,
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
      // 目安の地下鉄（東西線は横、南北線・東豊線は縦）。
      // links: 乗り換えの点線。[市電停留場の番号, 地下鉄側の x, y] または [x1, y1, x2, y2]
      subway: {
        tozai: { y: 22, x1: 18, x2: 616, st: [["西18丁目", 42], ["西11丁目", 220]] },
        nanboku: { x: 552, y1: 4, y2: 520, st: [["すすきの", 220], ["中島公園", 317], ["幌平橋", 457]] },
        // 東豊線は下端（y2）で右（東）へ折れる
        toho: { x: 598, y1: 4, y2: 310, st: [["豊水すすきの", 242]] },
        // 公式路線図と同じ乗り換えの点線
        links: [[21, 42, 22], [22, 220, 22], [0, 552, 22], [1, 552, 22], [1, 552, 220], [2, 552, 220], [552, 220, 598, 242], [5, 552, 317], [8, 552, 457]],
        zepp: [500, 310], // 南9条西4丁目＝山鼻9条〜中島公園の線上、中島公園駅のすぐ西
      },
    },
    narrow: {
      width: 450,
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
      subway: {
        tozai: { y: 22, x1: 8, x2: 442, st: [["西18丁目", 26], ["西11丁目", 160]] },
        nanboku: { x: 394, y1: 4, y2: 520, st: [["すすきの", 220], ["中島公園", 342], ["幌平橋", 467]] },
        toho: { x: 428, y1: 4, y2: 310, st: [["豊水すすきの", 242]] },
        links: [[21, 26, 22], [22, 160, 22], [0, 394, 22], [1, 394, 22], [1, 394, 220], [2, 394, 220], [394, 220, 428, 242], [5, 394, 342], [8, 394, 467]],
        zepp: [374, 342],
      },
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

  // 地下鉄（目安）と Zepp Sapporo の位置。市電の線より下に薄く描く
  function subwaySvg() {
    const { tozai, nanboku, toho, links, zepp } = layout.subway;
    const vLabel = (x, y, text) => `<text class="tl-sub__st" x="${x + 9}" y="${y - 4}" writing-mode="vertical-rl">${text}</text>`;
    const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="4.5"/>`;
    return `<g class="tl-sub" aria-hidden="true">
      ${links
        .map((l) => {
          const [x1, y1, x2, y2] = l.length === 4 ? l : [MAP_ST[l[0]][0], MAP_ST[l[0]][1], l[1], l[2]];
          return `<line class="tl-sub__link" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
        })
        .join("")}
      <g class="tl-sub__line tl-sub__line--tozai">
        <line x1="${tozai.x1}" y1="${tozai.y}" x2="${tozai.x2}" y2="${tozai.y}"/>
        ${tozai.st.map(([n, x]) => dot(x, tozai.y) + `<text class="tl-sub__st" x="${x}" y="${tozai.y - 8}" text-anchor="middle">${n}</text>`).join("")}
        <text class="tl-sub__name" x="${tozai.x1}" y="${tozai.y + 16}">東西線</text>
      </g>
      <g class="tl-sub__line tl-sub__line--nanboku">
        <line x1="${nanboku.x}" y1="${nanboku.y1}" x2="${nanboku.x}" y2="${nanboku.y2}"/>
        ${nanboku.st.map(([n, y]) => dot(nanboku.x, y) + vLabel(nanboku.x, y, n)).join("")}
        <text class="tl-sub__name" x="${nanboku.x}" y="${nanboku.y2 + 14}" text-anchor="middle">南北線</text>
      </g>
      <g class="tl-sub__line tl-sub__line--toho">
        <polyline points="${toho.x},${toho.y1} ${toho.x},${toho.y2} ${layout.width + 8},${toho.y2 + 8}"/>
        ${toho.st.map(([n, y]) => dot(toho.x, y) + vLabel(toho.x, y, n)).join("")}
        <text class="tl-sub__name" x="${toho.x}" y="${toho.y2 + 20}" text-anchor="middle">東豊線</text>
      </g>
      <g class="tl-sub__odori">
        <rect x="${nanboku.x - 8}" y="${tozai.y - 8}" width="${toho.x - nanboku.x + 16}" height="16" rx="8"/>
        <text x="${(nanboku.x + toho.x) / 2}" y="${tozai.y}" text-anchor="middle" dominant-baseline="central">大通</text>
      </g>
      <g class="tl-zepp" transform="translate(${zepp[0]},${zepp[1]})">
        <path d="M0,0C-7,-9 -10,-13 -10,-18A10,10 0 1 1 10,-18C10,-13 7,-9 0,0Z"/>
        <circle cx="0" cy="-18" r="4"/>
        <text y="14" text-anchor="middle">Zepp</text>
        <text y="27" text-anchor="middle">Sapporo</text>
      </g>
    </g>`;
  }

  const buildMapSvg = (name) => `
    <svg class="tl-map tl-map--${name}" id="tlMap" viewBox="0 0 ${layout.width} 660" role="img" aria-label="札幌市電ループ線の路線図と雪ミク電車の予測位置">
      ${subwaySvg()}
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
      </div>
    </div>
    <details class="tl-trips">
      <summary>発車時刻（2024年ダイヤ）</summary>
      <div id="tlTrips"></div>
    </details>
    <p class="tl-note">※2024年の雪ミク電車時刻表と市電の実ダイヤをもとにした<strong>予測</strong>です。27年の運行ダイヤは現時点で未発表です。</p>
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
    outer: { name: "外回り", en: "Outer Loop", step: 1 },
    inner: { name: "内回り", en: "Inner Loop", step: -1 },
  };

  // 駅名標風の表示。center を中央（この駅）に、進行方向の前後の停留場を左右に置く。
  // trainAt: 左の停留場(0)〜中央(1) の間の電車位置（走行中のみ。丸と重ならない範囲に収める）
  // times: [前駅, 当駅, 次駅] の [時刻, 説明] （無い場合は null）
  function stationSign(direction, center, trainAt, here, times) {
    const dir = DIR[direction];
    const at = (i) => ((i % N) + N) % N;
    const prev = at(center - dir.step);
    const next = at(center + dir.step);
    const side = (i, cls) => `<div class="tl-sign__st tl-sign__st--${cls}">
        <span class="tl-sign__num">SC<br>${SC(i)}</span>
        <b style="--len:${T.stations[i].name.length}">${T.stations[i].name}</b><small>${T.stations[i].roma}</small>
      </div>`;
    const train =
      trainAt != null
        ? `<span class="tl-sign__train" style="--p:${(0.27 + trainAt * 0.085).toFixed(3)}" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="15" rx="3"/><rect x="7.5" y="6" width="9" height="5" rx="1" fill="#fff"/><circle cx="9" cy="14.5" r="1.3" fill="#fff"/><circle cx="15" cy="14.5" r="1.3" fill="#fff"/><path d="M8 18l-2 3M16 18l2 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>
          </span>`
        : "";
    return `<div class="tl-sign tl-sign--${direction}${here ? " is-here" : ""}">
      <div class="tl-sign__top">
        <p class="tl-sign__name" style="--len:${T.stations[center].name.length}">${T.stations[center].name}</p>
        <p class="tl-sign__roma">${T.stations[center].roma}</p>
      </div>
      <div class="tl-sign__times">${times
        .map((t, k) => `<span class="${k === 1 ? "is-cur" : ""}">${t ? `${t[0] ? fmt(t[0]) : ""}<small>${t[1]}</small>` : ""}</span>`)
        .join("")}</div>
      <div class="tl-sign__mid">
        <svg class="tl-sign__arrow" viewBox="0 0 20 40" aria-hidden="true"><polyline points="3,3 17,20 3,37"/></svg>
        ${side(prev, "prev")}
        <div class="tl-sign__st tl-sign__st--cur"><span class="tl-sign__num">SC<br>${SC(center)}</span></div>
        ${side(next, "next")}
        ${train}
      </div>
      <p class="tl-sign__dir">${dir.name}<span>${dir.en}</span></p>
    </div>`;
  }

  function render() {
    if (state.live) Object.assign(state, nowJST());
    $now.classList.toggle("is-active", state.live);
    $date.value = state.dateId;
    $time.value = Math.floor(state.min);
    $clock.textContent = fmt(Math.floor(state.min));

    const type = dayType(state.dateId);

    $sts.forEach((g) => g.classList.remove("is-current", "is-next"));
    if (!type) {
      $map.dataset.dir = "";
      $status.innerHTML = `<p class="tl-off">運行期間外（2026/11/21〜2027/3/21）</p>`;
      $train.style.display = "none";
      $times.forEach((t) => (t.textContent = ""));
      $trips.innerHTML = "";
      return;
    }

    const cfg = T[type];
    const kps = keypoints(type);
    const loc = locate(kps, state.min);
    const next = nextTimes(kps, state.min);
    $map.dataset.dir = cfg.direction;

    // 駅名標の中央に出す停留場（停車中＝その駅、走行中＝次の駅、運行前後＝始発／終着）
    let center;
    let trainAt = null;
    let curTime; // 当駅の時刻 [時刻, 説明]
    if (loc.state === "before") {
      center = kps[0].pos % N;
      curTime = [kps[0].t, "発車予定"];
    } else if (loc.state === "after") {
      center = kps[kps.length - 1].pos % N;
      curTime = [null, "運行終了"];
    } else if (loc.state === "stop") {
      center = loc.pos % N;
      curTime = [loc.until.t, "発車予定"];
    } else {
      center = loc.to.pos % N;
      trainAt = loc.frac;
      curTime = [loc.to.t, "到着予定"];
    }
    // 前駅＝直近にその駅を出た時刻、次駅＝当駅の後に着く時刻
    const step = DIR[cfg.direction].step;
    const prevPos = (center - step + N) % N;
    const nextPos = (center + step + N) % N;
    const prevDep = kps.filter((k) => k.pos % N === prevPos && k.t <= state.min).at(-1);
    const after = curTime[0] ?? state.min;
    const nextArr = loc.state === "after" ? null : kps.find((k) => k.pos % N === nextPos && k.t > after);
    const times = [prevDep && [prevDep.t, "発"], curTime, nextArr && [nextArr.t, "到着予定"]];
    $status.innerHTML = stationSign(cfg.direction, center, trainAt, loc.state === "stop", times);

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
