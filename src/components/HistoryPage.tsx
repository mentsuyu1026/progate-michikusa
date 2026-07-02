// src/pages/HistoryPage.tsx
/**
 * 訪問履歴の一覧ページ
 * (実際にはページというかコンポーネントに切り出しているだけだが一応)
 *  * カードをタップするとモーダルで詳細を表示する
 */

import { useState } from 'react';
import type { VisitRecord } from '../types';
import HistoryDetailModal from "./HistoryDetailModal";
import HistoryMap from "./HistoryMap";
import "./HistoryPage.css";

type HistoryPageProps = {
    records: VisitRecord[];
    onRemove: (id: string) => void;
};

function HistoryPage({ records, onRemove }: HistoryPageProps) {
    const [selectedRecord, setSelectedRecord] = useState<VisitRecord | null>(null);

    const sortedRecords = [...records].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));

    return (
        <div className="history-page">
            <h2 className="history-title">訪問履歴</h2>

            {sortedRecords.length === 0 ? (
                <p className="history-empty">
                    まだ訪問した場所がありません。
                    <br />
                    現在地を取得して「この場所を保存」を押すと、ここに記録が残ります。
                </p>
            ) : (
                <div className="history-grid">
                    <HistoryMap
                        records={records}
                        onMarkerClick={(record) => setSelectedRecord(record)}
                    />
                    {sortedRecords.map((record) => (
                        <article
                            key={record.id}
                            className="history-card"
                            onClick={() => setSelectedRecord(record)}
                        >
                            <p className="history-card-name">{record.area.areaName}</p>
                            <p className="history-card-date">
                                {new Date(record.visitedAt).toLocaleDateString()}
                            </p>
                            <button
                                className="history-card-delete"
                                onClick={(e) => {
                                    e.stopPropagation(); // カードのクリックを止める
                                    onRemove(record.id);
                                }}
                            >
                                削除
                            </button>
                        </article>
                    ))}
                </div>
            )}

            {/* モーダル */}
            {selectedRecord && (
                <HistoryDetailModal
                    record={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                />
            )}
        </div>
    );
}

export default HistoryPage;
