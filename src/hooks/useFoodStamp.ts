import { useCallback } from "react";
import type { FoodRecognition } from "../types";

// グルメ認識APIのエンドポイント（Vercel Function）。
const API_URL = "/api/food-stamp";

/**
 * 料理写真をサーバー（Gemini Vision）に送って認識結果を得るフック。
 * useDescribe と同じく state は持たず Promise を返す関数だけを提供する。
 */
export function useFoodStamp() {
  const recognize = useCallback(
    async (imageDataUrl: string, areaName?: string): Promise<FoodRecognition> => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl, areaName }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `APIエラー (HTTP ${res.status})`);
      }

      return (await res.json()) as FoodRecognition;
    },
    []
  );

  return { recognize };
}
