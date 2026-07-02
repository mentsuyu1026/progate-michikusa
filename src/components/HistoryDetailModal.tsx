// src/components/HistoryDetailModal.tsx
import type { VisitRecord } from "../types";
import "./HistoryDetailModal.css";

type HistoryDetailModalProps = {
    record: VisitRecord;
    onClose: () => void;
};

/**
 * 訪問履歴の詳細を表示するモーダル。
 * 背景クリックまたは閉じるボタンで閉じる。
 */
function HistoryDetailModal({ record, onClose }: HistoryDetailModalProps) {
    // 背景(オーバーレイ)クリック時の処理
    // モーダル本体のクリックは伝播させない
    const handleOverlayClick = () => {
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()} // 本体クリックは閉じない
            >
                <button
                    className="modal-close"
                    onClick={onClose}
                    aria-label="閉じる"
                >
                    ×
                </button>

                <p className="modal-date">
                    訪問日: {new Date(record.visitedAt).toLocaleDateString()}
                </p>

                <h2 className="modal-area-name">{record.area.areaName}</h2>

                <p className="modal-summary">{record.area.summary}</p>

                <div className="modal-cards">
                    <article className="modal-card">
                        <p className="modal-card-label">簡単な歴史</p>
                        <p className="modal-card-value">{record.area.history}</p>
                    </article>

                    <article className="modal-card">
                        <p className="modal-card-label">ご当地グルメ</p>
                        <p className="modal-card-value">{record.area.food}</p>
                    </article>

                    <article className="modal-card">
                        <p className="modal-card-label">おすすめのお土産</p>
                        <p className="modal-card-value">{record.area.souvenir}</p>
                    </article>

                    <article className="modal-card">
                        <p className="modal-card-label">出身有名人</p>
                        <p className="modal-card-value">{record.area.celebrity}</p>
                    </article>
                </div>

                <article className="modal-card">
                    <p className="modal-card-label">詳しい紹介</p>
                    <p className="modal-card-value">{record.area.description}</p>
                </article>
            </div>
        </div>
    );
}

export default HistoryDetailModal;