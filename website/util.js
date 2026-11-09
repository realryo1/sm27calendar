// 共通の小さな関数（app.js・train-view.js・nav.js と、グッズマップの goodsmap.js で使う）
// タッチでページ全体を拡大させない（iPhoneで拡大のあと「繰り返しエラー」になることがある）。
// iOS は viewport の user-scalable=no を無視するので、ジェスチャーごと止める。カレンダーの表とマップのピンチは自前の処理で行う
document.addEventListener("gesturestart", (ev) => ev.preventDefault());
document.addEventListener("gesturechange", (ev) => ev.preventDefault());

window.TT_UTIL = {
  // 2カラムのタッチ：列ごとに独立してスクロールする（左右の列を別の指で同時に動かせる）。
  // ブラウザ標準のスクロールは同時に1か所しか動かないので、2カラムの列は CSS で touch-action: none にして、1本指の動きをこちらで受けて動かす（慣性も自前）。
  // $el の中の指だけを見る。同じ列に2本目の指が来たらピンチなので、動かすのをやめる（ピンチは各ページの touch イベントが行う）。
  // scroller: 動かすもの（要素。省略は $el 自身。window ならページ全体。要素を返す関数でもよい）。axis: "y"（縦だけ）か "xy"。enabled(): いま独立させるか（2カラムのときだけ）。
  // 押しただけのタップは邪魔しない。動かしたあとのクリックだけ止める
  touchPan: ($el, { scroller = $el, axis = "y", enabled = () => true } = {}) => {
    const sc = () => (typeof scroller === "function" ? scroller() : scroller); // 関数なら、そのつど探す（作り直される中身）
    const get = () => {
      const s = sc();
      return s === window ? { x: scrollX, y: scrollY } : { x: s.scrollLeft, y: s.scrollTop };
    };
    const by = (dx, dy) => {
      const s = sc();
      if (s === window) scrollBy(dx, dy);
      else if (s) {
        s.scrollLeft += dx;
        s.scrollTop += dy;
      }
    };
    const xy = axis === "xy";
    $el.dataset.touchPan = ""; // CSS が2カラムのときだけ touch-action: none にする目印
    let pan = null; // { id, x, y, t, vx, vy, moved }
    let touching = 0; // いま $el に触れている指の数
    let glide = 0;
    let moved = false; // 直前の操作で動かしたか（そのあとのクリックを止める）
    // 指の下に、それ自身がスクロールできる入れ子の枠があるときは、その枠に任せる
    const nested = (t) => {
      for (let n = t; n && n !== $el; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) return true;
        if (xy && /(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
      }
      return false;
    };
    const coast = (vx, vy) => {
      let prev = performance.now();
      const step = (now) => {
        const dt = Math.min(32, now - prev);
        prev = now;
        const b = get();
        by(xy ? -vx * dt : 0, -vy * dt);
        const a = get();
        const f = Math.pow(0.995, dt); // 約1秒で止まる
        vx *= f;
        vy *= f;
        if (Math.hypot(vx, vy) > 0.02 && (a.x !== b.x || a.y !== b.y)) glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    };
    $el.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType !== "touch" || !enabled()) return;
      cancelAnimationFrame(glide);
      touching++;
      if (touching > 1 || nested(ev.target)) {
        pan = null;
        return;
      }
      pan = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: ev.timeStamp, vx: 0, vy: 0, moved: false };
    });
    $el.addEventListener("pointermove", (ev) => {
      if (!pan || ev.pointerId !== pan.id) return;
      if (!pan.moved) {
        if (Math.hypot(ev.clientX - pan.x, ev.clientY - pan.y) < 8) return; // 少しの手ぶれはタップのまま
        pan.moved = true;
        moved = true;
        try {
          $el.setPointerCapture(ev.pointerId);
        } catch {
          // 取れなくても動かせる
        }
      }
      const dx = ev.clientX - pan.x;
      const dy = ev.clientY - pan.y;
      const dt = ev.timeStamp - pan.t;
      if (dt > 0) {
        pan.vx = 0.8 * pan.vx + 0.2 * (dx / dt);
        pan.vy = 0.8 * pan.vy + 0.2 * (dy / dt);
      }
      pan.x = ev.clientX;
      pan.y = ev.clientY;
      pan.t = ev.timeStamp;
      by(xy ? -dx : 0, -dy);
    });
    const end = (ev) => {
      if (ev.pointerType !== "touch") return;
      touching = Math.max(0, touching - 1);
      if (!pan || ev.pointerId !== pan.id) return;
      const p = pan;
      pan = null;
      if (ev.type === "pointerup" && p.moved && ev.timeStamp - p.t < 80 && Math.hypot(p.vx, p.vy) > 0.1) coast(p.vx, p.vy);
      if (p.moved) setTimeout(() => (moved = false), 0);
    };
    $el.addEventListener("pointerup", end);
    $el.addEventListener("pointercancel", end);
    $el.addEventListener("click", (ev) => {
      if (!moved) return;
      ev.stopPropagation();
      ev.preventDefault();
    }, true);
  },

  // HTML の本文・属性に入れる文字をエスケープする
  esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  // データ中の文字列の "\n" を改行（<br>）にする
  nl: (s) => String(s).replace(/\n/g, "<br>"),
  // "HH:MM" → 0時からの分
  toMin: (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  },
  // 日本時間の今。dateId は "YYYY-MM-DD"、min は0時からの分（秒は小数）
  nowJST: () => {
    const now = new Date();
    const dateId = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const [h, m, s] = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Tokyo", hour12: false }).split(":").map(Number);
    return { dateId, min: h * 60 + m + s / 60 };
  },
  // "YYYY-MM-DD" の曜日（0＝日〜6＝土）
  weekday: (id) => new Date(`${id}T00:00:00Z`).getUTCDay(),

  // 2カラムの持ち手（カレンダー app.js・グッズマップ goodsmap.js・グッズ一覧 goods.js で共通）。
  // ドラッグ（ダブルクリックで def、← → キーでも動く）で左の列の幅（$main の cssVar に %）を変え、この端末（localStorage の key）に覚える。
  // 左は minA px、右は minB px（と持ち手の列）を残す。ドラッグのあいだは freeze() で中身の組み直しを止め、手を止めて SETTLE ms たつか離したら thaw() で戻す。
  // hold: 持ち手を選ぶ・外すと持ち手の列が広がる・戻る（CSS の --split-extra）ので、そのあいだも freeze() しておく。
  // onChange: 利用者が幅を変えたとき（動かしている間・離したとき・キー）。onSave(w): 覚えるとき。返す setW・cur は、画面の大きさが変わったときの下限のかけ直しに使う
  splitter: ({ $split, $main, cssVar, key, def, minA, minB, freeze = () => {}, thaw = () => {}, hold = false, onChange = () => {}, onSave = () => {} }) => {
    const SETTLE = 200;
    const wide = matchMedia("(min-width: 641px)"); // 幅の測定は2カラムのときだけ（1カラムでは要らないのに、読み込み中のレイアウトを強制するため）
    // 持ち手の列の幅＝ページの隙間（style.css の --gap）
    const gap = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gap")) || 16;
    // $main の位置と幅はドラッグ中は変わらないので押した時に1回だけ測る（動かすたびに測ると、直前の幅の変更をその場でレイアウトさせて重い）
    let rect = null;
    const setW = (pct, save) => {
      const total = rect?.width || (wide.matches && $main.clientWidth) || innerWidth;
      // 表示は丸めない（0.1% 刻みだと、ゆっくり動かしたとき 1〜2px ずつ段になって動く）。覚えるときだけ丸める
      const w = Math.min(100 - ((minB + gap()) / total) * 100, Math.max((minA / total) * 100, pct));
      $main.style.setProperty(cssVar, `${w}%`);
      $split.setAttribute("aria-valuenow", String(Math.round(w)));
      if (!save) return;
      onSave(w);
      try {
        localStorage.setItem(key, String(Math.round(w * 10) / 10));
      } catch {
        // 保存できなくても、幅は変えられる
      }
    };
    const cur = () => parseFloat($main.style.getPropertyValue(cssVar));
    let saved = NaN;
    try {
      saved = parseFloat(localStorage.getItem(key));
    } catch {
      saved = NaN;
    }
    setW(Number.isFinite(saved) ? saved : def, false);
    // 持ち手の列（幅は --gap）の中央を指の位置に合わせる
    const pctAt = (x) => {
      const r = rect ?? $main.getBoundingClientRect();
      return ((x - r.left - gap() / 2) / r.width) * 100;
    };
    let settle = 0;
    const later = () => {
      clearTimeout(settle);
      settle = setTimeout(thaw, SETTLE);
    };
    if (hold)
      for (const type of ["pointerenter", "pointerleave", "focus", "blur"])
        $split.addEventListener(type, () => {
          if ($split.classList.contains("is-dragging")) return; // ドラッグ中は pointerdown からの処理に任せる
          freeze();
          later();
        });
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
          onChange();
          setW(pctAt(moveX), false);
          later();
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
      onChange();
      setW(pctAt(ev.clientX), true);
      thaw(); // 離した幅が決まってから、中身を組み直す
      rect = null;
    };
    $split.addEventListener("pointerup", end);
    $split.addEventListener("pointercancel", end);
    // ダブルクリックと矢印キーも、ドラッグと同じく枠だけ先に動かし、中身は組み直す
    const jump = (pct) => {
      freeze();
      onChange();
      setW(pct, true);
      thaw();
    };
    $split.addEventListener("dblclick", () => jump(def));
    $split.addEventListener("keydown", (ev) => {
      const step = { ArrowLeft: -2, ArrowRight: 2 }[ev.key];
      if (!step) return;
      ev.preventDefault();
      jump(cur() + step);
    });
    return { setW, cur };
  },
};
