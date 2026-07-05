import { useCallback } from "react";
import type { AreaImageQueries, AreaSpot } from "../types";

/** 各項目の画像URL(見つからなければ null)。AreaImageQueries と同じキーを持つ。 */
export type AreaImageUrls = Record<keyof AreaImageQueries, string | null>;

/** fetchAreaMedia の戻り値: カード用の画像 + 地図用のスポット(座標つき)。 */
export type AreaMedia = {
  images: AreaImageUrls;
  spots: AreaSpot[];
};

type UseImageSearchReturn = {
  fetchImageUrl: (query: string) => Promise<string | null>;
  fetchAreaMedia: (queries: AreaImageQueries) => Promise<AreaMedia>;
};

// 日本語Wikipedia の API(APIキー不要・origin=* でブラウザから直接叩ける)。
// Commons の全文検索は精度が低い(「雷門」でテルミンが出る等)ため、
// 「検索語 → 最も一致する記事 → その記事の代表画像/座標」を返す pageimages/coordinates を使う。
const WIKIPEDIA_API = "https://ja.wikipedia.org/w/api.php";

/** 1つの検索語 → 記事の {画像URL, 座標, 記事名}。無ければ各 null。 */
type WikiInfo = {
  url: string | null;
  lat: number | null;
  lng: number | null;
  title: string | null;
};

async function fetchWiki(query: string): Promise<WikiInfo | null> {
  const q = query?.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*", // CORS: ブラウザから直接叩くために必要
    generator: "search",
    gsrsearch: q,
    gsrlimit: "1", // 最も一致する記事1件
    prop: "pageimages|coordinates", // 代表画像 と 座標 を一度に取得
    piprop: "thumbnail",
    pithumbsize: "400",
  });

  try {
    const res = await fetch(`${WIKIPEDIA_API}?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages as
      | Record<
          string,
          {
            title?: string;
            thumbnail?: { source?: string };
            coordinates?: { lat?: number; lon?: number }[];
          }
        >
      | undefined;
    if (!pages) return null;
    const p = Object.values(pages)[0];
    if (!p) return null;
    const c = p.coordinates?.[0];
    return {
      url: p.thumbnail?.source ?? null,
      lat: c?.lat ?? null,
      lng: c?.lon ?? null,
      title: p.title ?? null,
    };
  } catch {
    // 画像・座標が無い/通信失敗は null 扱い(表示側でフォールバック)。
    return null;
  }
}

/**
 * 画像検索キーワードから、カード用の実写画像と地図用のスポット(座標)を取得するフック。
 * useDescribe と対称に、state は持たず「Promiseを返す関数」だけを提供する。
 *
 * 使い方:
 *   const { fetchAreaMedia } = useImageSearch();
 *   const { images, spots } = await fetchAreaMedia(data.images);
 */
export function useImageSearch(): UseImageSearchReturn {
  // キーワード1件 → 代表画像のサムネイルURL(なければ null)。
  const fetchImageUrl = useCallback(async (query: string): Promise<string | null> => {
    const info = await fetchWiki(query);
    return info?.url ?? null;
  }, []);

  // 5項目ぶんを並列取得し、画像とスポットにまとめる。
  const fetchAreaMedia = useCallback(async (queries: AreaImageQueries): Promise<AreaMedia> => {
    const keys = Object.keys(queries) as (keyof AreaImageQueries)[];
    const infos = await Promise.all(
      keys.map(async (key) => [key, await fetchWiki(queries[key])] as const),
    );

    // 同じ記事(=同じ写真/同じ場所)が複数カードに出ないよう重複を除去する。
    // 記事名で判定し、最初の1つだけ残す。2つ目以降は画像もピンも出さない。
    const seen = new Set<string>();
    const images = {
      summary: null,
      history: null,
      food: null,
      souvenir: null,
      celebrity: null,
    } as AreaImageUrls;
    const spots: AreaSpot[] = [];

    for (const [key, info] of infos) {
      const dupKey = info?.title ?? info?.url ?? null;
      const isDup = dupKey ? seen.has(dupKey) : false;
      if (dupKey && !isDup) seen.add(dupKey);

      images[key] = !isDup ? info?.url ?? null : null;

      // 座標を持つ項目だけを地図スポットにする(商品・人物は座標が無いので自然に除外)。
      if (!isDup && info?.lat != null && info?.lng != null) {
        spots.push({ key, label: info.title ?? queries[key], lat: info.lat, lng: info.lng });
      }
    }

    return { images, spots };
  }, []);

  return { fetchImageUrl, fetchAreaMedia };
}
