// michikusa - Vercel Function: POST /api/food-stamp
//   リクエスト: { image: string(dataURL または base64), areaName?: string }
//   レスポンス: { isFood, dishName, oneLine, specialties[], nextDish }
// APIキーは環境変数 GEMINI_API_KEY からサーバー側でのみ読む。

import { recognizeFood } from "./_lib/foodStamp.js";

type ApiRequest = {
  method?: string;
  body?: unknown;
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
};

type Body = {
  image?: string;
  areaName?: string;
};

/** データURL（data:image/jpeg;base64,xxxx）なら接頭辞を外して base64 部分だけにする。 */
function stripDataUrl(image: string): string {
  const comma = image.indexOf(",");
  return image.startsWith("data:") && comma >= 0 ? image.slice(comma + 1) : image;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST のみ対応しています。" });
    return;
  }

  try {
    const body: Body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body as Body) ?? {};

    const { image, areaName } = body;
    if (!image) {
      res.status(400).json({ error: "image（写真）が必要です。" });
      return;
    }

    const result = await recognizeFood(stripDataUrl(image), areaName);
    res.status(200).json(result);
  } catch (err) {
    console.error("[/api/food-stamp] error:", err);
    const message = err instanceof Error ? err.message : "料理の認識に失敗しました。";
    res.status(500).json({ error: message });
  }
}
