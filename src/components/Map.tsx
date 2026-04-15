import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OptimizedStop } from '../lib/optimization';
import { Location } from '../lib/geocoding';
import { useEffect } from 'react';

// Fix Leaflet default icon issue
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  start: Location | null;
  stops: OptimizedStop[];
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Custom icon generator
const createNumberedIcon = (number: string | number, isStart: boolean = false) => {
  const bgColor = isStart ? '#10b981' : '#3b82f6'; // Green for start, Blue for stops
  return L.divIcon({
    html: `<div style="
      background-color: ${bgColor}; 
      color: white; 
      width: 28px; 
      height: 28px; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 12px; 
      font-weight: bold; 
      border: 2px solid white; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transform: translate(-2px, -2px);
    ">${number}</div>`,
    className: 'custom-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export default function Map({ start, stops }: MapProps) {
  const defaultCenter: [number, number] = [-23.5505, -46.6333]; // São Paulo
  const center: [number, number] = start ? [start.lat, start.lng] : defaultCenter;

  const polylinePoints: [number, number][] = [];
  if (start) polylinePoints.push([start.lat, start.lng]);
  stops.forEach(stop => polylinePoints.push([stop.lat, stop.lng]));

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {start && (
        <Marker 
          position={[start.lat, start.lng]} 
          icon={createNumberedIcon('S', true)}
        >
          <Popup>
            <div className="font-bold">Ponto de Partida</div>
            <div className="text-xs">{start.address}</div>
          </Popup>
        </Marker>
      )}

      {stops.map((stop, index) => (
        <Marker 
          key={index} 
          position={[stop.lat, stop.lng]}
          icon={createNumberedIcon(index + 1)}
        >
          <Popup>
            <div className="font-bold">Parada {index + 1}</div>
            <div className="text-xs">{stop.address}</div>
            <div className="text-xs mt-1 text-blue-600 font-semibold">
              Chegada estimada: {stop.estimatedArrivalTime}
            </div>
          </Popup>
        </Marker>
      ))}

      {polylinePoints.length > 1 && (
        <Polyline positions={polylinePoints} color="#3b82f6" weight={4} opacity={0.7} dashArray="10, 10" />
      )}

      {start && <ChangeView center={center} zoom={13} />}
    </MapContainer>
  );
}
