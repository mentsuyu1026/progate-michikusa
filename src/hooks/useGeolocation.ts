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