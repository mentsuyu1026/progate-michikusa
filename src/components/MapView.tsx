import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinalUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Coordinates } from "../types";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// Vite と Leaflet のデフォルトアイコン問題対処
L.Icon.Default.mergeOptions({
    iconUrl,
    iconRetinalUrl,
    shadowUrl,
});

type MapViewProps = {
    center: Coordinates;
}

/**
 * 地図表示コンポーネント。
 * 現在は中心座標にピンを1つ立てるだけの最小実装。
 */
function MapView({ center }: MapViewProps) {
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
        </MapContainer>
    );
}

export default MapView;