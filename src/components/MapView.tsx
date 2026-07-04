import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Coordinates, AreaSpot } from "../types";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// Vite と Leaflet のデフォルトアイコン問題対処(既定ピンを使う他コンポーネント用に残す)。
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
});

// 色付きのピンを SVG(divIcon)で自作する。外部画像に依存しないので確実に色分けできる。
function pinIcon(color: string): L.DivIcon {
    return L.divIcon({
        className: "spot-pin", // 既定の白枠を消すため(CSSで背景透明に)
        html: `<svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
            <circle cx="13" cy="13" r="4.5" fill="#fff"/>
        </svg>`,
        iconSize: [26, 38],
        iconAnchor: [13, 38], // 下の尖端が座標に来るように
        tooltipAnchor: [0, -40], // ラベルはピンの上に
    });
}

const CURRENT_ICON = pinIcon("#e2452f"); // 現在地=赤
const SPOT_ICON = pinIcon("#2f6fe2"); // 名所=青

// スポットのカテゴリ(どのカード由来か)を、ラベル用の短い日本語にする。
const SPOT_LABELS: Record<AreaSpot["key"], string> = {
    summary: "名所",
    history: "歴史",
    food: "グルメ",
    souvenir: "お土産",
    celebrity: "有名人",
};

type MapViewProps = {
    center: Coordinates;
    // 各カードの有名スポット(座標つき)。あれば地図上にピンを立てる。省略時は現在地のみ。
    spots?: AreaSpot[];
}

// スポットがある場合、現在地＋全スポットが画面に収まるよう表示範囲を自動調整する。
function FitBounds({ center, spots }: { center: Coordinates; spots: AreaSpot[] }) {
    const map = useMap();
    useEffect(() => {
        if (spots.length === 0) return;
        const points: [number, number][] = [
            [center.lat, center.lng],
            ...spots.map((s) => [s.lat, s.lng] as [number, number]),
        ];
        map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    }, [map, center, spots]);
    return null;
}

/**
 * 地図表示コンポーネント。
 * 現在地=赤ピン、名所=青ピンで表示する。
 * 各ピンには常時ラベル(現在地 / カテゴリ｜名所名)を出し、どの名所か一目で分かるようにする。
 */
function MapView({ center, spots = [] }: MapViewProps) {
    return (
        <MapContainer
            center={[center.lat, center.lng]}
            zoom={15}
            className="map-view"
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            />
            <Marker position={[center.lat, center.lng]} icon={CURRENT_ICON}>
                <Tooltip permanent direction="top" className="spot-tooltip current">
                    現在地
                </Tooltip>
            </Marker>
            {spots.map((s) => (
                <Marker key={s.key} position={[s.lat, s.lng]} icon={SPOT_ICON}>
                    <Tooltip permanent direction="top" className="spot-tooltip">
                        <span className="spot-cat">{SPOT_LABELS[s.key]}</span>
                        {s.label}
                    </Tooltip>
                </Marker>
            ))}
            {spots.length > 0 && <FitBounds center={center} spots={spots} />}
        </MapContainer>
    );
}

export default MapView;
