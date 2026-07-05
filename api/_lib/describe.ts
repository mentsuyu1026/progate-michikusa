// michikusa - LLM担当(2人目)
// 地域名を Gemini に渡し、特色・歴史・文化の解説を構造化JSONで生成する共有ロジック。
// Vercel Function (api/describe.ts) とローカルCLI (scripts/generate.mjs) の両方から使う。
//
// 依存ゼロ・Node18+ の標準 fetch のみで動く。APIキーは呼び出し側から渡す(env管理は呼び出し側の責務)。

/**
 * 各項目に対応する画像検索キーワード。
 * フロントがこの語で実写(Wikimedia等)を検索して各カードに表示する。
 * 具体的な固有名詞を含む(例: 「浅草 雷門」)ことでヒット率を上げる狙い。
 */
export type AreaImageQueries = {
  summary: string;
  history: string;
  food: string;
  souvenir: string;
  celebrity: string;
};

/** ふらっと来た人向けの提案（2000円以内・徒歩20分以内）。 */
export type WanderPick = {
  name: string;
  price: string; // ¥表記の目安（無料なら「無料」）
  walkMin: number; // 徒歩目安（分）
  note: string;
};

/** その地域で使えるお得・メリットのあるサービス。 */
export type LocalDeal = {
  title: string;
  detail: string;
};

/** 生成された解説の構造化結果。STEP2フォーマット + フロント互換フィールド。 */
export type AreaDescription = {
  areaName: string;
  summary: string;
  history: string;
  food: string;
  souvenir: string;
  celebrity: string;
  description: string;
  /** 各項目の画像検索キーワード(実写取得用) */
  images: AreaImageQueries;
  /** ふらっと来た人向けの提案（2000円以内・徒歩20分以内） */
  wanderPicks: WanderPick[];
  /** その地域で使えるお得・メリットのあるサービス */
  deals: LocalDeal[];
};

export type VisitHistoryItem = {
  areaName: string;
}

type GenerateOptions = {
  /** Gemini APIキー(未指定なら process.env.GEMINI_API_KEY) */
  apiKey?: string;
  /** モデル名(未指定なら GEMINI_MODEL env か既定値) */
  model?: string;
  /** テスト用の fetch 差し替え */
  fetchImpl?: typeof fetch;
  history?: VisitHistoryItem[];
};

/** Gemini が返す生のJSON(description はこちらでは作らない)。 */
type GeminiPayload = {
  summary: string;
  history: string;
  food: string;
  souvenir: string;
  celebrity: string;
  images: AreaImageQueries;
  wanderPicks: WanderPick[];
  deals: LocalDeal[];
};

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
    // 各項目に合う実写を探すための画像検索キーワード。固有名詞を含めてヒット率を上げる。
    images: {
      type: "object",
      description: "各項目に対応する画像検索キーワード(日本語1〜4語、固有名詞を含める)",
      properties: {
        summary: { type: "string", description: "その地域を象徴する代表的な風景・ランドマークの検索語(例: 浅草 雷門)" },
        history: { type: "string", description: "歴史を象徴する史跡・建造物の検索語" },
        food: { type: "string", description: "名産・グルメの料理名を含む検索語(例: 浅草 もんじゃ焼き)" },
        souvenir: { type: "string", description: "おみやげの品名を含む検索語(例: 雷おこし)" },
        celebrity: { type: "string", description: "ゆかりの有名人の氏名(例: 葛飾北斎)" },
      },
      required: ["summary", "history", "food", "souvenir", "celebrity"],
    },
    wanderPicks: {
      type: "array",
      description:
        "目的なくふらっと来た人向けに、予算2000円以内・現在地から徒歩20分以内で気軽に楽しめる提案を3つ",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "提案名(店・料理・立ち寄り先)" },
          price: {
            type: "string",
            description: "目安の値段(¥表記、2000円以内。無料なら「無料」)",
          },
          walkMin: {
            type: "integer",
            description: "現在地からの目安徒歩分(20以内)",
          },
          note: { type: "string", description: "ひとことおすすめ理由" },
        },
        required: ["name", "price", "walkMin", "note"],
      },
    },
    deals: {
      type: "array",
      description:
        "その地域で使えるお得・メリットのあるサービス(割引・無料スポット・お得な過ごし方など)を2〜3つ",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "お得・メリットの名前" },
          detail: { type: "string", description: "内容を1〜2文で" },
        },
        required: ["title", "detail"],
      },
    },
  },
  required: [
    "summary",
    "history",
    "food",
    "souvenir",
    "celebrity",
    "images",
    "wanderPicks",
    "deals",
  ],
};

/**
 * Gemini に渡すプロンプトを組み立てる。
 * リスク対策(仕様書9章): 不確かなことは断定させない。
 */
