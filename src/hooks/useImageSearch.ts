import { useCallback } from "react";
import type { AreaImageQueries } from "../types";

/** 各項目の画像URL(見つからなければ null)。AreaImageQueries と同じキーを持つ。 */
export type AreaImageUrls = Record<keyof AreaImageQueries, string | null>;

type UseImageSearchReturn = {
  fetchImageUrl: (query: string) => Promise<string | null>;
  fetchAreaImages: (queries: AreaImageQueries) => Promise<AreaImageUrls>;
};

// 日本語Wikipedia の API(APIキー不要・origin=* でブラウザから直接叩ける)。
// Commons の全文検索は精度が低い(「雷門」でテルミンが出る等)ため、
// 「検索語 → 最も一致する記事 → その記事の代表画像」を返す pageimages を使う。
const WIKIPEDIA_API = "https://ja.wikipedia.org/w/api.php";

/**
 * 画像検索キーワードから実写画像URLを取得するフック。
 * useDescribe と対称に、state は持たず「Promiseを返す関数」だけを提供する。
 * 画像が無い・通信失敗時は null を返す(throw しない)。カード側で「画像なし」にできる。
 *
 * 使い方:
 *   const { fetchImageUrl, fetchAreaImages } = useImageSearch();
 *   const url = await fetchImageUrl(data.images.history);
 *   const urls = await fetchAreaImages(data.images); // 5項目まとめて
 */
export function useImageSearch(): UseImageSearchReturn {
  // キーワード1件 → 代表画像のサムネイルURL(なければ null)。
  const fetchImageUrl = useCallback(async (query: string): Promise<string | null> => {
    const q = query?.trim();
    if (!q) return null;

    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*", // CORS: ブラウザから直接叩くために必要
      generator: "search",
      gsrsearch: q,
      gsrlimit: "1", // 最も一致する記事1件
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "400",
    });

    try {
      const res = await fetch(`${WIKIPEDIA_API}?${params.toString()}`);
      if (!res.ok) return null;
      const data = await res.json();
      const pages: Record<string, { thumbnail?: { source?: string } }> | undefined =
        data?.query?.pages;
      if (!pages) return null;
      const first = Object.values(pages)[0];
      return first?.thumbnail?.source ?? null;
    } catch {
      // 画像が無い・ネットワーク失敗は null 扱い(表示側でフォールバック)。
      return null;
    }
  }, []);

  // 5項目ぶんを並列で取得。失敗した項目は null。
  const fetchAreaImages = useCallback(
    async (queries: AreaImageQueries): Promise<AreaImageUrls> => {
      const keys = Object.keys(queries) as (keyof AreaImageQueries)[];
      const pairs = await Promise.all(
        keys.map(async (key) => [key, await fetchImageUrl(queries[key])] as const),
      );

      // 同じ写真が複数カードに出ないよう重複を除去する。
      // (専用記事が無い語は「市の代表記事」に落ちて同じ画像になりがちなため)
      // 最初に出た1枚だけ残し、2枚目以降は null = アイコン表示にフォールバックさせる。
      const seen = new Set<string>();
      const deduped = pairs.map(([key, url]) => {
        if (!url) return [key, null] as const;
        if (seen.has(url)) return [key, null] as const;
        seen.add(url);
        return [key, url] as const;
      });

      return Object.fromEntries(deduped) as AreaImageUrls;
    },
    [fetchImageUrl],
  );

  return { fetchImageUrl, fetchAreaImages };
}
