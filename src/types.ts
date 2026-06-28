<<<<<<< HEAD
// アプリ全体で使う型をまとめたファイル

// 緯度・経度（useGeolocation が返す形）
export type Coords = {
  latitude: number;
  longitude: number;
};

// API（/api/describe）が返す街の情報。ひらつかくんの describe.ts のフィールドに合わせている
export type AreaDescription = {
  areaName: string; // 地名
  summary: string; // サマリー
  history: string; // 簡単な歴史
  food: string; // ご当地グルメ
  souvenir: string; // おすすめのお土産
  celebrity: string; // 出身有名人
  description: string; // 詳しい紹介
=======
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
>>>>>>> 9b1440d8572f3a7b70979eb44d9fd1a33a53db61
};

/**
 * LLMが生成する地域解説の型(/api/describe のレスポンス)
 * summary/history/food/souvenir/celebrity = STEP2で決めた出力フォーマット
 * areaName/description = フロント互換の概要フィールド
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
};