export function buildPrompt(areaName: string, history: VisitHistoryItem[] = []): string {
  const lines = [
    `あなたは日本各地の観光案内に詳しいガイドです。`,
    `「${areaName}」について、その土地を初めて訪れた旅行者向けに、特色・歴史・文化をやさしく紹介してください。`,
    ``,
    `このアプリの利用者は「目的なくふらっと立ち寄った人」です。肩ひじ張らず、気軽に楽しめる提案を重視してください。`,
    ``,
    `条件:`,
    `- 日本語で、親しみやすく簡潔に書く。`,
    `- 各項目は2〜3文程度におさめる。`,
    `- 確証のない事実や数字は断定せず、わかる範囲で無理のない説明にする。`,
    `- 地名が曖昧で特定できない場合は、その地域一帯の一般的な特色を述べる。`,
  ];

  // 履歴がある場合のみ、繋がりを踏まえる指示を追加する。
  if (history.length > 0) {
    const historyText = history.map((h) => `- ${h.areaName}`).join("\n");
    lines.push(
      ``,
      `この旅行者がこれまでに訪れた場所:`,
      historyText,
      ``,
      `- summary の中で、上の訪問先の中に現在地と地理的・歴史的・文化的な繋がりがある場所があれば、`,
      `  「以前訪れた○○と…」のように、さりげなく一言だけ触れてください。`,
      `- 繋がりが見当たらない場合は、無理に触れず通常の解説にしてください。`
    );
  }

  lines.push(
    ``,
    `- さらに images として、各項目に合う実写を画像検索で見つけるためのキーワードを付ける。`,
    `  ・できるだけ「固有名詞そのもの」を1語で指定する(建造物名・料理名・商品名・人物名)。`,
    `    例: 歴史→「所沢航空発祥記念館」、グルメ→「狭山茶」、土産→「雷おこし」、有名人→「宮崎駿」。`,
    `  ・各項目で必ず別々の被写体を選ぶ(4枚が同じ建物・同じ写真にならないようにする)。`,
    `  ・「所沢 歴史」「所沢 グルメ」のような『地名+カテゴリ語』は避ける。`,
    `    (その市の代表記事に集中して全部同じ写真になりやすいため)`,
    `  ・有名な対象が思いつかない項目は、無理に地名を足さず、その分野で最も知られた固有名詞にする。`
  );

  lines.push(
    ``,
    `さらに、ふらっと来た人向けに次の2つを付けてください:`,
    `- wanderPicks: 予算2000円以内・現在地から徒歩20分以内で楽しめる、気軽な食べ物や立ち寄り先を3つ。`,
    `  各 price は2000円以内の目安(無料なら「無料」)、walkMin は20以内の徒歩目安分にする。`,
    `- deals: その地域で使えるお得・メリットのあるサービス(割引・無料の見どころ・お得な過ごし方など)を2〜3つ。`,
    `  実在が不確かな店名や金額は断定せず、その街で見つけやすい・ありがちなお得を無理のない範囲で挙げる。`
  );

  return lines.join("\n");
}

/**
 * 地域名から構造化された解説JSONを生成する。
 */
export async function generateAreaDescription(
  areaName: string,
  opts: GenerateOptions = {}
): Promise<AreaDescription> {
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
    contents: [{ parts: [{ text: buildPrompt(name, opts.history ?? []) }] }],
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

  // responseSchema 指定時も念のため try/catch でパースエラーに備える(仕様書STEP5)。
  let parsed: GeminiPayload;
  try {
    parsed = JSON.parse(text) as GeminiPayload;
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

  // 画像クエリが欠けても落ちないようフォールバック(地域名+項目名で最低限の検索語にする)。
  const img = parsed.images ?? ({} as Partial<AreaImageQueries>);
  const images: AreaImageQueries = {
    summary: img.summary || name,
    history: img.history || `${name} 歴史 史跡`,
    food: img.food || `${name} 名物 料理`,
    souvenir: img.souvenir || `${name} お土産`,
    celebrity: img.celebrity || `${name} 出身 有名人`,
  };

  // ふらっと向けの提案・お得情報（欠けても落ちないよう配列にフォールバック）。
  const wanderPicks = Array.isArray(parsed.wanderPicks) ? parsed.wanderPicks : [];
  const deals = Array.isArray(parsed.deals) ? parsed.deals : [];

  return {
    areaName: name,
    summary: parsed.summary ?? "",
    history: parsed.history ?? "",
    food: parsed.food ?? "",
    souvenir: parsed.souvenir ?? "",
    celebrity: parsed.celebrity ?? "",
    description,
    images,
    wanderPicks,
    deals,
  };
}
