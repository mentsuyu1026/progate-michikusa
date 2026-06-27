# LLM連携 (2人目担当)

地域名を Gemini に渡し、特色・歴史・文化の解説を **構造化JSON** で生成する部分。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `api/_lib/describe.js` | プロンプト設計＋Gemini呼び出し＋JSONパースの中核ロジック(API/CLI共通) |
| `api/describe.js` | Vercel Function `POST /api/describe`(チーム結合用エンドポイント) |
| `scripts/generate.mjs` | ローカル動作確認CLI(地域名→JSONファイル出力) |

## セットアップ

```bash
cp .env.example .env      # .env に GEMINI_API_KEY を貼る
```

Gemini APIキーは [Google AI Studio](https://aistudio.google.com/apikey) で発行(無料枠 1日約1500リクエスト)。

## 1. ローカルで試す(Vercel不要)

```bash
node scripts/generate.mjs "京都市"
# または
npm run generate -- "東京都台東区浅草"
```

→ 標準出力に結果を表示し、`output/京都市.json` に保存します。

## 2. APIとして使う(チーム結合)

`POST /api/describe`

```jsonc
// リクエスト(どちらか)
{ "areaName": "東京都台東区浅草" }   // 地域名を直接渡す
{ "lat": 35.7148, "lng": 139.7967 } // 座標(Nominatimで地名に変換)

// レスポンス
{
  "areaName":   "東京都台東区浅草",
  "summary":    "...",   // 1〜2文の概要
  "history":    "...",   // ざっくり歴史
  "food":       "...",   // 名産・グルメ
  "souvenir":   "...",   // おみやげ
  "celebrity":  "...",   // ゆかりの有名人
  "description":"..."    // 上記を結合した解説本文(フロント互換)
}
```

`summary`/`history`/`food`/`souvenir`/`celebrity` は STEP2 で決めた出力フォーマット。
`areaName`/`description` は仕様書6章のフロント互換フィールド。

## 注意点

- APIキーはサーバー側(Vercel環境変数)でのみ読み、フロントには出しません(仕様書9章)。
- プロンプトで「不確かなことは断定しない」よう指定済み。デモ前に内容確認推奨。
