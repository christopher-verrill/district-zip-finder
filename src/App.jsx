import { useState, useMemo, useEffect } from "react";
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

  // ALL zips in the district (no threshold) — used for district-wide totals
  const allDistrictZips = useMemo(() => {
    if (!data || !selectedDistrict || !data[selectedDistrict]) return [];
    return data[selectedDistrict];
  }, [data, selectedDistrict]);

  // ZIPs that pass the waste threshold
  const qualifyingZips = useMemo(() => {
    if (!allDistrictZips.length) return [];
    const minOverlap = (100 - wasteThreshold) / 100;
    return allDistrictZips
      .filter((z) => z.overlap >= minOverlap)
      .sort((a, b) => b.overlap - a.overlap);
  }, [allDistrictZips, wasteThreshold]);

  // Stats
  const stats = useMemo(() => {
    if (!allDistrictZips.length) return null;

    // Total population IN the district (sum of district_pop across all ZIPs)
    const totalDistrictPop = allDistrictZips.reduce((s, z) => s + (z.district_pop || 0), 0);

    // Population reached = sum of district_pop for qualifying ZIPs
    const reachedPop = qualifyingZips.reduce((s, z) => s + (z.district_pop || 0), 0);

    // Total spend = sum of zip_pop for qualifying ZIPs (people you're paying to reach)
    const totalSpend = qualifyingZips.reduce((s, z) => s + (z.zip_pop || 0), 0);

    // Waste = people reached outside district / total spend
    const outsidePop = qualifyingZips.reduce((s, z) => {
      const outside = (z.zip_pop || 0) - (z.district_pop || 0);
      return s + Math.max(0, outside);
    }, 0);

    const coveragePct = totalDistrictPop > 0 ? (reachedPop / totalDistrictPop) * 100 : 0;
    const wastePct = totalSpend > 0 ? (outsidePop / totalSpend) * 100 : 0;

    return {
      totalDistrictPop,
      reachedPop,
      totalSpend,
      outsidePop,
      coveragePct,
      wastePct,
    };
  }, [allDistrictZips, qualifyingZips]);


const recommendedThreshold = useMemo(() => {
  if (!allDistrictZips.length) return null;
  const totalDistrictPop = allDistrictZips.reduce((s, z) => s + (z.district_pop || 0), 0);
  if (totalDistrictPop === 0) return null;

  for (let t = 0; t <= 99; t++) {
    const minOverlap = (100 - t) / 100;
    const zips = allDistrictZips.filter((z) => z.overlap >= minOverlap);
    const reached = zips.reduce((s, z) => s + (z.district_pop || 0), 0);
    const coverage = (reached / totalDistrictPop) * 100;
    if (coverage >= 99) return t;
  }

  let bestT = 99;
  let bestCoverage = 0;
  for (let t = 0; t <= 99; t++) {
    const minOverlap = (100 - t) / 100;
    const zips = allDistrictZips.filter((z) => z.overlap >= minOverlap);
    const reached = zips.reduce((s, z) => s + (z.district_pop || 0), 0);
    const coverage = (reached / totalDistrictPop) * 100;
    if (coverage > bestCoverage) { bestCoverage = coverage; bestT = t; }
  }
  return bestT;
}, [allDistrictZips]);

useEffect(() => {
  if (recommendedThreshold !== null) {
    setWasteThreshold(recommendedThreshold);
  }
}, [recommendedThreshold]);

  const zipSet = useMemo(() => new Set(qualifyingZips.map((z) => z.zip)), [qualifyingZips]);
  const zipDataMap = useMemo(() => {
    const m = {};
    qualifyingZips.forEach((z) => { m[z.zip] = z; });
    return m;
  }, [qualifyingZips]);

  const { geoJSON, loading: geoLoading, error: geoError } = useZipGeoJSON(
    selectedDistrict ? zipSet : null
  );

  const ballotpediaUrl = selectedDistrict ? districtType.ballotpedia(selectedDistrict) : null;

const handleCopySpreadsheet = () => {
  const text = qualifyingZips.map((z) => z.zip).join("\n");
  navigator.clipboard.writeText(text).then(() => {
    setCopied("sheet");
    setTimeout(() => setCopied(false), 2000);
  });
};

