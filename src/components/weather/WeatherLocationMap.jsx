import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapPin, RefreshCw } from 'lucide-react';

const ftpMarker = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function popupContent(location) {
  const root = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = location.name || 'Selected location';
  root.append(title);
  if (location.summary) {
    const summary = document.createElement('p');
    summary.textContent = location.summary;
    summary.style.margin = '4px 0 0';
    root.append(summary);
  }
  if (location.pinCode) {
    const pin = document.createElement('small');
    pin.textContent = `PIN ${location.pinCode} · nearby model-grid weather`;
    pin.style.display = 'block';
    pin.style.marginTop = '4px';
    root.append(pin);
  }
  return root;
}

export default function WeatherLocationMap({ location }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [mapError, setMapError] = useState('');
  const [tileError, setTileError] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let map;
    let resizeObserver;
    let resizeTimer;
    try {
      map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false })
        .setView([22.5, 79], 4);
      mapRef.current = map;
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(map);
      tiles.on('tileerror', () => setTileError(true));
      tiles.on('tileload', () => setTileError(false));
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(containerRef.current);
      }
      resizeTimer = window.setTimeout(() => map.invalidateSize(), 100);
      setMapError('');
    } catch {
      setMapError('The map could not be initialized. Check your connection and retry.');
    }

    return () => {
      resizeObserver?.disconnect();
      window.clearTimeout(resizeTimer);
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [mapVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;

    map.setView([latitude, longitude], 11, { animate: false });
    markerRef.current?.remove();
    markerRef.current = L.marker([latitude, longitude], { icon: ftpMarker })
      .addTo(map)
      .bindPopup(popupContent(location))
      .openPopup();
  }, [location]);

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" aria-label="Weather location map">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <p className="section-kicker">Location map</p>
          <h3 className="mt-1 text-base font-extrabold text-gray-950">{location?.name || 'Explore India'}</h3>
        </div>
        <MapPin className="shrink-0 text-brand-red" size={19} />
      </div>
      <div className="relative">
        <div ref={containerRef} className="ftp-weather-map h-[280px] w-full bg-slate-100 sm:h-[340px]" />
        {mapError ? (
          <div className="absolute inset-0 z-[500] grid place-content-center justify-items-center gap-3 bg-white/95 p-5 text-center">
            <p className="text-sm font-semibold text-gray-700">{mapError}</p>
            <button className="btn-secondary" onClick={() => { setTileError(false); setMapVersion((value) => value + 1); }}>
              <RefreshCw size={15} /> Retry map
            </button>
          </div>
        ) : tileError ? (
          <p className="absolute left-3 top-3 z-[500] max-w-xs rounded-md bg-white/95 px-3 py-2 text-xs font-semibold text-gray-700 shadow">
            Map tiles are temporarily unavailable. Weather search is still available.
          </p>
        ) : null}
      </div>
      <p className="border-t border-gray-100 px-4 py-2 text-xs leading-5 text-gray-500">
        {location?.pinCode
          ? `PIN ${location.pinCode} may cover several post offices; weather is for the nearby model grid, not a street-level reading.`
          : 'Weather coordinates indicate the selected place or nearby model grid.'}
      </p>
    </section>
  );
}
