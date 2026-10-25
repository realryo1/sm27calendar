// SNOWMIKU2027 非公式カレンダー 運行情報 Worker
// - scheduled：Cron（5分ごと）で各事業者から取得し、KV に1本の JSON として保存する
// - fetch：KV の JSON を CORS ヘッダー付きで返す（閲覧が増えても事業者へのアクセスは Cron の回数のまま）
import { collect } from "./collect.js";

const KEY = "status";

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

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const prev = await env.DELAY_KV.get(KEY, "json").catch(() => null);
        const next = await collect(prev);
        await env.DELAY_KV.put(KEY, JSON.stringify(next));
      })()
    );
  },

  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return json('{"error":"method not allowed"}', 405, "no-store");

    const url = new URL(request.url);
    if (url.pathname !== "/" && url.pathname !== "/status.json") return json('{"error":"not found"}', 404, "no-store");

    // エッジのキャッシュで KV の読み取り回数も抑える（Cron が5分ごとなので60秒で十分新しい）
    const cacheKey = new Request(`${url.origin}/status.json`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const body = await env.DELAY_KV.get(KEY);
    // 初回デプロイ直後で Cron がまだ一度も動いていないときは 503（ここで事業者へ取りに行くことはしない）
    if (!body) return json('{"error":"not ready"}', 503, "no-store");

    const res = json(body, 200, "public, max-age=60, stale-while-revalidate=300");
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
