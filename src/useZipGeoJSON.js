import { useState, useEffect } from "react";

let globalCache = null;
let globalPromise = null;

async function fetchAllPolygons() {
  if (globalCache) return globalCache;
  if (globalPromise) return globalPromise;
  globalPromise = fetch("/data/zip_polygons.json")
    .then((r) => r.json())
    .then((d) => { globalCache = d; return d; });
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