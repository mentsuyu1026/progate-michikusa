import { useState } from "react";
import type { FoodStamp } from "../types";
import "./StampBook.css";

// グルメスタンプを保存する localStorage のキー。保存・読込で必ずこのキーを使う。
export const STAMP_STORAGE_KEY = "michikusa:foodStamps";

/** localStorage からグルメスタンプを読み込む。 */
export function loadStamps(): FoodStamp[] {
  try {
    const raw = localStorage.getItem(STAMP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FoodStamp[]) : [];
  } catch {
    return [];
  }
}

/** スタンプを1件追加保存し、更新後の一覧を返す（新しい順で先頭に積む）。 */
export function saveStamp(stamp: FoodStamp): FoodStamp[] {
  const next = [stamp, ...loadStamps()];
  try {
    localStorage.setItem(STAMP_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存に失敗しても画面は動かす（容量オーバー等）。
  }
  return next;
}

type Props = {
  /** 表示するスタンプ。省略時は localStorage から読み込む。 */
  stamps?: FoodStamp[];
  /** 「これから集める」空きマスをいくつ見せるか。 */
  emptySlots?: number;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export function StampBook({ stamps, emptySlots = 3 }: Props) {
  const list = stamps ?? loadStamps();
  // クリックで開く思い出の詳細。
  const [selected, setSelected] = useState<FoodStamp | null>(null);

  return (
    <div className="stampbook">
      <span className="stampbook-band" aria-hidden="true" />

      <div className="stampbook-plate">
        <p className="stampbook-title">御朱印帳</p>
        <p className="stampbook-sub">食べ歩きの記録</p>
      </div>

      <div className="stampbook-pages">
        {list.length === 0 && (
          <p className="stampbook-empty">
            まだスタンプがありません。
            <br />
            名物を食べて、写真からスタンプを集めましょう。
          </p>
        )}

        {list.map((s) => (
          <button
            className="stamp-cell"
            key={s.id}
            onClick={() => setSelected(s)}
            aria-label={`${s.dishName}の思い出を見る`}
          >
            <img className="stamp-img" src={s.imageDataUrl} alt={s.dishName} />
            <p className="stamp-name">{s.dishName}</p>
            <p className="stamp-date">
              {s.areaName ? `${s.areaName}・` : ""}
              {formatDate(s.eatenAt)}
            </p>
            {s.memo && <span className="stamp-memo-dot" aria-hidden="true" />}
          </button>
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <div className="stamp-cell empty" key={`empty-${i}`}>
            <div className="seal seal-empty" aria-hidden="true">
              未
            </div>
            <p className="stamp-name muted">これから</p>
          </div>
        ))}
      </div>

      {/* 思い出の詳細 */}
      {selected && (
        <div className="stamp-modal" onClick={() => setSelected(null)}>
          <div className="stamp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="stamp-modal-close"
              onClick={() => setSelected(null)}
              aria-label="閉じる"
            >
              ×
            </button>
            <img
              className="stamp-modal-img"
              src={selected.imageDataUrl}
              alt={selected.dishName}
            />
            <h3 className="stamp-modal-name">{selected.dishName}</h3>
            <p className="stamp-modal-meta">
              {selected.areaName ? `${selected.areaName}・` : ""}
              {formatDate(selected.eatenAt)}
            </p>
            {selected.oneLine && (
              <p className="stamp-modal-oneline">{selected.oneLine}</p>
            )}
            <div className="stamp-modal-memo">
              <span className="stamp-modal-memo-label">思い出メモ</span>
              <p>{selected.memo ? selected.memo : "（メモはありません）"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
