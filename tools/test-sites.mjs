// 手元で、新しいドメインと github.io（旧サイト）を別のポートで出して、挙動を確かめる（依存なし。Node 22 以降と Chrome）。
//   node tools/test-sites.mjs          … 作り分けて、ヘッドレスの Chrome で自動テストする
//   node tools/test-sites.mjs --serve  … 作り分けて配信だけする（ブラウザで手で確かめる用）
//   --old-ref <コミット>                … 旧サイトの「前の版」（PWA を入れていた版）。既定は移行前の d05b59e
// 作り分けはデプロイと同じ tools/split-sites.sh（圧縮は省く）。出力は OS の一時フォルダの sm27-test-sites/。
//   新しいドメイン：http://127.0.0.1:8801/
//   github.io     ：http://127.0.0.1:8802/sm27calendar/（運行情報の代わりに、同じオリジンに /hokkaido_delay/ の見本の PWA を置く）
//   旧サイトの中身は http://127.0.0.1:8802/__switch?to=old|new で切り替える（--serve の既定は new。移行を試すときは old で前の版の PWA を入れてから new にする）
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, cpSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const SERVE = args.includes("--serve");
const OLD_REF = args.includes("--old-ref") ? args[args.indexOf("--old-ref") + 1] : "d05b59e";
const APP_PORT = 8801;
const PAGES_PORT = 8802;
const CDP_PORT = 9333;
const APP_URL = readFileSync(join(ROOT, ".github/workflows/deploy-pages.yml"), "utf8").match(/^\s*APP_URL:\s*(\S+)/m)[1];
const OUT = join(tmpdir(), "sm27-test-sites");
const posix = (p) => p.replace(/\\/g, "/");

// Git for Windows の bash（WSL の bash を避ける）
function bashPath() {
  if (process.platform !== "win32") return "bash";
  const exec = execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim();
  const p = join(exec, "../../../bin/bash.exe");
  return existsSync(p) ? p : "bash";
}
const BASH = bashPath();

// ---------- 作り分け ----------
function build() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(join(ROOT, "website"), join(OUT, "app"), { recursive: true });
  execFileSync(BASH, [posix(join(ROOT, "tools/split-sites.sh")), posix(join(OUT, "app")), posix(join(OUT, "pages"))], {
    env: { ...process.env, APP_URL },
    stdio: "inherit",
  });
  // 前の版の github.io（PWA を入れていた版）
  const tar = execFileSync("git", ["-C", ROOT, "archive", OLD_REF, "website"], { maxBuffer: 256 * 1024 * 1024 });
  mkdirSync(join(OUT, "old-src"), { recursive: true });
  execFileSync(BASH, ["-c", `tar --force-local -x -C "${posix(join(OUT, "old-src"))}"`], { input: tar });
  cpSync(join(OUT, "old-src/website"), join(OUT, "old"), { recursive: true });
  const pc = join(OUT, "old/precache.js");
  execFileSync(BASH, ["-c", `sed -i 's/^self.SM27_SITE = "dev";/self.SM27_SITE = "pages";/' "${posix(pc)}"`]);
  console.log(`作り分け：${OUT}（旧サイトの前の版は ${OLD_REF}）`);
}

// ---------- 配信 ----------
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml" };
const HD_PAGE = `<!doctype html><meta charset="utf-8"><title>hokkaido_delay 見本</title><p>同じオリジンの別の PWA（運行情報の代わり）</p>
<script>navigator.serviceWorker.register("sw.js");</script>`;
const HD_SW = `self.addEventListener("install",(e)=>{e.waitUntil(caches.open("hd-test").then((c)=>c.put("x",new Response("x"))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",(e)=>e.waitUntil(self.clients.claim()));self.addEventListener("fetch",()=>{});`;
const state = { pages: "new", appDown: false };

