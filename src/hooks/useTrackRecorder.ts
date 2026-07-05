import { useState, useEffect, useRef } from "react";
import type { TrackPoint, TrackSession } from "../types";

const STORAGE_KEY = "track-sessions";
// この距離(メートル)以上動いたときだけ、新しい点として記録する。細かすぎる点の間引き。
const MIN_DISTANCE_M = 10;

/**
 * 歩いた軌跡をセッション単位で記録・保存するフック。
 * useVisitHistory と対称の作りで、state + 操作関数を返す。
 *
 * - startRecording: watchPosition を開始し、新しいセッションを作る
 * - stopRecording: watchPosition を停止し、セッションを終了する
 * - clearAll: 全セッションを削除する
 *
 * 記録中は現在のセッションを sessions の末尾に置き、点が追加されるたびに更新する。
 */
export function useTrackRecorder() {
    const [sessions, setSessions] = useState<TrackSession[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    const watchIdRef = useRef<number | null>(null);

    const currentSessionIdRef = useRef<string | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as TrackSession[];
                setSessions(parsed);
            } catch {
                console.warn("軌跡の読み込みに失敗しました");
            }
        }
    }, []);

    /** state 更新と localStorage 書き込みを同時に行うヘルパー。 */
    const persist = (updater: (prev: TrackSession[]) => TrackSession[]) => {
        setSessions((prev) => {
            const next = updater(prev);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    /**
   * 記録を開始する。
   * 新しいセッションを作り、watchPosition で位置更新を購読する。
   */
    const startRecording = () => {
        if (isRecording) {
            return;
        }
        if (!navigator.geolocation) {
            console.warn("この端末では位置情報を取得できません");
            return;
        }

        const sessionId = crypto.randomUUID();
        const newSession: TrackSession = {
            id: sessionId,
            startedAt: new Date().toISOString(),
            endedAt: null,
            points: [],
        };
        currentSessionIdRef.current = sessionId;
        persist((prev) => [...prev, newSession]);

        const id = navigator.geolocation.watchPosition(
            (position) => {
                const point: TrackPoint = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    t: Date.now(),
                };
                appendPointIfFarEnough(sessionId, point);
            },
            (err) => {
                console.warn("位置情報の取得に失敗:", err.message);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
        watchIdRef.current = id;
        setIsRecording(true);
    };

    /** 一定距離離れたときだけ点を追加する(間引き)。 */
    const appendPointIfFarEnough = (sessionId: string, point: TrackPoint) => {
        persist((prev) => {
            const idx = prev.findIndex((s) => s.id === sessionId);
            if (idx < 0) return prev;
            const session = prev[idx];
            const last = session.points[session.points.length - 1];
            if (last && distanceM(last, point) < MIN_DISTANCE_M) {
                return prev; // 近すぎるので記録しない
            }
            const updated: TrackSession = {
                ...session,
                points: [...session.points, point],
            };
            const next = [...prev];
            next[idx] = updated;
            return next;
        });
    };

    /**
   * 記録を停止する。
   * watchPosition を解除し、現在のセッションに endedAt を入れる。
   * 点が0または1つしかないセッションは無意味なので破棄する。
   */
    const stopRecording = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        const sessionId = currentSessionIdRef.current;
        currentSessionIdRef.current = null;
        setIsRecording(false);

        if (!sessionId) return;

        persist((prev) => {
            const idx = prev.findIndex((s) => s.id === sessionId);
            if (idx < 0) return prev;
            const session = prev[idx];
            // 点が少なすぎるセッションは捨てる(誤って開始したときのゴミ掃除)
            if (session.points.length < 2) {
                return prev.filter((s) => s.id !== sessionId);
            }
            const updated: TrackSession = {
                ...session,
                endedAt: new Date().toISOString(),
            };
            const next = [...prev];
            next[idx] = updated;
            return next;
        });
    };

    /** 全セッションを削除する。 */
    const clearAll = () => {
        if (isRecording) stopRecording();
        setSessions([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    // アンマウント時に watchPosition が残らないようクリーンアップ。
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return { sessions, isRecording, startRecording, stopRecording, clearAll };
}

/**
 * 2点間の距離(メートル)。Haversine 公式の簡易実装。
 * 数十m〜数km程度の近距離ならこれで十分な精度が出る。
 */
function distanceM(a: TrackPoint, b: TrackPoint): number {
    const R = 6371000; // 地球半径(m)
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}