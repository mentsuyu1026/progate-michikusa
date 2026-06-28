// michikusa - LLM担当(2人目)
// ローカル動作確認用CLI: 地域名を渡すと解説JSONを生成し output/ に書き出す。
//
// 使い方:
//   1) .env に GEMINI_API_KEY を設定(.env.example を参照)
//   2) node scripts/generate.mjs "京都市"
//      → output/京都市.json が生成され、内容も標準出力に表示される
//
// Vercelを立てなくても、地域名 → JSON の流れだけを単体で試せる。

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateAreaDescription } from "../api/_lib/describe.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// .env を簡易読み込み(依存を増やさないため自前パース)。
async function loadEnv() {
  try {
    const text = await readFile(join(projectRoot, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // .env が無くても環境変数で渡されていればOK。
  }
}

async function main() {
  await loadEnv();

  const areaName = process.argv.slice(2).join(" ").trim();
  if (!areaName) {
    console.error('使い方: node scripts/generate.mjs "地域名"');
    console.error('例:    node scripts/generate.mjs "東京都台東区浅草"');
    process.exit(1);
  }

  console.log(`「${areaName}」の解説を生成中...`);
  const result = await generateAreaDescription(areaName);

  const outDir = join(projectRoot, "output");
  await mkdir(outDir, { recursive: true });
  // ファイル名に使えない文字を置換。
  const safeName = areaName.replace(/[\\/:*?"<>|]/g, "_");
  const outPath = join(outDir, `${safeName}.json`);
  await writeFile(outPath, JSON.stringify(result, null, 2), "utf8");

  console.log("\n--- 生成結果 ---");
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n✓ 保存しました: output/${safeName}.json`);
}

main().catch((err) => {
  console.error("\n✗ エラー:", err.message);
  process.exit(1);
});
