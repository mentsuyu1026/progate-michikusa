import { useCallback } from "react";
import type { Coordinates } from "../types";
import { compressImage, IMAGE_PRESETS } from "../utils/imageCompress";

export type ImageDescription = {
    areaName: string;
    summary: string;
    subject: string;
    context: string;
    description: string;
};

type UseImageDescribeReturn = {
    fetchImageDescribe: (file: File, coords: Coordinates) => Promise<ImageDescription>;
};

const API_URL = "/api/describeImage";

/**
 * /api/describe-image を叩いて画像解説を取得するフック。
 * useDescribe と対称に、state は持たず「Promiseを返す関数」だけを提供する。
 * ローディング/エラーの状態管理は呼び出し側に任せる。
 */
export function useImageDescribe(): UseImageDescribeReturn {
    const fetchImageDescribe = useCallback(
        async (file: File, coords: Coordinates): Promise<ImageDescription> => {
            const compressed = await compressImage(file, IMAGE_PRESETS.upload);

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: compressed.base64,
                    mimeType: compressed.mimeType,
                    lat: coords.lat,
                    lng: coords.lng,
                }),
            });

            if (!response.ok) {
                const detail = await response.json().catch(() => null);
                throw new Error(detail?.error ?? `APIエラー (HTTP ${response.status})`);
            }

            return (await response.json()) as ImageDescription;
        },
        [],
    );

    return { fetchImageDescribe };
}