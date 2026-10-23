// PWA：Service Worker の登録と、インストール（ホーム画面に追加）の案内
(() => {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
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

  function show(html) {
    $card.innerHTML = `
      <img class="install__icon" src="image/icon-512.png" alt="" width="48" height="48">
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
      <p class="install__text">ホーム画面から開けて、電波のない会場でもオフラインで見られます。</p>
      <button type="button" class="install__btn" data-install>インストール</button>`);
  });
  window.addEventListener("appinstalled", () => ($card.hidden = true));

  // iOS Safari：自動のダイアログがないので、ホーム画面への追加手順を案内する
  if (isIOS && !dismissed()) {
    show(`<p class="install__title">ホーム画面に追加</p>
      <p class="install__text">
        <svg class="install__share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        共有ボタンから「ホーム画面に追加」を選ぶと、アプリのように開けてオフラインでも見られます。</p>`);
  }
})();
