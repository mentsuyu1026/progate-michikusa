import { useRef, useState } from "react";
import type { FoodRecognition, FoodStamp } from "../types";
import { useFoodStamp } from "../hooks/useFoodStamp";
import {
  loadImageFromFile,
  makeStampDataUrl,
  resizeToDataUrl,
} from "../lib/makeStamp";
import { StampBook, loadStamps, saveStamp } from "./StampBook";
import "./FoodStampMaker.css";

type Props = {
  /** 現在地の地名（分かっていれば渡す。名物リストの精度が上がる）。 */
  areaName?: string;
};

type ResultInfo = {
  specialties: string[];
  nextDish: string;
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

/** どちらかがもう一方を含むか（名物リストと照合する簡易判定）。 */
function matches(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
}

export function FoodStampMaker({ areaName }: Props) {
  const { recognize } = useFoodStamp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pickedImg, setPickedImg] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dishName, setDishName] = useState("");
  const [recog, setRecog] = useState<FoodRecognition | null>(null);
  const [stamps, setStamps] = useState<FoodStamp[]>(() => loadStamps());
  const [justStamped, setJustStamped] = useState<FoodStamp | null>(null);
  const [resultInfo, setResultInfo] = useState<ResultInfo | null>(null);

  const reset = () => {
    setPickedImg(null);
    setPreviewUrl(null);
    setDishName("");
    setRecog(null);
  };

  const onPick = async (file: File) => {
    setBusy(true);
    setNote(null);
    setRecog(null);
    setJustStamped(null);
    setResultInfo(null);
    try {
      const img = await loadImageFromFile(file);
      setPickedImg(img);
      const sendUrl = resizeToDataUrl(img, 768);
      setPreviewUrl(resizeToDataUrl(img, 420));
      try {
        const r = await recognize(sendUrl, areaName);
        setRecog(r);
        setDishName(r.dishName);
        if (!r.isFood) {
          setNote("料理をうまく認識できませんでした。名前を入力してスタンプできます。");
        }
      } catch (e) {
        // AIが落ちてもデモが死なないよう、手入力でスタンプできるようにする。
        const msg = e instanceof Error ? e.message : "認識に失敗しました";
        setNote(`AIが混み合っています（${msg}）。名前を入力すればスタンプを押せます。`);
      }
    } catch {
      setNote("画像を読み込めませんでした。別の写真でお試しください。");
    } finally {
      setBusy(false);
    }
  };

  const onStamp = () => {
    if (!pickedImg) return;
    const name = dishName.trim() || "ご当地グルメ";
    const stamp: FoodStamp = {
      id: uid(),
      dishName: name,
      areaName: areaName ?? "",
      oneLine: recog?.oneLine ?? "",
      imageDataUrl: makeStampDataUrl(pickedImg, name),
      eatenAt: new Date().toISOString(),
    };
    const next = saveStamp(stamp);
    setStamps(next);
    setJustStamped(stamp);
    // スタンプを押す前の認識情報（名物・次の一品）を結果表示用に確保。
    setResultInfo(
      recog ? { specialties: recog.specialties, nextDish: recog.nextDish } : null
    );
    reset();
  };

  const specialties = resultInfo?.specialties ?? [];
  const remaining = specialties.filter(
    (sp) => !stamps.some((st) => matches(sp, st.dishName))
  );

  return (
    <div className="foodstamp">
      <div className="foodstamp-head">
        <h2>グルメ御朱印</h2>
        <p>名物を食べて、写真からスタンプを集めよう。</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = ""; // 同じ写真を選び直せるように
        }}
      />

      {/* 撮影/選択ボタン（写真を選ぶ前） */}
      {!pickedImg && !busy && (
        <button className="locate-button" onClick={() => fileRef.current?.click()}>
          写真をとる / 選ぶ
        </button>
      )}

      {busy && (
        <div className="foodstamp-busy">
          <div className="spinner" />
          <p>AIが料理を見ています…</p>
        </div>
      )}

      {note && <p className="foodstamp-note">{note}</p>}

      {/* 認識後：名前を確認してスタンプを押す */}
      {pickedImg && !busy && (
        <div className="foodstamp-confirm">
          {previewUrl && (
            <img className="foodstamp-preview" src={previewUrl} alt="選んだ写真" />
          )}
          <label className="foodstamp-field">
            <span>料理名</span>
            <input
              type="text"
              value={dishName}
              placeholder="例：もんじゃ焼き"
              onChange={(e) => setDishName(e.target.value)}
            />
          </label>
          {recog?.oneLine && <p className="foodstamp-oneline">{recog.oneLine}</p>}
          <div className="foodstamp-actions">
            <button className="locate-button" onClick={onStamp}>
              この名前でスタンプを押す
            </button>
            <button className="locate-button slim" onClick={reset}>
              選び直す
            </button>
          </div>
        </div>
      )}

      {/* スタンプGET後の演出＋再訪誘導 */}
      {justStamped && (
        <div className="foodstamp-result">
          <img
            className="foodstamp-stamp"
            src={justStamped.imageDataUrl}
            alt={justStamped.dishName}
          />
          <p className="foodstamp-got">
            「{justStamped.dishName}」のスタンプを押しました！
          </p>

          {specialties.length > 0 && (
            <div className="foodstamp-quest">
              <p className="foodstamp-quest-head">
                {areaName ? `${areaName}の名物` : "この街の名物"}　のこり{" "}
                <b>{remaining.length}</b> 品
              </p>
              <ul className="foodstamp-list">
                {specialties.map((sp) => {
                  const done = stamps.some((st) => matches(sp, st.dishName));
                  return (
                    <li key={sp} className={done ? "done" : ""}>
                      <span className="mark">{done ? "✓" : "○"}</span>
                      {sp}
                    </li>
                  );
                })}
              </ul>
              {resultInfo?.nextDish && (
                <p className="foodstamp-next">
                  次はこれ → <b>{resultInfo.nextDish}</b>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 御朱印帳 */}
      <div className="foodstamp-book">
        <StampBook stamps={stamps} />
      </div>
    </div>
  );
}
