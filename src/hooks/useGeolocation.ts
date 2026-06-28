import type { Coords } from '../types';

// GPS 取得（Promise 版）。
// ※ ひらつかくんが本実装を書く予定。これは動作確認用の最小版なので、
//    完成したらこのファイルを差し替えてOK（getLocation() が Coords を返す形だけ揃えてあれば動く）。
export function useGeolocation() {
  const getLocation = (): Promise<Coords> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('この端末では位置情報を取得できません'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          reject(new Error('位置情報の取得に失敗しました: ' + err.message));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  return { getLocation };
}
