// 全事業者から並行して取得し、1本の JSON にまとめる
// 取得に失敗した事業者は前回成功時のデータを残したまま ok: false にし、meta.source_errors に記録する（段階的縮退）
import { fetchJr } from "./sources/jr.js";
import { fetchSubway } from "./sources/subway.js";
import { fetchAirport } from "./sources/airport.js";

export const SCHEMA_VERSION = 1;

const SOURCES = [
  { id: "jr", name: "JR北海道", url: "https://www3.jrhokkaido.co.jp/webunkou/", run: fetchJr },
  { id: "subway", name: "札幌市営地下鉄", url: "https://operationstatus.city.sapporo.jp/unkojoho/", run: fetchSubway },
  { id: "airport", name: "新千歳空港（国内線）", url: "https://www.hokkaido-airports.com/ja/new-chitose/airport/fis/", run: fetchAirport },
];

// 日本時間の ISO 文字列（例 2027-02-06T10:30:00+09:00）
export function jstIso(date = new Date()) {
  const t = new Date(date.getTime() + 9 * 3600 * 1000);
  return `${t.toISOString().slice(0, 19)}+09:00`;
}

export async function collect(prev = null) {
  const now = jstIso();
  const results = await Promise.allSettled(SOURCES.map((s) => s.run()));
  const services = {};
  const errors = [];

  SOURCES.forEach((s, i) => {
    const r = results[i];
    const base = { name: s.name, url: s.url };
    if (r.status === "fulfilled") {
      services[s.id] = { ...base, ok: true, fetched_at: now, last_success_at: now, ...r.value };
      return;
    }
    errors.push({ id: s.id, message: String(r.reason?.message || r.reason).slice(0, 200) });
    const old = prev?.services?.[s.id];
    services[s.id] = old
      ? { ...old, ...base, ok: false, fetched_at: now }
      : { ...base, ok: false, fetched_at: now, last_success_at: null };
  });

  return {
    version: SCHEMA_VERSION,
    updated_at: now,
    services,
    meta: { source_errors: errors, fallback_active: errors.length > 0 },
  };
}
