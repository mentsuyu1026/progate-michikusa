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
    </div>
  );
}

export default App;
