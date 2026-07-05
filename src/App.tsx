import { useState, type ReactElement } from "react";
import { useGeolocation } from "./hooks/useGeolocation";
import { useDescribe } from "./hooks/useDescribe";
import { useImageSearch, type AreaImageUrls } from "./hooks/useImageSearch";
import { useVisitHistory } from "./hooks/useVisitHistory";
import { useTrackRecorder } from "./hooks/useTrackRecorder";
import HistoryPage from "./components/HistoryPage";
import type { AreaDescription, Coordinates, AreaSpot } from "./types";
import MapView from "./components/MapView";
import { FoodStampMaker } from "./components/FoodStampMaker";
import TrackMapView from "./components/TrackMapView";
import PhotoDescribe from "./components/PhotoDescribe";
import "./App.css";

// 依存を増やさないためのインラインSVGアイコン。後で写真に差し替え予定。
type IconName =
  | "pin"
  | "history"
  | "food"
  | "gift"
  | "star"
  | "location"
  | "memo";
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactElement> = {
    pin: (
      <>
        <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    location: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),
    history: <path d="M3 21h18M5 21V10M19 21V10M3 10l9-6 9 6M9 21v-6h6v6" />,
    food: (
      <>
        <path d="M4 11h16a8 8 0 0 1-16 0z" />
        <path d="M8 3c-1 1.2-1 2.8 0 4M12 3c-1 1.2-1 2.8 0 4M16 3c-1 1.2-1 2.8 0 4" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M5 12v9h14v-9M12 8v13" />
        <path d="M12 8S10.5 3.5 8 4.5 12 8 12 8zM12 8s1.5-4.5 4-3.5S12 8 12 8z" />
      </>
    ),
    star: (
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" />
    ),
    memo: (
      <>
        <path d="M14 3l7 7-9.5 9.5L3 21l1.5-8.5z" />
        <path d="M12.5 5.5l6 6" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// カテゴリカードの設定（フィールド名・ラベル・アイコン・色テーマ）
// グルメは主役として別枠で大きく出すので、ここには入れない（比重を下げた3つ）。
const categories = [
  { key: "history", label: "簡単な歴史", icon: "history", theme: "ai" },
  {
    key: "souvenir",
    label: "おすすめのお土産",
    icon: "gift",
    theme: "yamabuki",
  },
  { key: "celebrity", label: "出身有名人", icon: "star", theme: "matcha" },
] as const;

// ローディング中に順番に表示する一言（遊び）
const loadingMessages = [
  "いまいる街を探しています…",
  "歴史をひもといています…",
  "おすすめの寄り道を探しています…",
];

// 地図に出す「ご当地グルメ」ピンの上限。
const MAX_FOOD_PINS = 10;

// OpenStreetMap(Overpass API) から現在地1km以内の飲食店を取得してスポット化する。
// キーワード検索ではなく実在の店舗POIなので、現在地から確実に近い店だけが並ぶ。
async function fetchNearbyFood(c: Coordinates): Promise<AreaSpot[]> {
  const query =
    `[out:json][timeout:15];(` +
    `node["amenity"~"restaurant|cafe|fast_food|bar|pub"](around:1000,${c.lat},${c.lng});` +
    `node["shop"~"bakery|confectionery|pastry"](around:1000,${c.lat},${c.lng});` +
    `);out 60;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const seen = new Set<string>();
  const spots: AreaSpot[] = [];
  for (const el of data.elements ?? []) {
    const name: string | undefined = el?.tags?.name;
    if (!name || seen.has(name)) continue;
    if (typeof el.lat !== "number" || typeof el.lon !== "number") continue;
    seen.add(name);
    spots.push({ key: "food", label: name, lat: el.lat, lng: el.lon });
    if (spots.length >= MAX_FOOD_PINS) break;
  }
  return spots;
}

function App() {
  const { getLocation } = useGeolocation();
  const { fetchDescribe } = useDescribe();
  const { fetchAreaMedia } = useImageSearch();
  const { records, addRecord, removeRecord } = useVisitHistory();
  const { sessions, isRecording, startRecording, stopRecording } = useTrackRecorder();

  const [data, setData] = useState<AreaDescription | null>(null);
  const [imageUrls, setImageUrls] = useState<AreaImageUrls | null>(null);
  const [spots, setSpots] = useState<AreaSpot[]>([]);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [mode, setMode] = useState<"current" | "history" | "food">("current");
  const [memo, setMemo] = useState<string | null>(null);
  const [showTrackMap, setShowTrackMap] = useState(false);

  const handleClick = async () => {
    stopSpeak();
    setLoading(true);
    setError(null);
    setImageUrls(null); // 前回の画像をクリア
    setSpots([]); // 前回のスポットをクリア
    setMemo(null); // 前回のメモをクリア
    try {
      const coords = await getLocation();
      setCoords(coords);
      // 地図には現在地1km以内のご当地グルメを最大10件表示（後追いで読み込む）
      fetchNearbyFood(coords)
        .then(setSpots)
        .catch(() => setSpots([]));
      const history = records.map((r) => ({ areaName: r.area.areaName }));
      const result = await fetchDescribe(coords, history);
      setData(result);
      // 画像はテキスト表示の妨げにならないよう、後追いで読み込む
      fetchAreaMedia(result.images)
        .then(({ images }) => setImageUrls(images))
        .catch(() => setImageUrls(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  };
  const speak = () => {
    if (!data) return;
    const u = new SpeechSynthesisUtterance(`${data.areaName}。${data.summary}`);
    u.lang = "ja-JP";
    u.onend = () => setSpeaking(false);
    u.rate = 1.05;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const stopSpeak = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  // 現在の場所が履歴に保存済みかチェック
  const isSaved = data
    ? records.some((r) => r.area.areaName === data.areaName)
    : false;

  const handleSave = () => {
    if (data && coords && !isSaved) {
      addRecord(data, coords, memo ?? "");
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">
          <Icon name="pin" />
          みちくさ
        </span>
        {mode === "current" ? (
          <span style={{ display: "flex", gap: 8 }}>
            <button className="header-toggle" onClick={() => setMode("food")}>
              グルメ
            </button>
            <button className="header-toggle" onClick={() => setMode("history")}>
              履歴
            </button>
          </span>
        ) : (
          <button className="header-toggle" onClick={() => setMode("current")}>
            戻る
          </button>
        )}
      </header>

      {/* サブヘッダー: 散歩の記録は現在地取得と独立して常時操作できる */}
      <div className="sub-header">
        <button
          className={`track-button${isRecording ? " track-button-active" : ""}`}
          onClick={isRecording ? stopRecording : startRecording}
          aria-pressed={isRecording}
        >
          {isRecording ? "散歩の記録を終了" : "散歩の記録を開始"}
        </button>
        <button
          className={`track-button${showTrackMap ? " track-button-active" : ""}`}
          onClick={() => setShowTrackMap((prev) => !prev)}
          aria-pressed={showTrackMap}
        >
          {showTrackMap ? "経路を隠す" : "経路を見る"}
        </button>
      </div>

      {mode === "history" ? (
        <HistoryPage records={records} onRemove={removeRecord} />
      ) : mode === "food" ? (
        <FoodStampMaker areaName={data?.areaName} />
      ) : (
        <>
          {!loading && !data && (
            <div className="hero">
              <h1>ふらっと、この街を</h1>
              <p className="hero-sub">
                目的がなくても大丈夫。2000円・徒歩20分で楽しめる寄り道を、AIがご提案します。
              </p>

              <ol className="howto">
                <li>
                  <span className="howto-num">1</span>
                  ボタンを押して位置情報を許可
                </li>
                <li>
                  <span className="howto-num">2</span>
                  AIが今いる街をやさしく解説
                </li>
                <li>
                  <span className="howto-num">3</span>
                  音声ガイドで聞いたり、深掘り
                </li>
              </ol>

              <button className="locate-button" onClick={handleClick}>
                <Icon name="location" />
                現在地を取得
              </button>
            </div>
          )}

          {loading && (
            <div className="loading">
              {/* 和傘（かざぐるま）が回る遊びのあるローディング */}
              <div className="wagasa" aria-hidden="true">
                <div className="wagasa-disk" />
              </div>
              <div className="steps" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="loading-msgs" aria-live="polite">
                <ul>
                  {loadingMessages.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                  {/* 先頭をもう一度並べてループを滑らかにする */}
                  <li aria-hidden="true">{loadingMessages[0]}</li>
                </ul>
              </div>
            </div>
          )}

          {loading && (
            <div className="loading">
              <div className="spinner" />
              <p>現在地から、この街のことを調べています…</p>
            </div>
          )}

          {error && (
            <div className="error">
              <p>エラー: {error}</p>
              <button className="retry-button" onClick={handleClick}>
                もう一度試す
              </button>
            </div>
          )}

          {data && (
            <div className="result">
              {/* 現在地マップ枠（次ステップで Leaflet に置き換え） */}
              {/* <div className="map-frame" role="img" aria-label="現在地周辺のマップ">
                <div className="map-placeholder">
                  <Icon name="pin" />
                </div>
                <span className="map-chip">
                  <Icon name="location" />
                  {data.areaName}
                </span>
              </div> */}
              {coords && (
                <div className="map-frame" role="img" aria-label="現在地周辺のマップ">
                  <MapView center={coords} spots={spots} />
                  <span className="map-chip">
                    <Icon name="location" />
                    {data.areaName}
                  </span>
                </div>
              )}

              {!loading && (
                <button className="locate-button slim" onClick={handleClick}>
                  <Icon name="location" />
                  別の場所を調べる
                </button>
              )}
              <button
                className="locate-button slim"
                aria-pressed={speaking}
                onClick={() => (speaking ? stopSpeak() : speak())}
              >
                {speaking ? "停止" : "音声ガイド"}
              </button>

              <PhotoDescribe coords={coords} />

              {/* エリア名 + サマリー */}
              <article className="card hero-card">
                {imageUrls?.summary && (
                  <img
                    className="hero-photo"
                    src={imageUrls.summary}
                    alt={data.areaName}
                    loading="lazy"
                  />
                )}
                <p className="card-label">地名</p>
                <h2 className="area-name">{data.areaName}</h2>
                <p className="card-value">{data.summary}</p>
              </article>

              {/* グルメを主役に大きく表示 */}
              <article className="card food-hero">
                {imageUrls?.food ? (
                  <img
                    className="food-hero-photo"
                    src={imageUrls.food}
                    alt="ご当地グルメ"
                    loading="lazy"
                  />
                ) : (
                  <div className="thumb thumb-shu food-hero-icon">
                    <Icon name="food" />
                  </div>
                )}
                <div className="food-hero-body">
                  <p className="card-label">この街のグルメ</p>
                  <p className="card-value">{data.food}</p>
                </div>
              </article>

              {/* ふらっとプラン（2000円・徒歩20分） */}
              {data.wanderPicks && data.wanderPicks.length > 0 && (
                <article className="card wander-card">
                  <p className="card-label">ふらっとプラン｜2000円・徒歩20分</p>
                  <ul className="wander-list">
                    {data.wanderPicks.map((w, i) => (
                      <li key={i}>
                        <div className="wander-main">
                          <span className="wander-name">{w.name}</span>
                          <span className="wander-price">{w.price}</span>
                        </div>
                        <div className="wander-meta">
                          徒歩{w.walkMin}分・{w.note}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              )}

              {/* この街で使えるお得 */}
              {data.deals && data.deals.length > 0 && (
                <article className="card deals-card">
                  <p className="card-label">この街のお得</p>
                  <ul className="deals-list">
                    {data.deals.map((d, i) => (
                      <li key={i}>
                        <span className="deal-title">{d.title}</span>
                        <span className="deal-detail">{d.detail}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              )}

              {/* その他（歴史・お土産・有名人：比重を下げて小さく） */}
              <div className="cards-grid secondary">
                {categories.map((c) => (
                  <article key={c.key} className="card">
                    {imageUrls?.[c.key] ? (
                      <img
                        className="thumb thumb-photo"
                        src={imageUrls[c.key] as string}
                        alt={c.label}
                        loading="lazy"
                      />
                    ) : (
                      <div className={`thumb thumb-${c.theme}`}>
                        <Icon name={c.icon} />
                      </div>
                    )}
                    <p className="card-label">{c.label}</p>
                    <p className="card-value">{data[c.key]}</p>
                  </article>
                ))}
              </div>

              {/* 詳しい紹介 */}
              <article className="card">
                <p className="card-label">詳しい紹介</p>
                <p className="card-value">{data.description}</p>
              </article>
              {/*思い出メモ*/}
              <label className="memo-card">
                <span className="memo-card-heading">
                  <Icon name="memo" />
                  思い出を記録しよう！
                </span>
                <textarea
                  className="memo-textarea"
                  name="postContent"
                  rows={4}
                  placeholder="この場所で感じたこと、見つけたものを書き留めておこう"
                  value={memo ?? ""}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </label>

              {/* 保存ボタン:結果表示の一番下 */}
              <button
                className="save-button"
                onClick={handleSave}
                disabled={isSaved}
              >
                {isSaved ? "保存済み" : "この場所を保存"}
              </button>
            </div>
          )}
        </>
      )}
      {showTrackMap && (
        <TrackMapView
          sessions={sessions}
          onClose={() => setShowTrackMap(false)}
        />
      )}
    </div>
  );
}

export default App;
