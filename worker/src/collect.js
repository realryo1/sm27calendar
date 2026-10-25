// 全事業者から並行して取得し、1本の JSON にまとめる
// 取得に失敗した事業者は前回成功時のデータを残したまま ok: false にし、meta.source_errors に記録する（段階的縮退）
// 取得はできたが一部が読めない（事業者側の構造変更の疑い）ときは、各 sources が warnings を返し、meta.source_warnings に記録する
// fail_count は連続で失敗した回数（成功したら0に戻る）。/health の判定に使う
import { fetchJr } from "./sources/jr.js";
import { fetchSubway } from "./sources/subway.js";
import { fetchAirport } from "./sources/airport.js";
import { fetchExpressway } from "./sources/expressway.js";
import { jstIso } from "./http.js";

export { jstIso };

export const SCHEMA_VERSION = 1;

const SOURCES = [
  { id: "jr", name: "JR北海道", url: "https://www3.jrhokkaido.co.jp/webunkou/", run: fetchJr },
  { id: "subway", name: "札幌市営地下鉄", url: "https://operationstatus.city.sapporo.jp/unkojoho/", run: fetchSubway },
  { id: "airport", name: "新千歳空港（国内線）", url: "https://www.hokkaido-airports.com/ja/new-chitose/airport/fis/", run: fetchAirport },
  { id: "expressway", name: "高速道路（アイハイウェイ）", url: "https://ihighway.jp/", run: fetchExpressway },
];

export async function collect(prev = null) {
  const now = jstIso();
  const results = await Promise.allSettled(SOURCES.map((s) => s.run()));
  const services = {};
  const errors = [];
  const warnings = [];

  SOURCES.forEach((s, i) => {
    const r = results[i];
    const base = { name: s.name, url: s.url };
    if (r.status === "fulfilled") {
      const { warnings: w = [], ...value } = r.value;
      for (const message of w) warnings.push({ id: s.id, message });
      services[s.id] = { ...base, ok: true, fetched_at: now, last_success_at: now, fail_count: 0, ...value };
      return;
    }
    errors.push({ id: s.id, message: String(r.reason?.message || r.reason).slice(0, 200) });
    const old = prev?.services?.[s.id];
    const fail_count = (old?.fail_count || 0) + 1;
    services[s.id] = old
      ? { ...old, ...base, ok: false, fetched_at: now, fail_count }
      : { ...base, ok: false, fetched_at: now, last_success_at: null, fail_count };
  });

  return {
    version: SCHEMA_VERSION,
    updated_at: now,
    services,
    meta: { source_errors: errors, source_warnings: warnings, fallback_active: errors.length > 0 },
  };
}
