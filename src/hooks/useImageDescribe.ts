import { useCallback } from "react";
import type { Coordinates } from "../types";

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
            const base64 = await fileToBase64(file);

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: base64,
                    mimeType: file.type,
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

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        reader.readAsDataURL(file);
    });
}