# みちくさ（michikusa）

**ふらっと立ち寄った街を、2000円・徒歩20分で楽しむ。AIガイド × デジタル御朱印帳。**

GPSで現在地を取得し、生成AI（Google Gemini）がその街の解説・グルメ・お得情報をその場で生成するWebアプリです。目的なくふらっと来た人に向けて、予算2000円以内・徒歩20分以内で楽しめる寄り道を提案します。食べた名物は写真からAIが判定して「御朱印スタンプ」として集められ、同じ街にまた来たくなる体験を作ります。

- **課題** — 知らない街にふらっと来ても「何をすればいいか分からない」。既存の観光アプリは目的地ありきで、目的のない人には刺さらない。
- **解決** — 現在地だけで、AIが即座に「気軽な楽しみ方（2000円・徒歩20分）」と「その街のお得」を提案。食に特化し、集めて再訪したくなる仕掛け（御朱印帳＋思い出メモ）でリピートを生む。

## 主な機能

- 現在地からAIが街を解説（音声ガイド付きで歩きながら聞ける）
- ふらっとプラン（2000円・徒歩20分）＋この街のお得情報
- カメラ → AIが料理を認識 → 写真で御朱印スタンプ ＋ 思い出メモ
- デジタル御朱印帳（スタンプ収集・タップで思い出を再表示）
- 訪問履歴・散歩の記録（軌跡）・地図表示
- 和モダンデザイン（青海波・市松などの伝統文様をCSSで描画）

## 技術スタック

React 19 / Vite / TypeScript ・ Vercel（Functions & デプロイ）・ Google Gemini API ・ Web Speech API ・ Canvas ・ Geolocation ・ localStorage ・ Nominatim ・ OpenStreetMap / Leaflet

## アーキテクチャ

```
[ ブラウザ / React + Vite + TypeScript ]
   GPS(Geolocation) ・ 音声(Web Speech) ・ Canvasスタンプ生成 ・ localStorage保存
                    │  fetch (POST, JSON)
                    ▼
[ Vercel Functions (サーバーレス) ]
   POST /api/describe        座標/地域名 → 街の解説・提案を生成
   POST /api/food-stamp      料理写真   → 料理名を認識（Vision）
   POST /api/describe-image  写真+座標  → 被写体を土地の文脈で解説（Vision）
   ※ APIキーはサーバー側の環境変数で秘匿（フロントに出さない）
                    │
                    ▼
[ Google Gemini (gemini-2.0-flash) ]
   テキスト生成 ＋ 画像認識 / responseSchema で構造化JSON出力

外部連携: Nominatim(逆ジオコーディング) ・ Wikimedia/Wikipedia(実写画像) ・ OpenStreetMap(地図)
```

## ディレクトリ構成

```
api/                     Vercel Functions（バックエンド）
  describe.ts            POST /api/describe        エンドポイント
  food-stamp.ts          POST /api/food-stamp      エンドポイント
  describeImage.ts       POST /api/describe-image  エンドポイント
  _lib/                  Gemini呼び出し＋JSONパースの中核ロジック（API/CLI共通）
    describe.ts          地域名 → 街の解説JSON
    foodStamp.ts         料理写真 → 料理名認識JSON
    describeImage.ts     写真+地域名 → 画像解説JSON
src/
  components/            画面コンポーネント（地図・御朱印帳・カメラ 等）
  hooks/                 API呼び出し・GPS・localStorage を包むカスタムフック
  lib/makeStamp.ts       写真+Canvasで御朱印スタンプ画像を生成
  types.ts              フロント/GPS/LLM で共有する型定義（唯一の正）
scripts/generate.mjs     ローカル動作確認用CLI（LLM担当専用・リポジトリ非管理）
```

## セットアップ

```bash
git clone https://github.com/<オーナー名>/<リポジトリ名>.git
cd <リポジトリ名>
npm install

cp .env.example .env      # .env に GEMINI_API_KEY を貼る
npm run dev               # http://localhost:5173
```

