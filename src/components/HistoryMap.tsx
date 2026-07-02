import { MapContainer, TileLayer, Marker } from "react-leaflet";
import type { VisitRecord } from "../types";
import "leaflet/dist/leaflet.css";
import "./HistoryMap.css";

type HistoryMapProps = {
    records: VisitRecord[];
    onMarkerClick: (record: VisitRecord) => void;
};

function HistoryMap({ records, onMarkerClick }: HistoryMapProps) {
    return (
        <MapContainer center={[36.5, 138]} zoom={5} className="history-map">
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            />
            {records.map((record) => (
                <Marker
                    key={record.id}
                    position={[record.coords.lat, record.coords.lng]}
                    eventHandlers={{
                        click: () => onMarkerClick(record),
                    }}
                />
            ))}
        </MapContainer>
    );
}

export default HistoryMap;