function sendFile(res, base, rel) {
  let file = normalize(join(base, decodeURIComponent(rel)));
  if (!file.startsWith(normalize(base))) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404, { "Content-Type": "text/plain" }).end("404");
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
  res.end(readFileSync(file));
}
function serve() {
  const app = createServer((req, res) => {
    if (state.appDown) return req.socket.destroy();
    sendFile(res, join(OUT, "app"), new URL(req.url, "http://x").pathname);
  });
  const pages = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/__switch") {
      state.pages = u.searchParams.get("to") === "new" ? "new" : "old";
      return res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end(`旧サイトの中身：${state.pages}`);
    }
    if (u.pathname === "/hokkaido_delay/") return res.writeHead(200, { "Content-Type": TYPES[".html"] }).end(HD_PAGE);
    if (u.pathname === "/hokkaido_delay/sw.js") return res.writeHead(200, { "Content-Type": TYPES[".js"] }).end(HD_SW);
    if (u.pathname === "/sm27calendar") return res.writeHead(301, { Location: "/sm27calendar/" }).end();
    if (!u.pathname.startsWith("/sm27calendar/")) return res.writeHead(404).end("404");
    sendFile(res, join(OUT, state.pages === "new" ? "pages" : "old"), u.pathname.slice("/sm27calendar/".length));
  });
  app.listen(APP_PORT, "127.0.0.1");
  pages.listen(PAGES_PORT, "127.0.0.1");
  // ソケットを残すとオフラインの試験で古い接続が使い回されるので、keep-alive を切る
  for (const s of [app, pages]) s.keepAliveTimeout = 1;
  return [app, pages];
}

