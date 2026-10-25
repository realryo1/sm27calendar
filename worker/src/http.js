// 事業者サイトへの取得で共通に使う設定
// User-Agent はブラウザを装わず、プロジェクト名と連絡先（公開サイトの URL）を明記する
export const USER_AGENT =
  "sm27calendar-delay/0.1 (+https://realryo1.github.io/sm27calendar/; unofficial fan project; 5min interval)";

// 1つの事業者が応答しなくても全体が止まらないよう、取得ごとに上限時間を設ける
const TIMEOUT_MS = 8000;

export async function get(url, { type = "text" } = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: type === "json" ? "application/json" : "text/html" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const text = await res.text();
  if (type !== "json") return text;
  // JR北海道の JSON は先頭に BOM が付いている
  return JSON.parse(text.replace(/^﻿/, ""));
}
