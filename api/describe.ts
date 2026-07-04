// michikusa - LLM担当(2人目)
// Vercel Function: POST /api/describe
//
// 仕様書6章のインターフェイスに準拠しつつ、今回は「地域名 → 解説JSON」のコア部分を実装。
//   リクエスト: { areaName: string }                  ← 地域名を直接渡す(今回のメイン)
//   リクエスト: { lat: number, lng: number }          ← GPS担当との結合用(Nominatim逆ジオは別途連携予定)
//   レスポンス: { areaName, summary, history, food, souvenir, celebrity, description }
//
// APIキーはフロントに出さず、Vercelの環境変数 GEMINI_API_KEY からサーバー側でのみ読む(仕様書9章)。

import { generateAreaDescription } from "./_lib/describe.js";

// @vercel/node に依存せず動かすための最小限の型(req/res の使う部分だけ)。
type ApiRequest = {
  method?: string;
  body?: unknown;
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
};

type DescribeBody = {
  areaName?: string;
  lat?: number;
  lng?: number;
};

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST のみ対応しています。" });
    return;
  }

  try {
    // Vercel は JSON ボディを自動パースするが、文字列で来る場合に備えて両対応。
    const body: DescribeBody =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body as DescribeBody) ?? {};
    let { areaName } = body;
    const { lat, lng } = body;

    // 座標が来た場合は逆ジオコーディングで地域名に変換(Nominatim連携)。
    if (!areaName && lat != null && lng != null) {
      areaName = await reverseGeocode(lat, lng);
    }

    if (!areaName) {
      res.status(400).json({ error: "areaName(地域名)または lat/lng(座標)が必要です。" });
      return;
    }

    const result = await generateAreaDescription(areaName);
    res.status(200).json(result);
  } catch (err) {
    // レスポンスが崩れたとき等のエラーハンドリング(仕様書STEP5)。
    console.error("[/api/describe] error:", err);
    const message = err instanceof Error ? err.message : "解説の生成に失敗しました。";
    res.status(500).json({ error: message });
  }
}

/**
 * Nominatim(OpenStreetMap)で座標 → 地域名に変換する。
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}` +
    `&accept-language=ja&zoom=14`;

  const res = await fetch(url, {
    // Nominatim は User-Agent 必須。
    headers: { "User-Agent": "michikusa/0.1 (hackathon demo)" },
  });
  if (!res.ok) {
    throw new Error(`Nominatim エラー (HTTP ${res.status})`);
  }
  const data = await res.json();
  const a = data?.address ?? {};
  // 都道府県＋市区町村＋地区くらいの粒度で地名を組み立てる。
  const name = [a.province ?? a.state, a.city ?? a.town ?? a.county, a.suburb ?? a.neighbourhood]
    .filter(Boolean)
    .join("");
  return name || data?.display_name || "";
}
