// PWA：Service Worker の登録と、インストール（ホーム画面に追加）の案内
(() => {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // github.io の引っ越しの案内（data.js の migrate）。インストールしたアプリの中でも、開くたびに出す（×でそのときだけ閉じる）。
  // 出すときは、github.io のアプリのインストール案内は出さない
  const migrate = window.TT_DATA.migrate;
  // 見出しの下に、今のアイコン ⇒ 新しいアイコン（image/app/。github.io では消さずに残す。deploy-pages.yml）を並べる。
  // 手元（"dev"）でも、見た目を確かめられるよう出す（appUrl はデプロイ時に入るので、手元ではボタンの行き先が無い）
  if (migrate?.enabled && ((self.SM27_SITE === "pages" && migrate.appUrl) || self.SM27_SITE === "dev")) {
    const { esc } = window.TT_UTIL;
    const $m = document.createElement("div");
    $m.className = "migrate";
    $m.setAttribute("role", "dialog");
    $m.setAttribute("aria-modal", "true");
    $m.setAttribute("aria-labelledby", "migrateTitle");
    $m.innerHTML = `<div class="migrate__card">
        <p class="migrate__title" id="migrateTitle">${esc(migrate.title)}</p>
        <p class="migrate__icons">
          <img src="image/icon-maskable-512.png" alt="今のアイコン" width="56" height="56">
          <span aria-hidden="true">⇒</span>
          <img src="image/app/icon-maskable-512.png" alt="新しいアイコン" width="56" height="56">
        </p>
        <p class="migrate__text">${migrate.text}</p>
        <a class="migrate__btn" href="${esc(migrate.appUrl || "#")}" target="_blank" rel="noopener">${esc(migrate.button)}</a>
        <button type="button" class="migrate__close" aria-label="閉じる">×</button>
      </div>`;
    $m.querySelector(".migrate__close").addEventListener("click", () => $m.remove());
    document.body.append($m);
    return;
  }

  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) return;

  const DISMISS_KEY = "sm27-install-dismissed";
  const dismissed = () => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  };
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);

  let deferred = null;
  const $card = document.createElement("div");
  $card.className = "install";
  $card.hidden = true;
  $card.setAttribute("role", "dialog");
  $card.setAttribute("aria-label", "アプリとしてインストール");
  document.body.append($card);
  // 上端のバー（style.css の .install::after）が10秒で無くなったら、フェードアウトして閉じる。今回だけ閉じ、次に開いたときはまた出す
  $card.addEventListener("animationend", (ev) => {
    if (ev.animationName === "install-timer") $card.classList.add("is-leaving");
    if (ev.animationName === "install-out") {
      $card.hidden = true;
      $card.classList.remove("is-leaving");
    }
  });

  function show(html) {
    $card.innerHTML = `
      <img class="install__icon" src="image/icon-maskable-512.png" alt="" width="48" height="48">
      <div class="install__body">${html}</div>
      <button type="button" class="install__close" aria-label="閉じる">×</button>`;
    $card.hidden = false;
    $card.querySelector(".install__close").addEventListener("click", () => {
      $card.hidden = true;
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {}
    });
    $card.querySelector("[data-install]")?.addEventListener("click", async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      deferred = null;
      $card.hidden = true;
    });
  }

  // Chrome / Edge / Android：インストールダイアログを出す
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    deferred = ev;
    if (dismissed()) return;
    show(`<p class="install__title">アプリとしてインストール</p>
      <p class="install__text">・オフラインでもすぐ見れる！<br>・アプリのように見やすい！</p>
      <button type="button" class="install__btn" data-install>インストール</button>`);
  });
  window.addEventListener("appinstalled", () => ($card.hidden = true));

  // iOS Safari：自動のダイアログがないので、ホーム画面への追加手順を案内する
  if (isIOS && !dismissed()) {
    show(`<p class="install__title">ホーム画面に追加</p>
      <p class="install__text">・オフラインでもすぐ見れる！<br>・アプリのように見やすい！<br>
        右下「 … 」の 「<svg class="install__share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
       共有 」から「ホーム画面に追加」しよう！</p>`);
  }
})();