// ---------- Chrome DevTools Protocol ----------
class CDP {
  static async connect(url) {
    const c = new CDP();
    c.ws = new WebSocket(url);
    c.id = 0;
    c.wait = new Map();
    c.handlers = [];
    c.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && c.wait.has(m.id)) {
        const { ok, ng } = c.wait.get(m.id);
        c.wait.delete(m.id);
        m.error ? ng(new Error(`${m.error.message}`)) : ok(m.result);
      } else if (m.method) c.handlers.forEach((h) => h(m));
    };
    await new Promise((ok, ng) => ((c.ws.onopen = ok), (c.ws.onerror = ng)));
    return c;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((ok, ng) => this.wait.set(id, { ok, ng }));
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Page {
  constructor(cdp, sessionId) {
    Object.assign(this, { cdp, sessionId, navs: 0, errors: [] });
    cdp.handlers.push((m) => {
      if (m.sessionId !== sessionId) return;
      if (m.method === "Page.loadEventFired") this.loaded?.();
      if (m.method === "Page.frameNavigated" && !m.params.frame.parentId) this.navs++;
      if (m.method === "Runtime.exceptionThrown") this.errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === "Log.entryAdded" && m.params.entry.level === "error") this.errors.push(`${m.params.entry.text} ${m.params.entry.url || ""}`);
    });
  }
  static async open(cdp, url, browserContextId) {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const p = new Page(cdp, sessionId);
    for (const m of ["Page.enable", "Runtime.enable", "Log.enable"]) await cdp.send(m, {}, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
    await p.goto(url);
    return p;
  }
  load(fn) {
    const done = new Promise((ok, ng) => {
      this.loaded = ok;
      setTimeout(() => ng(new Error("読み込みが終わらない")), 30000);
    });
    return fn().then(() => done);
  }
  goto(url) {
    return this.load(() => this.cdp.send("Page.navigate", { url }, this.sessionId));
  }
  reload() {
    return this.load(() => this.cdp.send("Page.reload", {}, this.sessionId));
  }
  async eval(expr) {
    const r = await this.cdp.send("Runtime.evaluate", { expression: `(async () => (${expr}))()`, awaitPromise: true, returnByValue: true }, this.sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async waitFor(expr, ms = 20000) {
    const end = Date.now() + ms;
    let last;
    while (Date.now() < end) {
      try {
        last = await this.eval(expr);
        if (last) return last;
      } catch (e) {
        last = e.message; // 読み込み直しの途中は評価できないことがある
      }
      await sleep(250);
    }
    return false;
  }
}

// ---------- 試験 ----------
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${!ok && detail ? `（${detail}）` : ""}`);
}
const SM27_CACHES = `(await caches.keys()).filter((k) => k.startsWith("sm27-"))`;
const OWN_REG = `navigator.serviceWorker.getRegistration()`;

async function testApp(cdp) {
  console.log(`\n■ 新しいドメイン（:${APP_PORT}）`);
  const { browserContextId } = await cdp.send("Target.createBrowserContext");
  const base = `http://127.0.0.1:${APP_PORT}/`;
  const p = await Page.open(cdp, base, browserContextId);
  check("タイトルが非公式アプリ", (await p.eval("document.title")).includes("非公式アプリ"));
  check("canonical・og:url が新しいドメイン", await p.eval(`document.querySelector('link[rel=canonical]').href === ${JSON.stringify(APP_URL)} && document.querySelector('meta[property="og:url"]').content === ${JSON.stringify(APP_URL)}`));
  check("OGP・Twitter のメタがある", await p.eval(`!!document.querySelector('meta[property="og:image"]') && !!document.querySelector('meta[name="twitter:card"]')`));
  check("マニフェストがあり、id が /", await p.eval(`(async () => { const l = document.querySelector('link[rel=manifest]'); if (!l) return false; const j = await (await fetch(l.href)).json(); return j.id === "/" && j.name.includes("非公式アプリ"); })()`));
  check("引っ越しの案内を出さない", !(await p.eval("!!document.querySelector('.migrate')")));
  check("サイドバーを出す（has-views）", await p.eval("document.documentElement.classList.contains('has-views')"));
  check("Service Worker が入り、ページを制御する", await p.waitFor("navigator.serviceWorker.controller?.scriptURL || false"));
  const cached = await p.waitFor(`(async () => { const k = ${SM27_CACHES}; const v = k.find((x) => /^sm27-v\\d+$/.test(x)); if (!v) return false; const c = await caches.open(v); return (await c.match(${JSON.stringify(base + "goods/index.html")})) && (await c.match(${JSON.stringify(base + "map/index.html")})) ? v : false; })()`, 30000);
  check("カレンダー・グッズ・マップをキャッシュに保存（" + cached + "）", cached);
  check("画像のキャッシュ（sm27-img）がある", await p.waitFor(`(await caches.keys()).includes("sm27-img")`));

  const g = await Page.open(cdp, base + "goods/", browserContextId);
  check("グッズを直接開いても「戻る」リンクが無い", await g.eval(`!document.querySelector('#gdFooter a[href="../"]') && !document.body.innerText.includes("へ戻る")`));

  state.appDown = true;
  await p.reload().catch(() => {});
  check("オフラインで読み込み直しても表示できる", await p.waitFor("document.documentElement.classList.contains('is-ready') && document.querySelector('#tt').children.length > 0"));
  await p.goto(base + "?view=goods").catch(() => {});
  check("オフラインでグッズ（?view=goods）も表示できる", await p.waitFor(`(() => { const f = [...document.querySelectorAll('iframe')].find((x) => x.src.includes('goods/')); return !!f?.contentDocument?.querySelector('#gdFooter')?.textContent; })()`));
  state.appDown = false;

  await p.goto(base);
  await p.waitFor("document.documentElement.classList.contains('is-ready')");
  await p.eval("document.querySelector('[data-refresh]').click()");
  const refreshed = await p.waitFor(`document.body.innerText.includes("更新に成功しました")`, 30000);
  check("更新ボタンで更新できる", refreshed);
  // 更新したそのページは制御されない（ブラウザの仕様の範囲。以前からの動き）。次に開いたときに制御されることを確かめる
  const back = await p.waitFor(`(async () => (await ${SM27_CACHES}).some((k) => /^sm27-v\\d+$/.test(k)) && !!(await navigator.serviceWorker.getRegistration())?.active)()`, 30000);
  check("更新のあと Service Worker が入り直し、キャッシュが戻る", back);
  await p.reload();
  check("更新のあと次に開くと Service Worker が制御する", await p.waitFor("!!navigator.serviceWorker.controller"));
  const errs = [...p.errors, ...g.errors].filter((e) => !/net::ERR_|Failed to fetch|fonts\.g/.test(e));
  check("コンソールにエラーが無い（オフライン中の取得失敗は除く）", errs.length === 0, errs.slice(0, 3).join(" / "));
  await cdp.send("Target.disposeBrowserContext", { browserContextId });
}

async function testPagesFresh(cdp) {
  console.log(`\n■ 旧サイト（:${PAGES_PORT}）：初めて開く人`);
  state.pages = "new";
  const { browserContextId } = await cdp.send("Target.createBrowserContext");
  const base = `http://127.0.0.1:${PAGES_PORT}/sm27calendar/`;
  const p = await Page.open(cdp, base, browserContextId);
  await p.waitFor("document.documentElement.classList.contains('is-ready')");
  await sleep(2000);
  await checkPagesPage(p);
  check("Service Worker を登録しない", !(await p.eval(`!!(await ${OWN_REG})`)));
  check("キャッシュ（sm27-）を作らない", (await p.eval(SM27_CACHES)).length === 0);
  await cdp.send("Target.disposeBrowserContext", { browserContextId });
}

async function checkPagesPage(p) {
  check("引っ越しの案内を出す", await p.waitFor("!!document.querySelector('.migrate')"));
  check("案内の文言", await p.eval(`document.querySelector('.migrate__text').innerText.replace(/\\s/g, "") === "マップ・グッズ・運行情報を追加！新サイトで再登録をお願いします。※旧サイトは12月末で終了します"`), await p.eval(`document.querySelector('.migrate__text')?.innerText`));
  check("案内に新しいドメインのURLを表示する", await p.eval(`document.querySelector('#migrateUrl')?.textContent === ${JSON.stringify(APP_URL)}`));
  await p.eval("document.querySelector('.migrate [data-copy]').click()");
  // クリップボードが使えないヘッドレスでは、URLを選ぶ表示になる（どちらでも押せたことになる）
  check("案内のボタンでURLをコピーする（できないときは選択）", await p.waitFor(`/コピーしました|URLを選びました/.test(document.querySelector('.migrate [data-copy]')?.textContent || '')`));
  check("案内の新しいアイコンが出る", await p.waitFor(`[...document.querySelectorAll('.migrate__icons img')].every((i) => i.complete && i.naturalWidth > 0)`));
  check("OGP・Twitter のメタが無い", await p.eval(`!document.querySelector('meta[property^="og:"], meta[name^="twitter:"]')`));
  check("canonical が新しいドメイン", await p.eval(`document.querySelector('link[rel=canonical]').href === ${JSON.stringify(APP_URL)}`));
  check("マニフェストが無い（リンク無し・404）", await p.eval(`!document.querySelector('link[rel=manifest]') && (await fetch("manifest.webmanifest")).status === 404`));
  check("インストールの案内を出さない", await p.eval(`!document.querySelector('.install:not([hidden])')`));
  check("サイドバーを出さない", await p.eval(`!document.documentElement.classList.contains('has-views')`));
  check("sw.js は解除用", await p.eval(`(await (await fetch("sw.js", { cache: "no-store" })).text()).includes("registration.unregister")`));
}

async function testPagesUpgrade(cdp) {
  console.log(`\n■ 旧サイト（:${PAGES_PORT}）：前の版（${OLD_REF}）の PWA を入れていた人`);
  state.pages = "old";
  const { browserContextId } = await cdp.send("Target.createBrowserContext");
  const base = `http://127.0.0.1:${PAGES_PORT}/sm27calendar/`;
  const hd = await Page.open(cdp, `http://127.0.0.1:${PAGES_PORT}/hokkaido_delay/`, browserContextId);
  check("（準備）同じオリジンの運行情報の見本の PWA が入る", await hd.waitFor(`(async () => !!(await navigator.serviceWorker.getRegistration())?.active && (await caches.keys()).includes("hd-test"))()`));
  const p = await Page.open(cdp, base, browserContextId);
  const oldCache = await p.waitFor(`(async () => !!navigator.serviceWorker.controller && (await ${SM27_CACHES}).find((k) => /^sm27-v\\d+$/.test(k)))()`, 30000);
  check(`（準備）前の版の PWA が入り、キャッシュがある（${oldCache}）`, oldCache);
  check("（準備）前の版では案内を出していない", !(await p.eval("!!document.querySelector('.migrate')")));

  // 旧サイトを新しい版に差し替え、1回だけ読み込み直す。解除用の sw.js が入り、キャッシュを消してページを読み込み直すはず
  state.pages = "new";
  const before = p.navs;
  await p.reload();
  const done = await p.waitFor(`(async () => !(await ${OWN_REG}) && (await ${SM27_CACHES}).length === 0 && !!document.querySelector('.migrate'))()`, 30000);
  check("1回の読み込み直しで、登録の解除・キャッシュの削除・新しい版の表示まで進む", done);
  check("解除用の sw.js がページを読み込み直した（ナビゲーション2回以上）", p.navs - before >= 2, `${p.navs - before}回`);
  // 差し替えの瞬間は、前の版のキャッシュのページ（マニフェストのリンクあり）が一度出るので、マニフェストの 404 が出る。ここまでのエラーはそれだけのはず
  const transit = p.errors.splice(0);
  check("差し替えの瞬間のエラーは、前の版のページが出すマニフェストの 404 だけ", transit.every((e) => /404.*manifest\.webmanifest/.test(e)), transit.join(" / "));
  check("同じオリジンの運行情報の PWA とキャッシュは残る", await hd.eval(`(async () => !!(await navigator.serviceWorker.getRegistration())?.active && (await caches.keys()).includes("hd-test"))()`));
  await checkPagesPage(p);

  await p.reload();
  await sleep(2000);
  check("もう一度開いても Service Worker・キャッシュが戻らない", !(await p.eval(`!!(await ${OWN_REG})`)) && (await p.eval(SM27_CACHES)).length === 0);

  await p.waitFor("document.documentElement.classList.contains('is-ready')");
  await p.eval("document.querySelector('[data-refresh]').click()");
  check("更新ボタンで更新できる", await p.waitFor(`document.body.innerText.includes("更新に成功しました")`, 30000));
  await sleep(1500);
  check("更新のあともキャッシュ（sm27-）・登録が無い", !(await p.eval(`!!(await ${OWN_REG})`)) && (await p.eval(SM27_CACHES)).length === 0);
  check("更新のあとも運行情報の PWA とキャッシュは残る", await hd.eval(`(async () => !!(await navigator.serviceWorker.getRegistration())?.active && (await caches.keys()).includes("hd-test"))()`));
  // マニフェストの 404 は、checkPagesPage が「404 であること」を確かめるために自分で取りに行った分
  const errs = p.errors.filter((e) => !/fonts\.g|404.*manifest\.webmanifest/.test(e));
  check("新しい版になってからはコンソールにエラーが無い", errs.length === 0, errs.slice(0, 3).join(" / "));
  await cdp.send("Target.disposeBrowserContext", { browserContextId });
}

function chromePath() {
  const c = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"];
  return c.find(existsSync);
}

build();
const servers = serve();
if (SERVE) {
  console.log(`\n新しいドメイン：http://127.0.0.1:${APP_PORT}/`);
  console.log(`旧サイト      ：http://127.0.0.1:${PAGES_PORT}/sm27calendar/（前の版から移行を試すときは http://127.0.0.1:${PAGES_PORT}/__switch?to=old で前の版を入れてから ?to=new）`);
  console.log("Ctrl+C で終了");
} else {
  const profile = join(OUT, "chrome");
  const chrome = spawn(chromePath(), ["--headless=new", `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
  let ws;
  for (let i = 0; i < 50 && !ws; i++) {
    await sleep(200);
    ws = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl).catch(() => null);
  }
  const cdp = await CDP.connect(ws);
  let fatal;
  try {
    await testApp(cdp);
    await testPagesFresh(cdp);
    await testPagesUpgrade(cdp);
  } catch (e) {
    fatal = e;
    console.error("\n中断：", e);
  }
  chrome.kill();
  servers.forEach((s) => s.close());
  const ng = results.filter((r) => !r.ok);
  console.log(`\n${results.length - ng.length}/${results.length} 件 OK${ng.length ? `、NG：${ng.map((r) => r.name).join("、")}` : ""}`);
  process.exit(ng.length || fatal ? 1 : 0);
}
