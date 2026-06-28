import type { AreaDescription, Coords } from "../types";

// API 呼び出し。
// ※ LLM担当が本実装（/api/describe への POST）を書く予定。
//    今はフロントだけで動作確認できるよう、ダミーデータを返している。
export function useDescribe() {
  const fetchDescribe = async (coords: Coords): Promise<AreaDescription> => {
    // ===== ↓↓↓ ダミー実装（動作確認用）。本番ができたらこのブロックを丸ごと消す ↓↓↓ =====
    await new Promise((r) => setTimeout(r, 1500)); // ローディング画面を見せるための擬似待ち
    console.log("取得した座標:", coords);

    //===== 本番実装（LLM担当）：上のダミーを消して、下のコメントを有効化する =====
    const res = await fetch("/api/describe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coords), // ← API が期待する形は LLM担当と要相談
    });
    if (!res.ok) {
      throw new Error("APIエラー: " + res.status);
    }
    return (await res.json()) as AreaDescription;
  };

  return { fetchDescribe };
}
