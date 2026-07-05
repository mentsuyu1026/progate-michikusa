// michikusa - 画像解説 API
// Vercel Function: POST /api/describe-image
//
//   リクエスト: { image: string(base64), mimeType: string, lat: number, lng: number }
//   もしくは:  { image: string(base64), mimeType: string, areaName: string }
//   レスポンス: { areaName, summary, subject, context, description }

import { generateImageDescription } from "./_lib/describeImage.js";

type ApiRequest = {
    method?: string;
    body?: unknown;
};
type ApiResponse = {
    status: (code: number) => ApiResponse;
    json: (data: unknown) => void;
};

type DescribeImageBody = {
    // 複数画像(推奨)。もしくは単一の image + mimeType(後方互換)。
    images?: { data?: string; mimeType?: string }[];
    image?: string;
    mimeType?: string;
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
        const body: DescribeImageBody =
            typeof req.body === "string"
                ? JSON.parse(req.body || "{}")
                : (req.body as DescribeImageBody) ?? {};

        const { images, image, mimeType, lat, lng } = body;
        let { areaName } = body;

        // 複数画像(images)を優先。無ければ単一の image + mimeType を1枚として扱う。
        const imgs =
            images && images.length > 0
                ? images
                      .filter((im): im is { data: string; mimeType: string } =>
                          Boolean(im?.data && im?.mimeType),
                      )
                      .slice(0, 4) // 送りすぎ防止(最大4枚)
                : image && mimeType
                  ? [{ data: image, mimeType }]
                  : [];

        if (imgs.length === 0) {
            res.status(400).json({ error: "image(base64)と mimeType、または images 配列が必要です。" });
            return;
        }

        if (!areaName && lat != null && lng != null) {
            areaName = await reverseGeocode(lat, lng);
        }

        if (!areaName) {
            res.status(400).json({ error: "areaName(地域名)または lat/lng(座標)が必要です。" });
            return;
        }

        const result = await generateImageDescription(imgs, areaName);
        res.status(200).json(result);
    } catch (err) {
        console.error("[/api/describe-image] error:", err);
        const message = err instanceof Error ? err.message : "画像解説の生成に失敗しました。";
        res.status(500).json({ error: message });
    }
}

/**
 * Nominatim(OpenStreetMap)で座標 → 地域名に変換する。
 * describe.ts と同じ実装。共通化するなら後で _lib/reverseGeocode.ts に切り出し。
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
        `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}` +
        `&accept-language=ja&zoom=14`;

    const res = await fetch(url, {
        headers: { "User-Agent": "michikusa/0.1 (hackathon demo)" },
    });
    if (!res.ok) {
        throw new Error(`Nominatim エラー (HTTP ${res.status})`);
    }
    const data = await res.json();
    const a = data?.address ?? {};
    const name = [a.province ?? a.state, a.city ?? a.town ?? a.county, a.suburb ?? a.neighbourhood]
        .filter(Boolean)
        .join("");
    return name || data?.display_name || "";
}