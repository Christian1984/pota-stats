"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";

interface MapPoint {
  reference: string | null;
  parkName: string | null;
  lat: string | null;
  lon: string | null;
}

interface Props {
  points: MapPoint[];
}

// Fix default marker icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function SpotMap({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      preferCanvas: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    const cluster = (
      L as unknown as { markerClusterGroup: () => L.LayerGroup }
    ).markerClusterGroup();

    for (const p of points) {
      if (p.lat == null || p.lon == null) continue;
      const lat = parseFloat(p.lat);
      const lon = parseFloat(p.lon);
      if (isNaN(lat) || isNaN(lon)) continue;
      const marker = L.marker([lat, lon]);
      if (p.reference || p.parkName) {
        marker.bindPopup(`<strong>${p.reference ?? ""}</strong><br/>${p.parkName ?? ""}`);
      }
      cluster.addLayer(marker);
    }

    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
    };
  }, [points]);

  return (
    <div ref={containerRef} className="w-full rounded-xl overflow-hidden" style={{ height: 400 }} />
  );
}
