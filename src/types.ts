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
};
