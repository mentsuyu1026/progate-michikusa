// src/hooks/useGeolocation.ts
import type { Coordinates } from '../types';

/**
 * ブラウザの Geolocation API をラップしたカスタムフック。
 * Promise を返す getLocation 関数を提供する。
 *
 * ローディング・エラー管理は使う側に任せる方針。
 * フック内で state を持たないことで、await による直線的な使い方が可能。
 */
export function useGeolocation() {
  /**
   * 現在地を取得する。
   * @returns Coordinates(緯度・経度)を resolve する Promise
   * @throws ユーザーが拒否した場合や取得失敗時、Error を reject する
   */
  const getLocation = (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          reject(new Error(err.message));
        },
        // GPS優先で精度を上げる。timeoutで固まりを防ぎ、maximumAge:0で毎回新しく測位する。
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  return { getLocation };
}
