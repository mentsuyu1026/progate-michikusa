<<<<<<< HEAD
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
=======
import { useCallback } from 'react';
import type { Coordinates, AreaDescription } from '../types';

type UseDescribeReturn = {
    fetchDescribe: (coords: Coordinates) => Promise<AreaDescription>;
};

// LLM解説APIのエンドポイント。Vercel上でも、ローカルの `vercel dev` でも同じ相対パスで叩ける。
const API_URL = '/api/describe';

/**
 * /api/describe を叩いて地域解説を取得するフック。
 * useGeolocation と対称に、state は持たず「Promiseを返す関数」だけを提供する。
 * ローディング/エラーの状態管理は呼び出し側(App.tsx)に任せる。
 *
 * 使い方:
 *   const { fetchDescribe } = useDescribe();
 *   const data = await fetchDescribe(coords);
 */
export function useDescribe(): UseDescribeReturn {
    // useCallback で参照を固定。useEffectの依存配列に入れても再生成されない。
    const fetchDescribe = useCallback(
        async (coords: Coordinates): Promise<AreaDescription> => {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
            });

            // 失敗時はサーバーの { error } を拾って throw。呼び出し側で try/catch する。
            if (!response.ok) {
                const detail = await response.json().catch(() => null);
                throw new Error(detail?.error ?? `APIエラー (HTTP ${response.status})`);
            }

            return (await response.json()) as AreaDescription;
        },
        []
    );

    return { fetchDescribe };
>>>>>>> 5b92fee8ece5f91d5c2c8b8a6f4b948dce02485e
}
