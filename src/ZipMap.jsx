// ZipMap.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FitBounds({ geoJSON }) {
  const map = useMap();
  useEffect(() => {
    if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) return;
    try {
      const L = window.L || require("leaflet");
      // Compute bounds from all features
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      geoJSON.features.forEach((f) => {
        const coords = getAllCoords(f.geometry);
        coords.forEach(([lng, lat]) => {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
        });
      });
      if (minLat < maxLat && minLng < maxLng) {
        map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [20, 20] });
      }
    } catch (e) {
      console.warn("fitBounds error", e);
    }
  }, [geoJSON, map]);
  return null;
}

function getAllCoords(geometry) {
  if (!geometry) return [];
  const flatten = (arr, depth = 0) => {
    if (depth === 0) return arr; // [lng, lat]
    return arr.flatMap((a) => flatten(a, depth - 1));
  };
  switch (geometry.type) {
    case "Point": return [geometry.coordinates];
    case "LineString":
    case "MultiPoint": return geometry.coordinates;
    case "Polygon":
    case "MultiLineString": return geometry.coordinates.flat();
    case "MultiPolygon": return geometry.coordinates.flat(2);
    case "GeometryCollection": return geometry.geometries.flatMap(getAllCoords);
    default: return [];
  }
}

const featureStyle = {
  color: "#2563eb",
  weight: 1.5,
  fillColor: "#3b82f6",
  fillOpacity: 0.35,
};

const hoverStyle = {
  color: "#1d4ed8",
  weight: 2.5,
  fillColor: "#1d4ed8",
  fillOpacity: 0.55,
};

export default function ZipMap({ geoJSON, zipData, loading, error }) {
  const geoKey = useMemo(
    () => (geoJSON ? geoJSON.features.map((f) => f.properties?.ZCTA5CE10 || f.properties?.ZIP).join(",") : "empty"),
    [geoJSON]
  );

  const onEachFeature = (feature, layer) => {
    const zip =
      feature.properties?.ZCTA5CE10 ||
      feature.properties?.ZIP ||
      feature.properties?.zip ||
      feature.properties?.GEOID ||
      feature.properties?.ZCTA5 ||
      "Unknown";
    const info = zipData?.[zip];
    layer.on({
      mouseover: (e) => {
        e.target.setStyle(hoverStyle);
        e.target.bringToFront();
      },
      mouseout: (e) => {
        e.target.setStyle(featureStyle);
      },
    });
    if (info) {
      layer.bindTooltip(
        `<strong>ZIP ${zip}</strong><br/>Overlap: ${(info.overlap * 100).toFixed(1)}%<br/>Pop in district: ${info.district_pop?.toLocaleString() ?? "N/A"}`,
        { sticky: true }
      );
    } else {
      layer.bindTooltip(`<strong>ZIP ${zip}</strong>`, { sticky: true });
    }
  };

  return (
    <div className="map-container">
      {loading && (
        <div className="map-overlay">
          <div className="spinner" />
          <span>Loading ZIP boundaries…</span>
        </div>
      )}
      {error && (
        <div className="map-overlay map-error">
          <span>⚠ Could not load map boundaries: {error}</span>
        </div>
      )}
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoJSON && geoJSON.features.length > 0 && (
          <>
            <GeoJSON
              key={geoKey}
              data={geoJSON}
              style={featureStyle}
              onEachFeature={onEachFeature}
            />
            <FitBounds geoJSON={geoJSON} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