Gemini APIキーは [Google AI Studio](https://aistudio.google.com/apikey) で発行（無料枠は1日約1500リクエスト）。`.env` は**絶対にコミットしない**（`.gitignore` 済み）。Vercel では同名の環境変数 `GEMINI_API_KEY` に設定する。

| 環境変数 | 必須 | 説明 |
| --- | --- | --- |
| `GEMINI_API_KEY` | ○ | Gemini APIキー。サーバー側でのみ読み、フロントには出さない |
| `GEMINI_MODEL` | | 使用モデルの上書き（既定 `gemini-2.0-flash`） |

## バックエンド / API

APIはすべて **POST・JSON**。APIキーはフロントに露出させず、Vercelの環境変数から**サーバー側でのみ**読む。生成AIの出力は Gemini の `responseSchema` で構造を固定し、欠損しても落ちないようフォールバックを入れてある。

### `POST /api/describe` — 街の解説を生成

```jsonc
// リクエスト（いずれか）
{ "areaName": "東京都台東区浅草" }               // 地域名を直接
{ "lat": 35.7148, "lng": 139.7967 }             // 座標（Nominatimで地名に変換）
// 任意: 過去の訪問履歴を渡すと、繋がりのある街にさりげなく触れる
{ "areaName": "...", "history": [{ "areaName": "鎌倉市" }] }

// レスポンス
{
  "areaName":    "東京都台東区浅草",
  "summary":     "...",   // 1〜2文の概要
  "history":     "...",   // ざっくり歴史
  "food":        "...",   // 名産・グルメ
  "souvenir":    "...",   // おみやげ
  "celebrity":   "...",   // ゆかりの有名人
  "description": "...",   // 上記を結合した解説本文（フロント互換）
  "images":      { "summary": "...", "history": "...", ... }, // 各カードの画像検索語
  "wanderPicks": [ { "name": "...", "price": "¥500", "walkMin": 8, "note": "..." } ],
  "deals":       [ { "title": "...", "detail": "..." } ]
}
```

### `POST /api/food-stamp` — 料理写真を認識（御朱印スタンプ用）

```jsonc
// リクエスト
{ "image": "data:image/jpeg;base64,...", "areaName": "浅草" }  // dataURL/base64どちらも可

// レスポンス
{
  "isFood":      true,
  "dishName":    "もんじゃ焼き",
  "oneLine":     "...",
  "specialties": ["...", "..."],   // その土地の名物（再訪の"あと◯品"表示に使用）
  "nextDish":    "..."             // 次におすすめの一品
}
```

### `POST /api/describe-image` — 写真を土地の文脈で解説

```jsonc
// リクエスト（座標 or 地域名）
{ "image": "<base64>", "mimeType": "image/jpeg", "lat": 35.71, "lng": 139.79 }

// レスポンス
{ "areaName": "...", "summary": "...", "subject": "...", "context": "...", "description": "..." }
```

## 設計上の工夫（技術メモ）

- **APIキーの隔離** — キーはVercel環境変数からサーバー側でのみ読み、フロントには一切出さない。
- **共有ロジックの一本化** — Gemini呼び出し＋パースの中核を `api/_lib/*.ts` に集約し、Vercel Function（チーム結合）とローカルCLI（動作確認）の両方から同じコードを使う。テスト用に `fetchImpl` を差し替え可能。
- **構造化JSON出力** — `responseSchema` で出力形式を強制し、安定してパース。`responseSchema` 指定時も念のため `try/catch` で保険をかける。
- **フォールバック設計** — 画像クエリ・提案・お得情報が欠けても配列/既定値で受け、体験が途切れない。AI障害時は手入力で継続。
- **共有の型定義を1ファイルに** — `src/types.ts` を唯一の正として、3人（フロント／GPS／LLM）で分業してもデータ形式が破綻しない。
- **プロンプトのリスク対策** — 「不確かなことは断定しない」「特定できない被写体は風景として説明」を明示指定。
- **画像生成に頼らない** — スタンプは写真＋Canvasで生成し、コストと可用性リスクを回避。演出・文様はすべてCSS（画像アセットゼロ＝軽量）。

## ローカルでのLLM単体確認（LLM担当専用）

Vercelを立てずに `api/_lib/describe.ts` の生成ロジックだけを叩ける確認用CLI。

```bash
npm run generate -- "京都市"
# → 標準出力に結果を表示し、output/京都市.json に保存
```

`node --experimental-strip-types` で `.ts` の共有ロジックを直接読み込む（Node 22.6+ が必要）。`scripts/generate.mjs` は `.gitignore` 済みでリポジトリには含まれない。

## 開発ルール

**この2つだけ守る。**

1. **main に直接プッシュしない**
2. **ブランチを切る前に必ず main を pull する**

```bash
git checkout main && git pull          # 1. main を最新に
git checkout -b feature/作業内容        # 2. ブランチを切る
git add . && git commit -m "メッセージ" # 3. 作業 → コミット
git push -u origin feature/作業内容      #    → プッシュ
# 4. GitHub で PR 作成 → プレビューURLで確認 → マージ
# 5. 次の作業に入る前に必ず main を pull（ここに戻る）
```

ブランチ名は `feature/xxx`（機能追加）／`fix/xxx`（バグ修正）／`docs/xxx`（ドキュメント）。困ったらまず `git status`。

## チーム

3人構成（フロントエンド／GPS・位置情報／LLM・バックエンド）
