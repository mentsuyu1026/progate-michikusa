// 画像の圧縮・リサイズ用ユーティリティ。
// 送信用(API送信で413を避ける)と保存用(スタンプ素材として端末に残す)の
// 両方で使い回せるよう、サイズ・品質を引数化した汎用関数 + 用途別プリセットで構成する。

/** 圧縮オプション。 */
export type CompressOptions = {
    /** 長辺の最大ピクセル。これを超えたら縮小する(拡大はしない)。 */
    maxSize: number;
    /** JPEG品質 0〜1。 */
    quality: number;
    /** 出力形式。既定はJPEG(写真向き・軽い)。 */
    mimeType?: "image/jpeg" | "image/webp";
};

/** 圧縮結果。dataURL(base64)と、扱いやすいよう素のbase64部分も返す。 */
export type CompressedImage = {
    /** "data:image/jpeg;base64,...." 形式。<img> の src やプレビューにそのまま使える。 */
    dataUrl: string;
    /** プレフィックスを除いた base64 本体。API送信でinline_data等に使う。 */
    base64: string;
    /** 出力後のMIMEタイプ。 */
    mimeType: string;
    /** 圧縮後のおおよそのバイト数(base64長からの概算)。 */
    approxBytes: number;
    /** 圧縮後の幅・高さ。 */
    width: number;
    height: number;
};

/** 用途別プリセット。呼び出し側はこれを使えば個別の数値を意識しなくてよい。 */
export const IMAGE_PRESETS = {
    /** API送信用: 413回避を最優先に小さめ。文字認識も考えて長辺1280は確保。 */
    upload: { maxSize: 1280, quality: 0.7 } as CompressOptions,
    /** 保存用(スタンプ素材): 後で加工するので画質を保つ。長辺1600・高品質。 */
    store: { maxSize: 1600, quality: 0.85 } as CompressOptions,
    /** サムネイル用: 一覧表示など小さく見せる用途。 */
    thumbnail: { maxSize: 400, quality: 0.7 } as CompressOptions,
} as const;

/**
 * 画像(File/Blob)を圧縮・リサイズして返す。
 * canvas で再エンコードするため、EXIF等のメタデータは落ちる(プライバシー面ではむしろ利点)。
 */
export async function compressImage(
    file: File | Blob,
    options: CompressOptions
): Promise<CompressedImage> {
    const { maxSize, quality, mimeType = "image/jpeg" } = options;

    // 1) File/Blob を dataURL として読み込む
    const sourceDataUrl = await readAsDataURL(file);

    // 2) Image 要素にデコードして寸法を得る
    const img = await loadImage(sourceDataUrl);

    // 3) 長辺を maxSize に収める縮小率(拡大はしない = 上限1)
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    // 4) canvas に描いて再エンコード
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas コンテキストの取得に失敗しました");
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL(mimeType, quality);
    const base64 = dataUrl.split(",")[1] ?? "";
    const approxBytes = Math.floor((base64.length * 3) / 4);

    return { dataUrl, base64, mimeType, approxBytes, width, height };
}

/** File/Blob を dataURL 文字列として読み込む。 */
function readAsDataURL(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        reader.readAsDataURL(file);
    });
}

/** dataURL から HTMLImageElement を生成(デコード完了を待つ)。 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("画像のデコードに失敗しました"));
        image.src = src;
    });
}