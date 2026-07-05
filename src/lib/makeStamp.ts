// 写真から「御朱印風スタンプ画像」を作るヘルパー（Canvas、依存なし）。
// AIに画像生成させず、ユーザーの写真を加工してスタンプ化する（安く確実）。

/** File を <img> 要素として読み込む。 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました。"));
    };
    img.src = url;
  });
}

/** API送信用に縮小した JPEG dataURL を返す（大きすぎる写真対策）。 */
export function resizeToDataUrl(img: HTMLImageElement, max = 768): string {
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 写真を丸くトリミング＋朱印風の枠＋料理名でスタンプ画像化し、dataURLで返す。 */
export function makeStampDataUrl(img: HTMLImageElement, dishName: string): string {
  const S = 440;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;

  // 背景（和紙色）
  ctx.fillStyle = "#fbf6e8";
  ctx.fillRect(0, 0, S, S);

  const cx = S / 2;
  const cy = 200;
  const r = 140;

  // 円形に写真を描く（coverフィット）
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  // 朱の色味オーバーレイ（御朱印っぽさ）
  ctx.fillStyle = "rgba(184, 59, 46, 0.12)";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  // 二重の朱印リング
  ctx.strokeStyle = "#b83b2e";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 19, 0, Math.PI * 2);
  ctx.stroke();

  // 料理名（下部の朱バンド）
  const name = (dishName || "ご当地グルメ").slice(0, 12);
  ctx.font = "bold 24px system-ui, 'Hiragino Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textW = ctx.measureText(name).width;
  const bw = Math.min(S - 36, textW + 44);
  const bh = 44;
  const bx = (S - bw) / 2;
  const by = cy + r + 28;
  ctx.fillStyle = "#b83b2e";
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, cx, by + bh / 2 + 1);

  return canvas.toDataURL("image/jpeg", 0.9);
}
