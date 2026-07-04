import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Coordinates, AreaSpot } from "../types";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// Vite と Leaflet のデフォルトアイコン問題対処
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
});

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
        map.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
    }, [map, center, spots]);
    return null;
}

/**
 * 地図表示コンポーネント。
 * 現在地にピンを立て、spots が渡されればスポットのピン(ポップアップ付き)も表示する。
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
            <Marker position={[center.lat, center.lng]}/>
            {spots.map((s) => (
                <Marker key={s.key} position={[s.lat, s.lng]}>
                    <Popup>{s.label}</Popup>
                </Marker>
            ))}
            {spots.length > 0 && <FitBounds center={center} spots={spots} />}
        </MapContainer>
    );
}

export default MapView;
