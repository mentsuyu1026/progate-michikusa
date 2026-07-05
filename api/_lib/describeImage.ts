// michikusa - 画像解説の共有ロジック。
// 画像(base64) + 座標 → Gemini マルチモーダルで解説JSONを生成する。
// describe.ts と対称の作りにしてある。

export type ImageDescription = {
    areaName: string;
    summary: string;
    subject: string;
    context: string;
    description: string;
};

type GenerateOptions = {
    apiKey?: string;
    model?: string;
    fetchImpl?: typeof fetch;
};

type GeminiPayload = {
    summary: string;
    subject: string;
    context: string;
};

// マルチモーダル対応の Gemini モデル。
const DEFAULT_MODEL = "gemini-2.0-flash";

// 「必ずこの形のJSONで返す」ためのスキーマ。
const RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        summary: { type: "string", description: "写っているものと土地の関連を1〜2文で" },
        subject: { type: "string", description: "写真の被写体の説明。特定できないときは風景として説明" },
        context: { type: "string", description: "撮影地の文脈(その地域の特色や歴史)を2〜3文で" },
    },
    required: ["summary", "subject", "context"],
};

/**
 * プロンプト。特定できないときに無理をせず「風景として」語らせるのがポイント。
 */
export function buildImagePrompt(areaName: string): string {
    return [
        `あなたは日本各地の観光案内に詳しいガイドです。`,
        `添付された写真は「${areaName}」付近で撮影されました。`,
        `写真の被写体を、その土地の文脈と絡めて旅行者向けにやさしく紹介してください。`,
        ``,
        `条件:`,
        `- 日本語で、親しみやすく簡潔に書く。`,
        `- 被写体が有名なランドマークや料理、看板の文字などから特定できる場合は、その名称を明示する。`,
        `- 特定できない場合は「風景」「街並み」「山並み」など見えるものの一般的な説明にとどめ、無理に名称を推測しない。`,
        `- 確証のない事実や数字は断定せず、わかる範囲で無理のない説明にする。`,
        `- 各項目は2〜3文程度におさめる。`,
    ].join("\n");
}

/**
 * 画像 + 地域名から構造化された解説JSONを生成する。
 */
export async function generateImageDescription(
    imageBase64: string,
    mimeType: string,
    areaName: string,
    opts: GenerateOptions = {}
): Promise<ImageDescription> {
    const name = (areaName ?? "").trim();
    if (!name) {
        throw new Error("areaName が空です。地域名を指定してください。");
    }
    if (!imageBase64) {
        throw new Error("画像データがありません。");
    }
    if (!mimeType) {
        throw new Error("画像の mimeType がありません。");
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
        contents: [
            {
                parts: [
                    { inlineData: { mimeType, data: imageBase64 } },
                    { text: buildImagePrompt(name) },
                ],
            },
        ],
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
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Gemini から有効な応答が得られませんでした。");
    }

    let parsed: GeminiPayload;
    try {
        parsed = JSON.parse(text) as GeminiPayload;
    } catch {
        throw new Error(`応答のJSONパースに失敗しました: ${text.slice(0, 300)}`);
    }

    // フロント互換用に description を組み立てる。
    const description = [
        parsed.summary,
        `【写っているもの】${parsed.subject}`,
        `【この土地について】${parsed.context}`,
    ]
        .filter(Boolean)
        .join("\n\n");

    return {
        areaName: name,
        summary: parsed.summary ?? "",
        subject: parsed.subject ?? "",
        context: parsed.context ?? "",
        description,
    };
}