import { useState, useEffect } from "react";

let globalCache = null;
let globalPromise = null;

async function fetchAllPolygons() {
  if (globalCache) return globalCache;
  if (globalPromise) return globalPromise;

  globalPromise = Promise.all([
    fetch("/data/zip_polygons_1.json").then(function(r) { return r.json(); }),
    fetch("/data/zip_polygons_2.json").then(function(r) { return r.json(); }),
  ]).then(function(chunks) {
    var merged = {
      type: "FeatureCollection",
      features: chunks[0].features.concat(chunks[1].features)
    };
    globalCache = merged;
    return merged;
  });

  return globalPromise;
}

export function useZipGeoJSON(zipSet) {
  const [geoJSON, setGeoJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!zipSet || zipSet.size === 0) { setGeoJSON(null); return; }
    setLoading(true);
    setError(null);
    fetchAllPolygons()
      .then((all) => {
        const features = all.features.filter((f) =>
          zipSet.has(f.properties.ZCTA5CE10)
        );
        setGeoJSON({ type: "FeatureCollection", features });
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [zipSet]);

  return { geoJSON, loading, error };
}