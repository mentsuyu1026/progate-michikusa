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
          <div className="stamp-cell" key={s.id}>
            <img className="stamp-img" src={s.imageDataUrl} alt={s.dishName} />
            <p className="stamp-name">{s.dishName}</p>
            <p className="stamp-date">
              {s.areaName ? `${s.areaName}・` : ""}
              {formatDate(s.eatenAt)}
            </p>
          </div>
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
    </div>
  );
}
