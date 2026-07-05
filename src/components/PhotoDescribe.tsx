import { useState, useRef } from "react";
import type { Coordinates } from "../types";
import { useImageDescribe, type ImageDescription } from "../hooks/useImageDescribe";
import "./PhotoDescribe.css";

type PhotoDescribeProps = {
    coords: Coordinates | null;
};

const MAX_PHOTOS = 4; // 送りすぎ防止

function PhotoDescribe({ coords }: PhotoDescribeProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [result, setResult] = useState<ImageDescription | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { fetchImageDescribe } = useImageDescribe();

    const revokePreviews = (urls: string[]) => urls.forEach((u) => URL.revokeObjectURL(u));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS);
        if (files.length === 0) {
            return;
        }
        revokePreviews(previewUrls); // 前回分を解放
        setSelectedFiles(files);
        setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
        setResult(null);
        setError(null);
    };

    const handleSubmit = async () => {
        if (selectedFiles.length === 0 || !coords) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchImageDescribe(selectedFiles, coords);
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "解説の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        revokePreviews(previewUrls);
        setSelectedFiles([]);
        setPreviewUrls([]);
        setResult(null);
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const hasPhotos = previewUrls.length > 0;

    return (
        <div className="photo-describe">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
            />

            {!hasPhotos && (
                <button
                    className="photo-describe-button"
                    onClick={() => inputRef.current?.click()}
                    disabled={!coords}
                >
                    写真で解説（複数可）
                </button>
            )}

            {hasPhotos && (
                <div className="photo-describe-preview">
                    <div className="photo-previews">
                        {previewUrls.map((url, i) => (
                            <img key={url} src={url} alt={`選択した画像 ${i + 1}`} />
                        ))}
                    </div>
                    <div className="photo-describe-actions">
                        <button onClick={handleClear} disabled={loading}>
                            選び直す
                        </button>
                        <button onClick={handleSubmit} disabled={loading || !!result}>
                            {loading
                                ? "解析中..."
                                : `送信（${selectedFiles.length}枚）`}
                        </button>
                    </div>
                </div>
            )}

            {error && <p className="photo-describe-error">{error}</p>}

            {result && (
                <div className="photo-describe-result">
                    <p>{result.description}</p>
                </div>
            )}
        </div>
    );
}

export default PhotoDescribe;
