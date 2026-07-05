import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import type { TrackSession } from "../types";
import "leaflet/dist/leaflet.css";
import "./TrackMapView.css";

type Props = {
    sessions: TrackSession[];
    onClose: () => void;
};

// // ダミーデータ有効化フラグ。デモ後は false にするか、この定数ごと削除する。
// const USE_DUMMY_DATA = true;

// // デモ用のダミーセッション。実データが空のときだけ使う。
// // 東京駅周辺を歩いたことにしてある。
// const DUMMY_SESSIONS: TrackSession[] = [
//     {
//         id: "dummy-1",
//         startedAt: "2026-07-01T10:00:00.000Z",
//         endedAt: "2026-07-01T10:30:00.000Z",
//         points: [
//             { lat: 35.6812, lng: 139.7671, t: 0 },
//             { lat: 35.6820, lng: 139.7680, t: 1 },
//             { lat: 35.6828, lng: 139.7690, t: 2 },
//             { lat: 35.6835, lng: 139.7695, t: 3 },
//             { lat: 35.6840, lng: 139.7688, t: 4 },
//         ],
//     },
//     {
//         id: "dummy-2",
//         startedAt: "2026-07-02T14:00:00.000Z",
//         endedAt: "2026-07-02T14:20:00.000Z",
//         points: [
//             { lat: 35.6805, lng: 139.7660, t: 0 },
//             { lat: 35.6800, lng: 139.7670, t: 1 },
//             { lat: 35.6795, lng: 139.7685, t: 2 },
//             { lat: 35.6800, lng: 139.7700, t: 3 },
//         ],
//     },
// ];

function TrackMapView({ sessions, onClose }: Props) {
    const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // モーダルが開いている間だけ、現在地を継続取得する。
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError("この端末では位置情報を取得できません");
            return;
        }
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setCurrentPos({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLocationError(null);
            },
            (err) => {
                setLocationError(err.message);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    // 描画するセッション: 実データがあればそれ、なければダミー(フラグが有効なとき)
    const displaySessions = sessions
        // sessions.length > 0 ? sessions : USE_DUMMY_DATA ? DUMMY_SESSIONS : [];

    return (
        <div className="track-modal-backdrop" onClick={onClose}>
            <div className="track-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="track-modal-close" onClick={onClose} aria-label="閉じる">
                    ×
                </button>
                <div className="track-modal-map">
                    {currentPos ? (
                        <MapContainer
                            center={[currentPos.lat, currentPos.lng]}
                            zoom={16}
                            style={{ height: "100%", width: "100%" }}
                        >
                            {/* <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            /> */}
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            />

                            {/* セッションを赤い線で描画 */}
                            {displaySessions.map((session) =>
                                session.points.length >= 2 ? (
                                    <Polyline
                                        key={session.id}
                                        positions={session.points.map((p) => [p.lat, p.lng])}
                                        pathOptions={{ color: "#d64545", weight: 4, opacity: 0.7 }}
                                    />
                                ) : null
                            )}
                            {/* 現在地を青い円で表示 */}
                            <CircleMarker
                                center={[currentPos.lat, currentPos.lng]}
                                radius={8}
                                pathOptions={{
                                    color: "#2b7cff",
                                    fillColor: "#2b7cff",
                                    fillOpacity: 0.8,
                                    weight: 2,
                                }}
                            />
                        </MapContainer>
                    ) : (
                        <div className="track-modal-loading">
                            {locationError ? (
                                <p>現在地を取得できません: {locationError}</p>
                            ) : (
                                <p>現在地を取得中…</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TrackMapView;