// useDistrictData.js
import { useState, useEffect } from "react";

const cache = {};

export function useDistrictData(dataFile) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dataFile) return;
    if (cache[dataFile]) {
      setData(cache[dataFile]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(dataFile)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${dataFile}`);
        return r.json();
      })
      .then((json) => {
        cache[dataFile] = json;
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [dataFile]);

  return { data, loading, error };
}
