// SNOWMIKU2027 非公式カレンダー 運行情報 Worker
// - scheduled：Cron（5分ごと）で各事業者から取得し、KV に1本の JSON として保存する
// - fetch：KV の JSON を CORS ヘッダー付きで返す（閲覧が増えても事業者へのアクセスは Cron の回数のまま）
// - /health：外部の監視サービス向け。異常があれば 503 を返す（KV を読むだけで、事業者へは取りに行かない）
import { collect, jstIso } from "./collect.js";

const KEY = "status";
// wrangler.toml の crons と合わせる（次回の予定時刻 next_update_at の計算に使う）
const INTERVAL_MIN = 5;
// /health の判定。Cron が3回続けて動かない、または同じ事業者で3回続けて取得に失敗したら異常とする
const HEALTH_STALE_MIN = INTERVAL_MIN * 3 + 2;
const HEALTH_FAIL_COUNT = 3;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body, status, cacheControl) {
  return new Response(body, {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": cacheControl },
  });
}

// 異常（503 にする）：更新が止まっている／同じ事業者で続けて取得に失敗している／一部が読めない（構造変更の疑い）
// 1回だけの取得失敗は一時的なことが多いので 503 にはせず、notes に載せるだけにする
function health(data) {
  const problems = [];
  const notes = [];
  const age = (Date.now() - Date.parse(data.updated_at)) / 60000;
  if (!(age < HEALTH_STALE_MIN)) problems.push(`更新が止まっている（最終更新 ${data.updated_at}）`);
  const failCount = Object.fromEntries(Object.entries(data.services || {}).map(([id, svc]) => [id, svc.fail_count || 0]));
  for (const e of data.meta?.source_errors || []) {
    const text = `${e.id}: ${e.message}（${failCount[e.id]}回連続）`;
    (failCount[e.id] >= HEALTH_FAIL_COUNT ? problems : notes).push(text);
  }
  for (const w of data.meta?.source_warnings || []) problems.push(`${w.id}: ${w.message}`);
  return { ok: problems.length === 0, updated_at: data.updated_at, problems, notes };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const prev = await env.DELAY_KV.get(KEY, "json").catch(() => null);
        const next = await collect(prev);
        // scheduledTime はこの回の予定時刻（例 21:02:00）。次の回はその INTERVAL_MIN 分後
        next.next_update_at = jstIso(new Date(event.scheduledTime + INTERVAL_MIN * 60000));
        await env.DELAY_KV.put(KEY, JSON.stringify(next));
      })()
    );
  },

  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return json('{"error":"method not allowed"}', 405, "no-store");

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      const data = await env.DELAY_KV.get(KEY, "json").catch(() => null);
      if (!data) return json('{"ok":false,"problems":["KV にデータがない"]}', 503, "no-store");
      const h = health(data);
      return json(JSON.stringify(h), h.ok ? 200 : 503, "no-store");
    }
    if (url.pathname !== "/" && url.pathname !== "/status.json") return json('{"error":"not found"}', 404, "no-store");

    // エッジのキャッシュで KV の読み取り回数も抑える（Cron が5分ごとなので60秒で十分新しい）
    const cacheKey = new Request(`${url.origin}/status.json`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const body = await env.DELAY_KV.get(KEY).catch(() => null);
    // 初回デプロイ直後で Cron がまだ一度も動いていないときは 503（ここで事業者へ取りに行くことはしない）
    if (!body) return json('{"error":"not ready"}', 503, "no-store");

    const res = json(body, 200, "public, max-age=60, stale-while-revalidate=300");
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