const handleCopyComma = () => {
  const text = qualifyingZips.map((z) => z.zip).join(",");
  navigator.clipboard.writeText(text).then(() => {
    setCopied("comma");
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
                    onClick={() => { setDistrictTypeId(dt.id); setSelectedDistrict(""); setSearch(""); }}
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
<div className="threshold-label-row">
  <span className="panel-label" style={{marginBottom: 0}}>Waste Threshold</span>
  {recommendedThreshold !== null && (
<button
  className="recommended-btn"
  onClick={() => setWasteThreshold(recommendedThreshold)}
  title={"Set waste threshold to " + recommendedThreshold + "%"}
>
  ✦ Set to recommended: {recommendedThreshold}%  →
</button>
  )}
</div>
<div className="threshold-stepper">
  <button className="stepper-btn" onClick={() => setWasteThreshold(Math.max(0, wasteThreshold - 1))}>−</button>
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
  <button className="stepper-btn" onClick={() => setWasteThreshold(Math.min(99, wasteThreshold + 1))}>+</button>
</div>
            <input
              type="range" min={0} max={99} step={1}
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
              <a href={ballotpediaUrl} target="_blank" rel="noopener noreferrer" className="ballotpedia-link">
                🗳 View {selectedDistrict} on Ballotpedia ↗
              </a>
            </section>
          )}

{selectedDistrict && qualifyingZips.length > 0 && (
  <section className="panel">
    <label className="panel-label">Export ZIPs</label>
    <div className="copy-buttons">
      <button className="copy-btn-large" onClick={handleCopySpreadsheet}>
        {copied === "sheet" ? "✓ Copied!" : "📋 Copy for Spreadsheet"}
        <span className="copy-btn-sub">One ZIP per line</span>
      </button>
      <button className="copy-btn-large" onClick={handleCopyComma}>
        {copied === "comma" ? "✓ Copied!" : "📋 Copy with commas separating ZIPs"}
        <span className="copy-btn-sub">Comma-separated</span>
      </button>
    </div>
  </section>
)}

        </aside>

        <div className="content">
          {selectedDistrict && stats && (
            <section className="stats-bar">
              <div className="stats-insight">
                Targeting <strong>{qualifyingZips.length} ZIP{qualifyingZips.length !== 1 ? "s" : ""}</strong> reaches{" "}
                <strong className={stats.coveragePct >= 90 ? "pct-reach" : "pct-waste-high"}>{stats.coveragePct.toFixed(1)}%</strong> of voters in{" "}
                <strong>{selectedDistrict}</strong> ({stats.reachedPop.toLocaleString()} of {stats.totalDistrictPop.toLocaleString()} people).{" "}
                You would waste <strong className={stats.wastePct < 30 ? "pct-reach" : stats.wastePct <= 50 ? "pct-waste" : "pct-waste-high"}>{stats.wastePct.toFixed(1)}%</strong> of your spend on people outside the district.
              </div>
              <div className="stats-pills">
                <div className="stat-pill">
                  <span className="stat-pill-value">{stats.reachedPop.toLocaleString()}</span>
                  <span className="stat-pill-label">People reached in district</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-pill-value">{stats.totalSpend.toLocaleString()}</span>
                  <span className="stat-pill-label">Total people in selected ZIPs</span>
                </div>
                <div className="stat-pill">
                  <span className={"stat-pill-value " + (stats.wastePct < 30 ? "value-good" : stats.wastePct <= 50 ? "value-amber" : "value-warn")}>{stats.wastePct.toFixed(1)}%</span>
                  <span className="stat-pill-label">Spend waste</span>
                </div>
                <div className="stat-pill">
                  <span className={"stat-pill-value " + (stats.coveragePct >= 90 ? "value-good" : "value-warn")}>{stats.coveragePct.toFixed(1)}%</span>
                  <span className="stat-pill-label">District coverage</span>
                </div>
              </div>
            </section>
          )}

          <section className="map-section">
            {!selectedDistrict ? (
              <div className="map-placeholder">
                <span>← Select a district to see its ZIP codes on the map</span>
              </div>
            ) : (
              <ZipMap geoJSON={geoJSON} zipData={zipDataMap} loading={geoLoading} error={geoError} />
            )}
          </section>

          {selectedDistrict && stats && (
            <section className="results-section">
              <div className="results-header">
                <h2>
                  {qualifyingZips.length} ZIP{qualifyingZips.length !== 1 ? "s" : ""} in{" "}
                  <strong>{selectedDistrict}</strong>
                  {wasteThreshold > 0 && (
                    <span className="threshold-badge">≥{100 - wasteThreshold}% overlap</span>
                  )}
                </h2>
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
                        <th style={{width:"110px"}}>ZIP Code</th>
                        <th style={{width:"220px"}}>% in District</th>
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
                              <div className="overlap-bar-track">
                                <div
                                  className="overlap-bar"
                                  style={{ width: (z.overlap * 100).toFixed(1) + "%" }}
                                />
                              </div>
                              <span className="overlap-pct">{(z.overlap * 100).toFixed(1)}%</span>
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
