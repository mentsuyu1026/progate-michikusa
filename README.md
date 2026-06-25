# michikusa(仮)

普段訪れない地域に来た際、その地域の歴史・文化・特徴をLLMが解説してくれるWebアプリ。

## セットアップ

```bash
git clone https://github.com/<オーナー名>/<リポジトリ名>.git
cd <リポジトリ名>
npm install
npm run dev
```
.env を作成してAPIキーなど環境変数を記入
(なお.envは絶対にコミットしてはいけません。.gitignoreがあるので問題ないとは思いますが)
`http://localhost:5173` で確認。

## 開発の鉄則

**この2つだけ守ってください。**

1. **main に直接プッシュしない**(保護をかけようとしたのですがprivateリポジトリではできないみたいです。publicにするのであれば適用はできます。現状は気を付けるという運用しかできないみたいです。)
2. **ブランチを切る前に必ず main を pull する**

これを守らないとコンフリクトが発生し時間を消費することになります。

## 作業の流れ

```bash
# 1. main を最新に
git checkout main
git pull

# 2. ブランチを切る
git checkout -b feature/作業内容

# 3. 作業 → コミット → プッシュ
git add .
git commit -m "メッセージ"
git push -u origin feature/作業内容

# 4. GitHub で PR 作成 → プレビューURLで確認 → マージ

# 5. 次の作業に入る前に必ず main を pull(ここに戻る)
```

ブランチ名:

`feature/xxx`: 何かしらの機能追加,

`fix/xxx`: 何かしらのバグ修正, 

`docs/xxx`: 何かしらのドキュメント

## 困ったら

- まず `git status` を見る
- 最悪頑張れば何とか戻せます
