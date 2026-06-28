<<<<<<< HEAD
import { useState } from "react";
import { useGeolocation } from "./hooks/useGeolocation";
import { useDescribe } from "./hooks/useDescribe";
import type { AreaDescription } from "./types";
import "./App.css";

function App() {
  const { getLocation } = useGeolocation();
  const { fetchDescribe } = useDescribe();

  const [data, setData] = useState<AreaDescription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getLocation(); // GPS 取得（Promise）
      const result = await fetchDescribe(coords); // API 呼び出し（Promise）
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>現在地を調べる</h1>

      {/* ローディング中はボタンを隠す。終わったらまた押せる（再取得できる） */}
      {!loading && (
        <button className="locate-button" onClick={handleClick}>
          現在地を取得
        </button>
      )}

      {/* ② ローディング画面：テキスト入り */}
      {loading && (
        <div className="loading">
          <div className="spinner" />
          <p>現在地から、この街のことを調べています…</p>
        </div>
      )}

      {/* エラー表示 */}
      {error && <p className="error">エラー: {error}</p>}

      {/* 結果カード（7フィールド） */}
      {data && (
        <div className="cards">
          <article className="card area">
            <p className="card-label">地名</p>
            <p className="card-value">{data.areaName}</p>
          </article>

          <article className="card wide">
            <p className="card-label">サマリー</p>
            <p className="card-value">{data.summary}</p>
          </article>

          <article className="card">
            <p className="card-label">簡単な歴史</p>
            <p className="card-value">{data.history}</p>
          </article>

          <article className="card">
            <p className="card-label">ご当地グルメ</p>
            <p className="card-value">{data.food}</p>
          </article>

          <article className="card">
            <p className="card-label">おすすめのお土産</p>
            <p className="card-value">{data.souvenir}</p>
          </article>

          <article className="card">
            <p className="card-label">出身有名人</p>
            <p className="card-value">{data.celebrity}</p>
          </article>

          <article className="card wide">
            <p className="card-label">詳しい紹介</p>
            <p className="card-value">{data.description}</p>
          </article>
        </div>
      )}
=======
import { useState, useEffect } from "react";
import "./App.css";

function App() {
  //Stateの定義
  const [status, setStatus] = useState("top");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (status === "loading") {
      const fetchData = async () => {
        const response = await fetch(import.meta.env.VITE_API_URL);
        const json = await response.json();
        setData(json);
        setStatus("result");
      };
      fetchData();
    }
  }, [status]);

  return (
    <div>
      {status === "top" && (
        <div>
          <h1>現在地を調べる</h1>
          <button
            onClick={() => {
              setStatus("loading");
            }}
          >
            現在地を取得
          </button>
        </div>
      )}
      {status === "loading" && <div></div>}
      {status === "result" && data && (
        <div>
          <div className="card">
            <div>
              <p>地名</p>
              {data.areaName}
            </div>
          </div>
          <div className="card">
            <div>
              <p>サマリー</p>
              {data.summary}
            </div>
          </div>
          <div className="card">
            <div>
              <p>簡単な歴史</p>
              {data.history}
            </div>
          </div>
          <div className="card">
            <div>
              <p>おすすめの土産</p>
              {data.souvenir}
            </div>
          </div>
          <div className="card">
            <div>
              <p>出身有名人</p>
              {data.celebrity}
            </div>
          </div>
        </div>
      )}
>>>>>>> 9b1440d8572f3a7b70979eb44d9fd1a33a53db61
    </div>
  );
}

export default App;
