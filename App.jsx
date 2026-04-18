// App.jsx
import { useState, useMemo } from "react";
import { DISTRICT_TYPES } from "./districtConfig";
import { useDistrictData } from "./useDistrictData";
import { useZipGeoJSON } from "./useZipGeoJSON";
import ZipMap from "./ZipMap";
import "./App.css";

export default function App() {
  const [districtTypeId, setDistrictTypeId] = useState(DISTRICT_TYPES[0].id);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [wasteThreshold, setWasteThreshold] = useState(0);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const districtType = DISTRICT_TYPES.find((d) => d.id === districtTypeId);
  const { data, loading: dataLoading, error: dataError } = useDistrictData(districtType.dataFile);

  const allDistricts = useMemo(() => {
    if (!data) return [];
    return Object.keys(data).sort();
  }, [data]);

  const filteredDistricts = useMemo(() => {
    if (!search.trim()) return allDistricts;
    const q = search.toLowerCase();
    return allDistricts.filter((d) => d.toLowerCase().includes(q));
  }, [allDistricts, search]);

  const qualifyingZips = useMemo(() => {
    if (!data || !selectedDistrict || !data[selectedDistrict]) return [];
    const minOverlap = (100 - wasteThreshold) / 100;
    return data[selectedDistrict]
      .filter((z) => z.overlap >= minOverlap)
      .sort((a, b) => b.overlap - a.overlap);
  }, [data, selectedDistrict, wasteThreshold]);

  const zipSet = useMemo(() => new Set(qualifyingZips.map((z) => z.zip)), [qualifyingZips]);

  const zipDataMap = useMemo(() => {
    const m = {};
    qualifyingZips.forEach((z) => { m[z.zip] = z; });
    return m;
  }, [qualifyingZips]);

  const { geoJSON, loading: geoLoading, error: geoError } = useZipGeoJSON(
    selectedDistrict ? zipSet : null
  );

  const ballotpediaUrl = selectedDistrict
    ? districtType.ballotpedia(selectedDistrict)
    : null;

  const handleCopyZips = () => {
    const text = qualifyingZips.map((z) => z.zip).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1>District ZIP Finder</h1>
          <p className="subtitle">Find ZIP codes by legislative district, filtered by overlap percentage</p>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          {DISTRICT_TYPES.length > 1 && (
            <section className="panel">
              <label className="panel-label">District Type</label>
              <div className="type-buttons">
                {DISTRICT_TYPES.map((dt) => (
                  <button
                    key={dt.id}
                    className={"type-btn" + (districtTypeId === dt.id ? " active" : "")}
                    onClick={() => {
                      setDistrictTypeId(dt.id);
                      setSelectedDistrict("");
                      setSearch("");
                    }}
                  >
                    {dt.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <label className="panel-label">{districtType.label}</label>
            <input
              className="search-input"
              type="text"
              placeholder="Search districts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {dataLoading && <div className="loading-msg">Loading district data…</div>}
            {dataError && <div className="error-msg">Error: {dataError}</div>}
            <div className="district-list">
              {filteredDistricts.map((d) => (
                <button
                  key={d}
                  className={"district-item" + (selectedDistrict === d ? " active" : "")}
                  onClick={() => setSelectedDistrict(d)}
                >
                  {d}
                </button>
              ))}
              {filteredDistricts.length === 0 && !dataLoading && (
                <div className="empty-msg">No districts found</div>
              )}
            </div>
          </section>

          <section className="panel">
            <label className="panel-label">
              Waste Threshold
              <input
  type="number"
  min={0}
  max={99}
  value={wasteThreshold}
  onChange={(e) => {
    const val = Math.min(99, Math.max(0, Number(e.target.value)));
    if (!isNaN(val)) setWasteThreshold(val);
  }}
  className="threshold-input"
/>
            </label>
            <input
              type="range"
              min={0}
              max={99}
              step={1}
              value={wasteThreshold}
              onChange={(e) => setWasteThreshold(Number(e.target.value))}
              className="slider"
            />
            <p className="slider-hint">
              Include ZIPs where at least <strong>{100 - wasteThreshold}%</strong> of
              the ZIP population falls within the selected district.
            </p>
          </section>

          {selectedDistrict && ballotpediaUrl && (
            <section className="panel">
              <a
                href={ballotpediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ballotpedia-link"
              >
                🗳 View {selectedDistrict} on Ballotpedia ↗
              </a>
            </section>
          )}
        </aside>

        <div className="content">
          <section className="map-section">
            {!selectedDistrict ? (
              <div className="map-placeholder">
                <span>← Select a district to see its ZIP codes on the map</span>
              </div>
            ) : (
              <ZipMap
                geoJSON={geoJSON}
                zipData={zipDataMap}
                loading={geoLoading}
                error={geoError}
              />
            )}
          </section>

          {selectedDistrict && (
            <section className="results-section">
              <div className="results-header">
                <h2>
                  {qualifyingZips.length} ZIP{qualifyingZips.length !== 1 ? "s" : ""} in{" "}
                  <strong>{selectedDistrict}</strong>
                  {wasteThreshold > 0 && (
                    <span className="threshold-badge">
                      ≥{100 - wasteThreshold}% overlap
                    </span>
                  )}
                </h2>
                {qualifyingZips.length > 0 && (
                  <button className="copy-btn" onClick={handleCopyZips}>
                    {copied ? "✓ Copied!" : "Copy ZIPs"}
                  </button>
                )}
              </div>

              {qualifyingZips.length === 0 ? (
                <div className="empty-results">
                  No ZIPs meet the current threshold. Lower the waste slider to include more.
                </div>
              ) : (
                <div className="zip-table-wrapper">
                  <table className="zip-table">
                    <thead>
                      <tr>
                        <th>ZIP Code</th>
                        <th>% in District</th>
                        <th>Pop. in District</th>
                        <th>Total ZIP Pop.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qualifyingZips.map((z) => (
                        <tr key={z.zip}>
                          <td className="zip-cell">{z.zip}</td>
                          <td>
                            <div className="overlap-bar-wrap">
                              <div
                                className="overlap-bar"
                                style={{ width: (z.overlap * 100).toFixed(1) + "%" }}
                              />
                              <span className="overlap-pct">
                                {(z.overlap * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td>{z.district_pop != null ? z.district_pop.toLocaleString() : "—"}</td>
                          <td>{z.zip_pop != null ? z.zip_pop.toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
