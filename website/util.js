// 共通の小さな関数（app.js・train-view.js・nav.js と、グッズ goods/・会場マップ map/ で使う）
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
    // 注意：window（ページ全体）を動かすのは iOS で震える（iPhoneの横向き・iPhone Duo。screenX/Y で測っても直らなかった）。列は要素のスクロールにする
    const pos = (ev) => ({ x: ev.clientX, y: ev.clientY });
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
      const p = pos(ev);
      pan = { id: ev.pointerId, x: p.x, y: p.y, t: ev.timeStamp, vx: 0, vy: 0, moved: false };
    });
    $el.addEventListener("pointermove", (ev) => {
      if (!pan || ev.pointerId !== pan.id) return;
      const p = pos(ev);
      if (!pan.moved) {
        if (Math.hypot(p.x - pan.x, p.y - pan.y) < 8) return; // 少しの手ぶれはタップのまま
        pan.moved = true;
        moved = true;
        try {
          $el.setPointerCapture(ev.pointerId);
        } catch {
          // 取れなくても動かせる
        }
      }
      const dx = p.x - pan.x;
      const dy = p.y - pan.y;
      const dt = ev.timeStamp - pan.t;
      if (dt > 0) {
        pan.vx = 0.8 * pan.vx + 0.2 * (dx / dt);
        pan.vy = 0.8 * pan.vy + 0.2 * (dy / dt);
      }
      pan.x = p.x;
      pan.y = p.y;
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

  // 2カラムの持ち手（カレンダー app.js・グッズ goods/goods.js で共通）。
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

  // スマホのガラスのバー（切り替えバー・日付ボタンのバー・マップのフロアバー）：iOS のタブバー（Liquid Glass）のように、
  // 選んでいるボタンの下に板（.glass-glider）を敷く。押した瞬間に板が膨らんでそのボタンまで動き、押したまま横に動かすと板が指について動く。
  // 離したところのボタンを pick に渡す（クリックは待たない）。hover は指が乗ったボタン（読み込みの先回りなど）。
  // 左のサイドバーでは縦に並ぶので（style.css）、縦に動かす。返す関数で、板を置くボタンの番号を決める
  glassBar: ($bar, sel, pick, hover = () => {}) => {
    const $glider = document.createElement("span");
    $glider.className = "glass-glider";
    $glider.setAttribute("aria-hidden", "true");
    $bar.prepend($glider);
    $bar.classList.add("glass-bar");
    let drag = null;
    let suppressUntil = 0;
    const indexAt = (p) => Math.max(0, Math.min(drag.slots.length - 1, Math.floor((p - drag.start) / drag.w)));
    const posOf = (ev) => (drag.vert ? ev.clientY : ev.clientX);
    const moveTo = (px) => ($glider.style.transform = `translate${drag.vert ? "Y" : "X"}(${px}px)`);
    const hoverAt = (i) => {
      drag.slots.forEach((el, k) => el.classList.toggle("is-hover", k === i));
      hover(drag.slots[i]);
    };
    const end = (ev) => {
      if (!drag) return;
      const el = ev.type === "pointerup" ? drag.slots[indexAt(posOf(ev))] : null;
      drag.slots.forEach((s) => s.classList.remove("is-hover"));
      drag = null;
      $bar.classList.remove("is-pressed", "is-dragging");
      $glider.style.transform = ""; // 選んだボタンの位置へ、はねるように戻る（CSS の transition）
      if (!el) return;
      suppressUntil = performance.now() + 500;
      pick(el);
    };
    $bar.addEventListener("pointerdown", (ev) => {
      // 新しいタブで開く操作（中クリック・Ctrl などを押しながら）は、ふつうのリンクのままにする
      if (ev.button || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      const slots = [...$bar.querySelectorAll(sel)];
      const r = $bar.getBoundingClientRect();
      const cs = getComputedStyle($bar);
      const vert = cs.flexDirection === "column";
      const pad = parseFloat(vert ? cs.paddingTop : cs.paddingLeft);
      const size = vert ? r.height : r.width;
      drag = { id: ev.pointerId, vert, p0: vert ? ev.clientY : ev.clientX, start: (vert ? r.top : r.left) + pad, w: (size - pad * 2) / slots.length, slots, moved: false };
      $bar.setPointerCapture(ev.pointerId); // 押したまま外へ出ても追い、外で離しても終わらせる（選ぶのは離したときにここで行う）
      $bar.classList.add("is-pressed");
      const i = indexAt(drag.p0);
      moveTo(i * drag.w); // 押したボタンへ、はねるように動く
      hoverAt(i);
    });
    $bar.addEventListener("pointermove", (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(posOf(ev) - drag.p0) < 6) return;
        drag.moved = true;
        $bar.classList.add("is-dragging");
      }
      moveTo(Math.max(0, Math.min(drag.w * (drag.slots.length - 1), posOf(ev) - drag.start - drag.w / 2)));
      hoverAt(indexAt(posOf(ev)));
    });
    // lostpointercapture は使わない（指を置いたボタンが持っていた捕捉を、動かし始めにバーへ移すときにも起きるため）
    for (const type of ["pointerup", "pointercancel"]) $bar.addEventListener(type, end);
    // 指を離して選んだ直後に、指を置いたボタンへ届く本物のクリックは止める（選んだボタンへは pick が直接行う）
    $bar.addEventListener(
      "click",
      (ev) => {
        if (!ev.isTrusted || performance.now() >= suppressUntil) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
      },
      true
    );
    return (i) => {
      if (!$glider.isConnected) $bar.prepend($glider); // 中身を描き直されたとき（app.js の日付ボタン）は戻す
      $bar.style.setProperty("--n", $bar.querySelectorAll(sel).length);
      $bar.style.setProperty("--i", i);
    };
  },
};
