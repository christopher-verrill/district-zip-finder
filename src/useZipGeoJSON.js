import { useState, useEffect } from "react";

let polygonCache = null;
let polygonPromise = null;

let centroidCache = null;
let centroidPromise = null;

async function getCentroids() {
  if (centroidCache) return centroidCache;
  if (centroidPromise) return centroidPromise;
  centroidPromise = fetch("./data/zip_centroids.json")
    .then(function(r) { return r.json(); })
    .then(function(d) { centroidCache = d; return d; });
  return centroidPromise;
}

async function fetchAllPolygons() {
  if (polygonCache) return polygonCache;
  if (polygonPromise) return polygonPromise;

  polygonPromise = Promise.all([
    fetch("./data/zip_polygons_1.json").then(function(r) { return r.json(); }),
    fetch("./data/zip_polygons_2.json").then(function(r) { return r.json(); }),
  ]).then(function(chunks) {
    var merged = {
      type: "FeatureCollection",
      features: chunks[0].features.concat(chunks[1].features)
    };
    polygonCache = merged;
    return merged;
  });

  return polygonPromise;
}

function distMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function filterOutliers(features, centroids) {
  if (features.length < 3) return features;

  const points = features.map(function(f) {
    const zip = f.properties && (f.properties.ZCTA5CE10 || f.properties.ZCTA5CE20 || "");
    const c = centroids[zip];
    return c ? { lat: c[0], lng: c[1], feature: f } : null;
  }).filter(Boolean);

  if (points.length < 3) return features;

  const lats = points.map(function(p) { return p.lat; }).sort(function(a,b) { return a-b; });
  const lngs = points.map(function(p) { return p.lng; }).sort(function(a,b) { return a-b; });
  const medLat = lats[Math.floor(lats.length / 2)];
  const medLng = lngs[Math.floor(lngs.length / 2)];

  // Start at 150 miles, expand to 300 if it would cut more than 20% of ZIPs
  var threshold = 150;
  var kept = points.filter(function(p) {
    return distMiles(p.lat, p.lng, medLat, medLng) <= threshold;
  });

  if (kept.length < points.length * 0.8) {
    threshold = 300;
    kept = points.filter(function(p) {
      return distMiles(p.lat, p.lng, medLat, medLng) <= threshold;
    });
  }

  return kept.map(function(p) { return p.feature; });
}

export function useZipGeoJSON(zipSet) {
  const [geoJSON, setGeoJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(function() {
    if (!zipSet || zipSet.size === 0) { setGeoJSON(null); return; }
    setLoading(true);
    setError(null);

    Promise.all([fetchAllPolygons(), getCentroids()])
      .then(function(results) {
        var all = results[0];
        var centroids = results[1];

        var features = all.features.filter(function(f) {
          var zip = f.properties && (f.properties.ZCTA5CE10 || f.properties.ZCTA5CE20 || "");
          return zipSet.has(zip);
        });

        features = filterOutliers(features, centroids);
        setGeoJSON({ type: "FeatureCollection", features: features });
        setLoading(false);
      })
      .catch(function(e) {
        setError(e.message);
        setLoading(false);
      });
  }, [zipSet]);

  return { geoJSON, loading, error };
}