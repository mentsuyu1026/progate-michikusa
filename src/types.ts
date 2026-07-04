// src/type.ts
// プロジェクト全体で共有する型の定義をここに書いていきます
// フロント、LLM、GPSそれぞれの担当が同じ型をimportして使う形です
// 追加する分にはぶっ壊れることはないと思いますが、何かしらを削除すると動かなくなるかもなので気を付けましょう
// 必要な型に関しては適宜追加してもよいと思います

/**
 * 緯度と経度のペアについての型
 * Geolocation APIから取得した座標をアプリ内で扱う共通形式に変換したもの
 * lat = 緯度、lng = 経度
 */
export type Coordinates = {
  lat: number;
  lng: number;
};

/**
 * 各項目に対応する画像検索キーワード。
 * フロントがこの語で実写(Wikimedia等)を検索して各カードに表示する。
 * 具体的な固有名詞を含む(例:「浅草 雷門」)のでヒット率が上がる。
 */
export type AreaImageQueries = {
  summary: string;
  history: string;
  food: string;
  souvenir: string;
  celebrity: string;
};

/**
 * LLMが生成する地域解説の型(/api/describe のレスポンス)
 * summary/history/food/souvenir/celebrity = STEP2で決めた出力フォーマット
 * areaName/description = フロント互換の概要フィールド
 * images = 各項目の画像検索キーワード(実写取得用)
 * ※ api/_lib/describe.ts の AreaDescription と同じ形。片方を変えたらもう片方も合わせること
 */
export type AreaDescription = {
  areaName: string;
  summary: string;
  history: string;
  food: string;
  souvenir: string;
  celebrity: string;
  description: string;
  images: AreaImageQueries;
};

/**
 * 地図に表示する「有名スポット」1件分。
 * 各カード(歴史/グルメ等)の題材が実在の場所のときだけ作られる。
 * 商品(狭山茶)や人物(宮崎駿)は座標を持たないので対象外＝自然にピンが立たない。
 * - key: どのカード由来か
 * - label: スポット名(Wikipedia記事名)。地図のポップアップに表示
 * - lat/lng: 緯度・経度
 */
export type AreaSpot = {
  key: keyof AreaImageQueries;
  label: string;
  lat: number;
  lng: number;
};

/**
 * 訪問履歴の1件分を表す型。
 * localStorage に保存して、後から一覧表示や再表示に使う。
 *
 * - id: 各レコードを識別するための一意なID(削除時の特定などに使用)
 * - areaName 〜 description: /api/describe のレスポンスをそのまま保持
 *   (再表示時に API を再度叩かずに済むよう、全フィールドを持つ)
 * - coords: 地図表示や再訪検知のための座標
 * - visitedAt: 訪問日時(ISO 8601 文字列)。並び替えや日付表示に使う
 */
export type VisitRecord = {
    id: string;
    area: AreaDescription;
    coords: Coordinates;
    visitedAt: string;
};