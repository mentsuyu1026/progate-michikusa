// michikusa - LLM担当(2人目)
// 地域名を Gemini に渡し、特色・歴史・文化の解説を構造化JSONで生成する共有ロジック。
// Vercel Function (api/describe.js) とローカルCLI (scripts/generate.mjs) の両方から使う。
//
// 依存ゼロ・Node18+ の標準 fetch のみで動く。APIキーは呼び出し側から渡す(env管理は呼び出し側の責務)。

// 使用する Gemini モデル(無料枠・高速)。必要なら GEMINI_MODEL env で上書き可。
const DEFAULT_MODEL = "gemini-2.0-flash";

// Gemini に「必ずこの形のJSONで返す」と強制するためのスキーマ。
// STEP2 で決めた出力フォーマット(history / food / souvenir / celebrity)に概要を足したもの。
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "その地域がどんな所か1〜2文の概要" },
    history: { type: "string", description: "ざっくりした歴史を2〜3文で" },
    food: { type: "string", description: "名産・グルメ(駅弁・名物料理など)" },
    souvenir: { type: "string", description: "おすすめのおみやげ・土産品" },
    celebrity: { type: "string", description: "その地域出身・ゆかりの有名人と、地域との繋がり" },
  },
  required: ["summary", "history", "food", "souvenir", "celebrity"],
};

/**
 * Gemini に渡すプロンプトを組み立てる。
 * リスク対策(仕様書9章): 不確かなことは断定させない。
 * @param {string} areaName 例: "東京都台東区浅草"
 */
export function buildPrompt(areaName) {
  return [
    `あなたは日本各地の観光案内に詳しいガイドです。`,
    `「${areaName}」について、その土地を初めて訪れた旅行者向けに、特色・歴史・文化をやさしく紹介してください。`,
    ``,
    `条件:`,
    `- 日本語で、親しみやすく簡潔に書く。`,
    `- 各項目は2〜3文程度におさめる。`,
    `- 確証のない事実や数字は断定せず、わかる範囲で無理のない説明にする。`,
    `- 地名が曖昧で特定できない場合は、その地域一帯の一般的な特色を述べる。`,
  ].join("\n");
}

/**
 * 地域名から構造化された解説JSONを生成する。
 * @param {string} areaName 地域名
 * @param {object} [opts]
 * @param {string} [opts.apiKey] Gemini APIキー(未指定なら process.env.GEMINI_API_KEY)
 * @param {string} [opts.model] モデル名(未指定なら GEMINI_MODEL env か既定値)
 * @param {typeof fetch} [opts.fetchImpl] テスト用の fetch 差し替え
 * @returns {Promise<{areaName:string, summary:string, history:string, food:string, souvenir:string, celebrity:string, description:string}>}
 */
export async function generateAreaDescription(areaName, opts = {}) {
  const name = (areaName ?? "").trim();
  if (!name) {
    throw new Error("areaName が空です。地域名を指定してください。");
  }

  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini APIキーがありません。環境変数 GEMINI_API_KEY を設定してください(.env.example 参照)。"
    );
  }

  const model = opts.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: buildPrompt(name) }] }],
    generationConfig: {
      temperature: 0.7,
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
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini から有効な応答が得られませんでした。");
  }

  // responseSchema 指定時も念のため try/catch でパースエラーに備える(仕様書STEP5)。
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`応答のJSONパースに失敗しました: ${text.slice(0, 300)}`);
  }

  // フロント互換用に description(解説本文)を組み立てる。
  const description = [
    parsed.summary,
    `【歴史】${parsed.history}`,
    `【名産・グルメ】${parsed.food}`,
    `【おみやげ】${parsed.souvenir}`,
    `【ゆかりの有名人】${parsed.celebrity}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    areaName: name,
    summary: parsed.summary ?? "",
    history: parsed.history ?? "",
    food: parsed.food ?? "",
    souvenir: parsed.souvenir ?? "",
    celebrity: parsed.celebrity ?? "",
    description,
  };
}
