import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

let dmaCache = null;
let dmaPromise = null;

async function fetchDMABoundaries() {
  if (dmaCache) return dmaCache;
  if (dmaPromise) return dmaPromise;
  dmaPromise = fetch("./data/dma_boundaries.json")
    .then(function(r) { return r.json(); })
    .then(function(d) {
      dmaCache = d;
      return d;
    });
  return dmaPromise;
}


function getAllCoords(geometry) {
  if (!geometry) return [];
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

// Renders ZIP polygons directly via raw Leaflet
function ZipLayer({ geoJSON, zipData }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(function() {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) return;

    var layer = window.L.geoJSON(geoJSON, {
      style: function() {
        return { color: "#02734A", weight: 1.5, fillColor: "#02734A", fillOpacity: 0.3 };
      },
      onEachFeature: function(feature, lyr) {
        var zip = (feature.properties && (feature.properties.ZCTA5CE10 || feature.properties.ZCTA5CE20)) || "";
        var info = zipData && zipData[zip];
        lyr.on({
          mouseover: function(e) {
            e.target.setStyle({ color: "#015c3b", weight: 2.5, fillColor: "#015c3b", fillOpacity: 0.5 });
            e.target.bringToFront();
          },
          mouseout: function(e) {
            e.target.setStyle({ color: "#02734A", weight: 1.5, fillColor: "#02734A", fillOpacity: 0.3 });
          },
        });
        if (info) {
          lyr.bindTooltip(
            "<strong>ZIP " + zip + "</strong><br/>Overlap: " + (info.overlap * 100).toFixed(1) + "%<br/>Pop in district: " + (info.district_pop ? info.district_pop.toLocaleString() : "N/A"),
            { sticky: true }
          );
        }
      }
    });

    layer.addTo(map);
    layerRef.current = layer;

    // Fit bounds
    try {
      var bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch(e) {}

    return function() {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [geoJSON, map]);

  return null;
}

// Renders DMA boundaries directly via raw Leaflet
function DMALayer({ filteredDMAGeoJSON, showDMA }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(function() {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!showDMA || !filteredDMAGeoJSON || !filteredDMAGeoJSON.features || filteredDMAGeoJSON.features.length === 0) return;

    var layer = window.L.geoJSON(filteredDMAGeoJSON, {
      style: function() {
        return { color: "#F27405", weight: 3, fill: false, dashArray: "8 5" };
      },
      onEachFeature: function(feature, lyr) {
        var name = (feature.properties && (feature.properties.dma1 || feature.properties.dma_name || feature.properties.DMA_NAME)) || "DMA";
        lyr.on({
          mouseover: function(e) {
            e.target.setStyle({ color: "#F27405", weight: 4, fill: false, dashArray: "8 5" });
            e.target.bringToFront();
          },
          mouseout: function(e) {
            e.target.setStyle({ color: "#F27405", weight: 3, fill: false, dashArray: "8 5" });
          },
        });
        lyr.bindTooltip("<strong>" + name + "</strong><br/>DMA Boundary", { sticky: true });
      }
    });

    layer.addTo(map);
    layerRef.current = layer;

    return function() {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [filteredDMAGeoJSON, showDMA, map]);

  return null;
}

export default function ZipMap({ geoJSON, zipData, loading, error, showDMA, setShowDMA, dmaStats }) {
  const [filteredDMAGeoJSON, setFilteredDMAGeoJSON] = useState(null);
  const [dmaLoading, setDmaLoading] = useState(false);

  useEffect(function() {
    if (!showDMA) {
      setFilteredDMAGeoJSON(null);
      return;
    }

    setDmaLoading(true);

    fetchDMABoundaries().then(function(data) {
      if (!dmaStats || !data || !data.features) {
        setFilteredDMAGeoJSON(null);
        setDmaLoading(false);
        return;
      }

      var relevantNames = new Set(
        dmaStats.relevantDMAs.map(function(d) { return d.dma_name; })
      );

var normalize = function(s) {
  s = s.replace(/,([a-zA-Z])/g, " $1");
  s = s.replace(/,/g, "").replace(/[()]/g, " ").replace(/-/g, " ");
  s = s.replace(/&/g, "and");
  s = s.replace(/\band\b/gi, "");
  s = s.replace(/\bplus\b/gi, "");
  s = s.replace(/\bfort\b/gi, "ft");
  s = s.replace(/\bft\./gi, "ft");
  s = s.replace(/\s+/g, " ");
  return s.trim().toLowerCase();
};

var matches = function(a, b) {
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;
  var wordsA = a.split(" ");
  var wordsB = b.split(" ");
  if (wordsA[0] !== wordsB[0]) return false;
  var shorter = wordsA.length < wordsB.length ? wordsA : wordsB;
  var longer = wordsA.length >= wordsB.length ? wordsA : wordsB;
  var longerSet = new Set(longer);
  return shorter.every(function(w) { return longerSet.has(w); });
};

var features = data.features.filter(function(f) {
  var rawName = (f.properties && (f.properties.dma1 || f.properties.dma_name || f.properties.DMA_NAME)) || "";
  var normalizedGeoName = normalize(rawName);
  var matched = false;
  relevantNames.forEach(function(crosswalkName) {
    if (matches(normalize(crosswalkName), normalizedGeoName)) matched = true;
  });
  return matched;
});

      setFilteredDMAGeoJSON({ type: "FeatureCollection", features: features });
      setDmaLoading(false);
    }).catch(function(e) {
      console.error("DMA load error:", e);
      setDmaLoading(false);
    });
  }, [showDMA, dmaStats]);

  return (
    <div className="map-container">
      {(loading || dmaLoading) && (
        <div className="map-overlay">
          <div className="spinner" />
          <span>{dmaLoading ? "Loading DMA boundaries\u2026" : "Loading ZIP boundaries\u2026"}</span>
        </div>
      )}
      {error && (
        <div className="map-overlay map-error">
          <span>Could not load map: {error}</span>
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
        <ZipLayer geoJSON={geoJSON} zipData={zipData} />
        <DMALayer filteredDMAGeoJSON={filteredDMAGeoJSON} showDMA={showDMA} />
      </MapContainer>
    </div>
  );
}