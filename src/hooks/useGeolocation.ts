<<<<<<< HEAD
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
=======
import { useState } from 'react';
import type { Coordinates } from '../types';

type UseGeolocationRetuen = {
    coords: Coordinates | null;
    error: string | null;
    loading: boolean;
    getLocation: () => void;
}

export function useGeolocation(): UseGeolocationRetuen {
    const [coords, setCoords] = useState<Coordinates | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);


    /**
     * navigator.geolocation.getCurrentPositionの構造
     * ブラウザ標準のGeolocation APIで3つの引数を取る
     * 1: successCallback -> 成功したときに呼ばれるコールバック
     * 2: errorCallback   -> 失敗したときに呼ばれるコールバック
     * 3: options         -> オプション(省略可)
     * 引数として関数を渡している
     */
    const getLocation = () => {
        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLoading(false);
            },
            (err) => {
                setError(err.message),
                setLoading(false);
            }
        );
    };

    return { coords, error, loading, getLocation };
}
>>>>>>> 9b1440d8572f3a7b70979eb44d9fd1a33a53db61
