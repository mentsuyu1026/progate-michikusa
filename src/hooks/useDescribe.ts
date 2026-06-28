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
}
