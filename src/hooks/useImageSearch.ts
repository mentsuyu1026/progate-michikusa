import { useCallback } from "react";
import type { AreaImageQueries, AreaSpot } from "../types";

/** 各項目の画像URL(見つからなければ null)。AreaImageQueries と同じキーを持つ。 */
export type AreaImageUrls = Record<keyof AreaImageQueries, string | null>;

/** fetchAreaMedia の戻り値: カード用の画像 + その画像の被写体名 + 地図用のスポット。 */
export type AreaMedia = {
  images: AreaImageUrls;
  /** 各画像が実際に「何の写真か」(Wikipedia記事名)。カードのキャプションに使う。 */
  captions: AreaImageUrls;
  spots: AreaSpot[];
};

type UseImageSearchReturn = {
  fetchImageUrl: (query: string) => Promise<string | null>;
  fetchAreaMedia: (queries: AreaImageQueries) => Promise<AreaMedia>;
};

// 日本語Wikipedia の API(APIキー不要・origin=* でブラウザから直接叩ける)。
// Commons の全文検索は精度が低い(「雷門」でテルミンが出る等)ため、pageimages を使う。
const WIKIPEDIA_API = "https://ja.wikipedia.org/w/api.php";

/** 検索候補1件 → 記事の {画像URL, 座標, 記事名, WikidataのQID}。 */
type WikiInfo = {
  url: string | null;
  lat: number | null;
  lng: number | null;
  title: string | null;
  qid: string | null; // WikidataのID。人物かどうかの判定に使う。
};

/**
 * 検索語で上位候補を取得する(検索順)。
 * 1位だけだと「画像が無い/人物に当たった」ときに空振りするので少数の候補を取るが、
 * 質優先のため呼び出し側では上位ぶんだけを見る(深追いして関連の薄い画像を拾わない)。
 */
async function fetchWikiCandidates(query: string, limit = 3): Promise<WikiInfo[]> {
  const q = query?.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*", // CORS: ブラウザから直接叩くために必要
    generator: "search",
    gsrsearch: q,
    gsrlimit: String(limit), // 上位limit件
    prop: "pageimages|coordinates|pageprops", // 代表画像・座標・WikidataのIDをまとめて取得
    piprop: "thumbnail",
    pithumbsize: "400",
    pilimit: "max", // 全候補にサムネイルを付ける(既定だと1件目のみ)
    ppprop: "wikibase_item",
  });

  try {
    const res = await fetch(`${WIKIPEDIA_API}?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data?.query?.pages as
      | Record<
          string,
          {
            index?: number;
            title?: string;
            thumbnail?: { source?: string };
            coordinates?: { lat?: number; lon?: number }[];
            pageprops?: { wikibase_item?: string };
          }
        >
      | undefined;
    if (!pages) return [];
    return Object.values(pages)
      .sort((a, b) => (a.index ?? 999) - (b.index ?? 999)) // 検索順に並べ直す
      .map((p) => {
        const c = p.coordinates?.[0];
        return {
          url: p.thumbnail?.source ?? null,
          lat: c?.lat ?? null,
          lng: c?.lon ?? null,
          title: p.title ?? null,
          qid: p.pageprops?.wikibase_item ?? null,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Wikidata で「人物(instance of = 人間 Q5)」の記事を判定する。
 * 渡した QID のうち人物だったものの集合を返す。1回のリクエストでまとめて確認する。
 * (お土産・グルメ等のカードに人物写真が出るのを防ぐために使う)
 */
async function fetchHumanQids(qids: string[]): Promise<Set<string>> {
  const uniq = [...new Set(qids)].filter(Boolean).slice(0, 50); // wbgetentities は一度に50件まで
  if (uniq.length === 0) return new Set();

  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*` +
    `&props=claims&ids=${uniq.join("|")}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return new Set();
    const data = await res.json();
    const entities = (data?.entities ?? {}) as Record<
      string,
      { claims?: { P31?: { mainsnak?: { datavalue?: { value?: { id?: string } } } }[] } }
    >;
    const humans = new Set<string>();
    for (const [id, ent] of Object.entries(entities)) {
      const p31 = ent?.claims?.P31 ?? [];
      const isHuman = p31.some((c) => c?.mainsnak?.datavalue?.value?.id === "Q5");
      if (isHuman) humans.add(id);
    }
    return humans;
  } catch {
    return new Set();
  }
}

/**
 * 画像検索キーワードから、カード用の実写画像と地図用のスポット(座標)を取得するフック。
 * useDescribe と対称に、state は持たず「Promiseを返す関数」だけを提供する。
 *
 * 使い方:
 *   const { fetchAreaMedia } = useImageSearch();
 *   const { images, captions, spots } = await fetchAreaMedia(data.images);
 */
export function useImageSearch(): UseImageSearchReturn {
  // キーワード1件 → 画像のある最初の候補のサムネイルURL(なければ null)。
  const fetchImageUrl = useCallback(async (query: string): Promise<string | null> => {
    const cands = await fetchWikiCandidates(query);
    return cands.find((c) => c.url)?.url ?? null;
  }, []);

  // 5項目ぶんを並列取得し、画像・キャプション・スポットにまとめる。
  const fetchAreaMedia = useCallback(async (queries: AreaImageQueries): Promise<AreaMedia> => {
    const keys = Object.keys(queries) as (keyof AreaImageQueries)[];
    const candLists = await Promise.all(
      keys.map(async (key) => [key, await fetchWikiCandidates(queries[key])] as const),
    );

    // 全候補のQIDをまとめて人物判定(Wikidataへは1リクエストのみ)。
    const allQids = candLists.flatMap(([, cands]) =>
      cands.map((c) => c.qid).filter((x): x is string => Boolean(x)),
    );
    const humanQids = await fetchHumanQids(allQids);

    const seen = new Set<string>();
    const images = {
      summary: null,
      history: null,
      food: null,
      souvenir: null,
      celebrity: null,
    } as AreaImageUrls;
    const captions = {
      summary: null,
      history: null,
      food: null,
      souvenir: null,
      celebrity: null,
    } as AreaImageUrls;
    const spots: AreaSpot[] = [];

    for (const [key, cands] of candLists) {
      // 質優先: 関連の強い上位2件までから「画像あり・未使用・(celebrity以外なら)非人物」を採用。
      // これより下位は関連が薄くなりやすいので拾わない(無ければアイコン表示にフォールバック)。
      const chosen = cands.slice(0, 2).find((c) => {
        if (!c.url || !c.title) return false; // 画像が無い候補はスキップ
        if (seen.has(c.title)) return false; // 他カードで使用済みはスキップ(重複防止)
        if (key !== "celebrity" && c.qid && humanQids.has(c.qid)) return false; // 人物はスキップ
        return true;
      });
      if (!chosen || !chosen.title) continue;

      seen.add(chosen.title);
      images[key] = chosen.url;
      captions[key] = chosen.title;

      // 座標を持つ候補だけ地図スポットにする(商品・人物は座標が無いので自然に除外)。
      if (chosen.lat != null && chosen.lng != null) {
        spots.push({ key, label: chosen.title, lat: chosen.lat, lng: chosen.lng });
      }
    }

    return { images, captions, spots };
  }, []);

  return { fetchImageUrl, fetchAreaMedia };
}
