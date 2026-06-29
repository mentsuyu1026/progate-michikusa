// src/hooks/useVisitHistory.ts
import { useState, useEffect } from 'react';
import type { VisitRecord, AreaDescription, Coordinates } from '../types';

const STORAGE_KEY = 'visit-history'

/**
 * 訪問履歴を localStorage で管理するカスタムフック。
 * 初回マウント時に localStorage から読み込み、
 * 追加・削除のたびに state 更新と localStorage への書き込みを同期する。
 *
 * 使い方:
 *   const { records, addRecord, removeRecord, clearAll } = useVisitHistory();
 *   addRecord(area, coords);
 */

export function useVisitHistory() {
    const [records, setRecords] = useState<VisitRecord[]>([]);

    // 初回マウント時にlocalStrage(ブラウザの持つ記憶領域)から読み込む
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as VisitRecord[];
                setRecords(parsed);
            } catch {
                // パースに失敗した際は空配列のままにする
                console.warn('訪問履歴の読み込みに失敗しました');
            }
        }
    }, []);

    /**
   * 新しい訪問記録を追加する。
   * id と visitedAt は自動生成。
   */
    const addRecord = (area: AreaDescription, coords: Coordinates) => {
        const newRecord: VisitRecord = {
            id: crypto.randomUUID(),
            area,
            coords,
            visitedAt: new Date().toISOString(),
        };
        setRecords((prev) => {
            const next = [...prev, newRecord];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }

    /**
   * 指定された id のレコードを削除する。
   */
    const removeRecord = (id: string) => {
        setRecords((prev) => {
            const next = prev.filter((r) => r.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    /**
   * 全レコードを削除する。
   */
    const clearAll = () => {
        setRecords([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    return { records, addRecord, removeRecord, clearAll };
}