import { useState, useRef } from "react";
import type { Coordinates } from "../types";
import { useImageDescribe } from "../hooks/useImageDescribe";
import "./PhotoDescribe.css";

type PhotoDescribeProps = {
    coords: Coordinates | null;
};

type ImageDescribeResult = {
    description: string;
};

function PhotoDescribe({ coords }: PhotoDescribeProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<ImageDescribeResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { fetchImageDescribe } = useImageDescribe();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
    };

    const handleSubmit = async () => {
        if (!selectedFile || !coords) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchImageDescribe(selectedFile, coords);
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "解説の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setResult(null);
            setError(null);
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    };

    return (
        <div className="photo-describe">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: "none" }}
            />

            {!previewUrl && (
                <button
                    className="photo-describe-button"
                    onClick={() => inputRef.current?.click()}
                    disabled={!coords}
                >
                    写真で解説
                </button>
            )}

            {previewUrl && (
                <div className="photo-describe-preview">
                    <img src={previewUrl} alt="選択した画像" />
                    <div className="photo-describe-actions">
                        <button onClick={handleClear} disabled={loading}>
                            選び直す
                        </button>
                        <button onClick={handleSubmit} disabled={loading || !!result}>
                            {loading ? "解析中..." : "送信"}
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