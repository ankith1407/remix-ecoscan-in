import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useI18n } from '../i18n';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LiveTrackingMapProps {
  collectorLocation: Coordinate;
  pickupLocation?: Coordinate;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  collectorLocation,
  pickupLocation,
}) => {
  const { t } = useI18n();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const [browserUserLocation, setBrowserUserLocation] = useState<Coordinate | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setBrowserUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // The server-provided pickup coordinates remain available when browser GPS is denied.
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const userLocation = browserUserLocation || pickupLocation;

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;
    const initialPoint = userLocation || collectorLocation;
    if (!initialPoint) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([initialPoint.latitude, initialPoint.longitude], 14);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    const collectorPoint: L.LatLngExpression = [collectorLocation.latitude, collectorLocation.longitude];
    const points: L.LatLngExpression[] = [collectorPoint];

    L.circleMarker(collectorPoint, {
      radius: 9,
      color: '#174D35',
      weight: 3,
      fillColor: '#3FA66B',
      fillOpacity: 1,
    })
      .bindTooltip(t('collector'), { direction: 'top', offset: [0, -8] })
      .addTo(layers);

    if (userLocation) {
      const userPoint: L.LatLngExpression = [userLocation.latitude, userLocation.longitude];
      points.push(userPoint);
      L.circleMarker(userPoint, {
        radius: 8,
        color: '#7C2D12',
        weight: 3,
        fillColor: '#F59E0B',
        fillOpacity: 1,
      })
        .bindTooltip(browserUserLocation ? t('yourLocation') : t('pickupLocation'), {
          direction: 'top',
          offset: [0, -8],
        })
        .addTo(layers);

      L.polyline([collectorPoint, userPoint], {
        color: '#3FA66B',
        weight: 4,
        opacity: 0.8,
        dashArray: '8 8',
      }).addTo(layers);
    }

    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 16 });
  }, [browserUserLocation, collectorLocation, userLocation]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#DCE5DE] bg-[#DCE5DE]">
      <div ref={mapElementRef} className="h-56 w-full" aria-label="Live collector tracking map" />
      <div className="absolute bottom-2 left-2 z-[500] flex items-center gap-3 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-semibold text-[#172019] shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-[#174D35] bg-[#3FA66B]" />
          {t('collector')}
        </span>
        {userLocation && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-[#7C2D12] bg-[#F59E0B]" />
            {t('yourLocation')}
          </span>
        )}
      </div>
    </div>
  );
};
