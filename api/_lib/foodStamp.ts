// michikusa - グルメスタンプ用の画像認識ロジック（Gemini Vision）
// 料理写真 → 料理名・一言・その土地の名物・次の一品 を構造化JSONで返す。
// 依存ゼロ・Node18+ の標準 fetch のみ。APIキーは環境変数 GEMINI_API_KEY から読む。

export type FoodRecognition = {
  isFood: boolean;
  dishName: string;
  oneLine: string;
  specialties: string[];
  nextDish: string;
};

type Options = {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

const DEFAULT_MODEL = "gemini-2.0-flash";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    isFood: { type: "boolean", description: "写真に食べ物・料理が写っているか" },
    dishName: { type: "string", description: "料理名（分かる範囲で。一般名でOK）" },
    oneLine: { type: "string", description: "その料理の魅力を1文で" },
    specialties: {
      type: "array",
      items: { type: "string" },
      description: "その土地の名物料理を3〜5個",
    },
    nextDish: { type: "string", description: "次に食べてほしいおすすめの一品" },
  },
  required: ["isFood", "dishName", "oneLine", "specialties", "nextDish"],
};

function buildPrompt(areaName?: string): string {
  return [
    "あなたは日本の食文化にくわしい食べ歩きガイドです。",
    "送られた写真に写っている料理を1つ特定してください。",
    areaName ? `撮影地はおそらく「${areaName}」です。` : "",
    "次の条件でJSONを返してください：",
    "- isFood: 料理・食べ物が写っていれば true、そうでなければ false",
    "- dishName: 料理名（分かる範囲で。一般名でよい）",
    "- oneLine: その料理の魅力を1文で、親しみやすく",
    areaName
      ? `- specialties: 「${areaName}」の名物料理を3〜5個`
      : "- specialties: 写っている料理に関連するご当地の名物を3〜5個",
    "- nextDish: まだ食べていない人へ、次におすすめの一品を1つ",
    "確証のないことは断定せず、無理のない範囲で答えてください。",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 料理写真（base64、データURLの接頭辞なし）を認識する。 */
export async function recognizeFood(
  imageBase64: string,
  areaName?: string,
  opts: Options = {}
): Promise<FoodRecognition> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini APIキーがありません。環境変数 GEMINI_API_KEY を設定してください。"
    );
  }

  const model = opts.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: buildPrompt(areaName) },
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini API エラー (HTTP ${res.status}): ${detail.slice(0, 500)}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini から有効な応答が得られませんでした。");
  }

  let parsed: Partial<FoodRecognition>;
  try {
    parsed = JSON.parse(text) as Partial<FoodRecognition>;
  } catch {
    throw new Error(`応答のJSONパースに失敗しました: ${text.slice(0, 300)}`);
  }

  return {
    isFood: Boolean(parsed.isFood),
    dishName: parsed.dishName ?? "",
    oneLine: parsed.oneLine ?? "",
    specialties: Array.isArray(parsed.specialties) ? parsed.specialties : [],
    nextDish: parsed.nextDish ?? "",
  };
}
