import { useState, useMemo, useEffect } from "react";
import { DISTRICT_TYPES } from "./districtConfig";
import { useDistrictData } from "./useDistrictData";
import { useZipGeoJSON } from "./useZipGeoJSON";
import { computeRecommendedThreshold } from "./recommendedThreshold";
import ZipMap from "./ZipMap";
import "./App.css";

export default function App() {
  const [districtTypeId, setDistrictTypeId] = useState(DISTRICT_TYPES[0].id);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [wasteThreshold, setWasteThreshold] = useState(0);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDMA, setShowDMA] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState("zips");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const districtType = DISTRICT_TYPES.find((d) => d.id === districtTypeId);
  const { data, loading: dataLoading, error: dataError } = useDistrictData(districtType.dataFile);
  const { data: dmaData } = useDistrictData(districtType.dmaFile || null);

  const allDistricts = useMemo(() => {
    if (!data) return [];
    return Object.keys(data).sort();
  }, [data]);

  const filteredDistricts = useMemo(() => {
    if (!search.trim()) return allDistricts;
    const q = search.toLowerCase();
    return allDistricts.filter((d) => d.toLowerCase().includes(q));
  }, [allDistricts, search]);

  const allDistrictZips = useMemo(() => {
    if (!data || !selectedDistrict || !data[selectedDistrict]) return [];
    return data[selectedDistrict];
  }, [data, selectedDistrict]);

  const qualifyingZips = useMemo(() => {
    if (!allDistrictZips.length) return [];
    const minOverlap = (100 - wasteThreshold) / 100;
    return allDistrictZips
      .filter((z) => z.overlap >= minOverlap)
      .sort((a, b) => b.overlap - a.overlap);
  }, [allDistrictZips, wasteThreshold]);

  const stats = useMemo(() => {
    if (!allDistrictZips.length) return null;
    const totalDistrictPop = allDistrictZips.reduce((s, z) => s + (z.district_pop || 0), 0);
    const reachedPop = qualifyingZips.reduce((s, z) => s + (z.district_pop || 0), 0);
    const totalSpend = qualifyingZips.reduce((s, z) => s + (z.zip_pop || 0), 0);
    const outsidePop = qualifyingZips.reduce((s, z) => {
      const outside = (z.zip_pop || 0) - (z.district_pop || 0);
      return s + Math.max(0, outside);
    }, 0);
    const coveragePct = totalDistrictPop > 0 ? (reachedPop / totalDistrictPop) * 100 : 0;
    const wastePct = totalSpend > 0 ? (outsidePop / totalSpend) * 100 : 0;
    return { totalDistrictPop, reachedPop, totalSpend, outsidePop, coveragePct, wastePct };
  }, [allDistrictZips, qualifyingZips]);

  const recommendedThreshold = useMemo(() => {
    return computeRecommendedThreshold(allDistrictZips, districtType);
  }, [allDistrictZips, districtType]);

  const dmaStats = useMemo(() => {
    if (!dmaData || !selectedDistrict || !dmaData[selectedDistrict]) return null;
    if (!stats) return null;
    const totalDistrictPop = stats.totalDistrictPop;
    if (totalDistrictPop === 0) return null;
    const relevantDMAs = dmaData[selectedDistrict].filter(
      (d) => d.pop_in_cd / totalDistrictPop >= 0.10
    );
    if (relevantDMAs.length === 0) return null;
    const totalDMAPop = relevantDMAs.reduce((s, d) => s + d.total_dma_pop, 0);
    const reachedInDistrict = relevantDMAs.reduce((s, d) => s + d.pop_in_cd, 0);
    const wastePct = totalDMAPop > 0 ? ((totalDMAPop - reachedInDistrict) / totalDMAPop) * 100 : 0;
    const extraWaste = wastePct - stats.wastePct;
    return { relevantDMAs, totalDMAPop, reachedInDistrict, wastePct, extraWaste, dmaCount: relevantDMAs.length };
  }, [dmaData, selectedDistrict, stats]);

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

  const renderDMAComparison = () => {
    const state = selectedDistrict ? selectedDistrict.split("/")[0] : null;
    if (!dmaStats) return null;
    const dmaWaste = dmaStats.wastePct;
    const zipWaste = stats.wastePct;
    const diffPts = dmaWaste - zipWaste;
    const dollarDiff = Math.round(Math.abs(diffPts) * 10);
    const dmaNames = dmaStats.relevantDMAs.length === 1
      ? dmaStats.relevantDMAs[0].dma_name + " DMA"
      : dmaStats.relevantDMAs.slice(0, -1).map((d) => d.dma_name).join(", ") + " and " + dmaStats.relevantDMAs[dmaStats.relevantDMAs.length - 1].dma_name + " DMAs";
const noMapNote = (state === "AK" || state === "HI") && !isMobile
  ? <div className="dma-methodology">DMA boundary map not available for Alaska or Hawaii.</div>
  : null;
    if (dollarDiff < 50) {
      return (
        <div className="dma-comparison">
          Targeting the <span className="dma-names">{dmaNames}</span> and ZIP targeting are roughly equivalent in efficiency —{" "}
          DMA waste would be <strong className="pct-waste">{dmaWaste.toFixed(1)}%</strong> vs{" "}
          <strong className="pct-waste">{zipWaste.toFixed(1)}%</strong> with ZIP targeting.
          <div className="dma-methodology">DMAs included if they reach &ge;10% of the district population. DMA boundaries are approximate and for illustrative purposes only.</div>
          {noMapNote}
        </div>
      );
    }
    if (diffPts < 0) {
      return (
        <div className="dma-comparison">
          In this district, targeting the <span className="dma-names">{dmaNames}</span> is actually more efficient than ZIP targeting —{" "}
          DMA waste would be <strong className="pct-reach">{dmaWaste.toFixed(1)}%</strong> vs{" "}
          <strong className="pct-waste-high">{zipWaste.toFixed(1)}%</strong> with ZIP targeting.
          <div className="dma-methodology">DMAs included if they reach &ge;10% of the district population. DMA boundaries are approximate and for illustrative purposes only.</div>
          {noMapNote}
        </div>
      );
    }
    return (
      <div className="dma-comparison">
        Targeting the <span className="dma-names">{dmaNames}</span> would waste{" "}
        <strong className="pct-waste-high">{dmaWaste.toFixed(1)}%</strong>{" "}
        of your spend on voters outside the district, compared to{" "}
        <strong className={zipWaste < 30 ? "pct-reach" : zipWaste <= 50 ? "pct-waste" : "pct-waste-high"}>
          {zipWaste.toFixed(1)}%
        </strong>{" "}
        with ZIP targeting. For every $1,000 spent, that is{" "}
        <strong className="pct-reach dollar-highlight">${dollarDiff}</strong>{" "}
        more reaching the right voters with ZIP targeting.
        <div className="dma-methodology">DMAs included if they reach &ge;10% of the district population. DMA boundaries are approximate and for illustrative purposes only.</div>
        {noMapNote}
      </div>
    );
  };

  const renderMobile = () => (
    <div className="mobile-layout">
      {DISTRICT_TYPES.length > 1 && (
        <div className="mobile-type-select-row">
          <select
            className="mobile-type-select"
            value={districtTypeId}
            onChange={(e) => {
              setDistrictTypeId(e.target.value);
              setSelectedDistrict("");
              setSearch("");
            }}
          >
            {DISTRICT_TYPES.map((dt) => (
              <option key={dt.id} value={dt.id}>{dt.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mobile-district-section">
        <div className="mobile-search-row">
          <input
            className="mobile-search-input"
            type="text"
            placeholder={"Search " + districtType.label + "..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mobile-district-scroll">
          {filteredDistricts.map((d) => (
            <button
              key={d}
              className={"mobile-district-chip" + (selectedDistrict === d ? " active" : "")}
              onClick={() => setSelectedDistrict(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {!selectedDistrict ? (
        <div className="mobile-no-selection">
          Select a district above to get started
        </div>
      ) : (
        <>
          <div className="mobile-selected-header">
            <span>{selectedDistrict}</span>
            {ballotpediaUrl && (
              <a href={ballotpediaUrl} target="_blank" rel="noopener noreferrer">
                Ballotpedia ↗
              </a>
            )}
          </div>

          <div className="mobile-tab-toggle">
            <button
              className={"mobile-tab-btn" + (mobileTab === "zips" ? " active" : "")}
              onClick={() => setMobileTab("zips")}
            >
              ZIP Targets
            </button>
            <button
              className={"mobile-tab-btn" + (mobileTab === "dma" ? " active" : "")}
              onClick={() => setMobileTab("dma")}
            >
              DMA Analysis
            </button>
          </div>

          <div className="mobile-tab-content">
            {mobileTab === "zips" && (
              <>
                {stats && (
                  <div className="mobile-stats-grid">
                    <div className="mobile-stat-card">
                      <span className={"mobile-stat-value " + (stats.coveragePct >= 90 ? "value-good" : "value-warn")}>
                        {stats.coveragePct.toFixed(1)}%
                      </span>
                      <span className="mobile-stat-label">District Coverage</span>
                    </div>
                    <div className="mobile-stat-card">
                      <span className={"mobile-stat-value " + (stats.wastePct < 30 ? "value-good" : stats.wastePct <= 50 ? "value-amber" : "value-warn")}>
                        {stats.wastePct.toFixed(1)}%
                      </span>
                      <span className="mobile-stat-label">Spend Waste</span>
                    </div>
                    <div className="mobile-stat-card">
                      <span className="mobile-stat-value">{stats.reachedPop.toLocaleString()}</span>
                      <span className="mobile-stat-label">People Reached</span>
                    </div>
                    <div className="mobile-stat-card">
                      <span className="mobile-stat-value">{qualifyingZips.length}</span>
                      <span className="mobile-stat-label">ZIP Codes</span>
                    </div>
                  </div>
                )}

                <div className="mobile-zip-controls">
                  <div className="mobile-threshold-row">
                    Threshold: <strong>{wasteThreshold}%</strong>
                    <input
                      type="range" min={0} max={99} step={1}
                      value={wasteThreshold}
                      onChange={(e) => setWasteThreshold(Number(e.target.value))}
                      style={{width: 100, accentColor: "var(--primary)"}}
                    />
                  </div>
                  {recommendedThreshold !== null && (
                    <button
                      className="mobile-recommended-btn"
                      onClick={() => setWasteThreshold(recommendedThreshold)}
                    >
                      Recommended: {recommendedThreshold}%
                    </button>
                  )}
                  <div className="mobile-map-hint">
                    Rotate to landscape to view the map
                  </div>
                </div>

                <div className="mobile-copy-row">
                  <button className="mobile-copy-btn" onClick={handleCopySpreadsheet}>
                    {copied === "sheet" ? "Copied!" : "Copy ZIP List"}
                  </button>
                </div>

                <table className="mobile-zip-table">
                  <thead>
                    <tr>
                      <th>ZIP</th>
                      <th>Overlap</th>
                      <th>In District</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualifyingZips.map((z) => (
                      <tr key={z.zip}>
                        <td><strong>{z.zip}</strong></td>
                        <td>{(z.overlap * 100).toFixed(1)}%</td>
                        <td>{z.district_pop != null ? z.district_pop.toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                    {(() => {
                      const excluded = allDistrictZips
                        .filter((z) => z.overlap < (100 - wasteThreshold) / 100)
                        .sort((a, b) => b.overlap - a.overlap);
                      if (!excluded.length) return null;
                      return (
                        <>
                          <tr className="mobile-excluded-divider">
                            <td colSpan={3}>Not exported at current threshold</td>
                          </tr>
                          {excluded.map((z) => (
                            <tr key={z.zip} className="excluded">
                              <td><s>{z.zip}</s></td>
                              <td>{(z.overlap * 100).toFixed(1)}%</td>
                              <td>{z.district_pop != null ? z.district_pop.toLocaleString() : "-"}</td>
                            </tr>
                          ))}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </>
            )}

{mobileTab === "dma" && (
  <div className="mobile-dma-content">
    {dmaStats ? (
      <>
        <div className="mobile-stats-grid" style={{marginBottom: 12}}>
          <div className="mobile-stat-card">
            <span className={"mobile-stat-value " + (dmaStats.wastePct < 30 ? "value-good" : dmaStats.wastePct <= 50 ? "value-amber" : "value-warn")}>
              {dmaStats.wastePct.toFixed(1)}%
            </span>
            <span className="mobile-stat-label">DMA Spend Waste</span>
          </div>
          <div className="mobile-stat-card">
            <span className="mobile-stat-value">{dmaStats.dmaCount}</span>
            <span className="mobile-stat-label">DMAs Required</span>
          </div>
        </div>

          {renderDMAComparison()}

<div className="mobile-dma-map">
<ZipMap
  key={"mobile-dma-" + selectedDistrict + "-" + (geoJSON ? geoJSON.features.length : 0)}
  geoJSON={geoJSON}
  zipData={zipDataMap}
  loading={geoLoading}
  error={geoError}
  showDMA={true}
  setShowDMA={() => {}}
  dmaStats={dmaStats}
/>
</div>
<div className="mobile-dma-note" style={{padding: "8px 12px", fontSize: "0.7rem", fontStyle: "italic", color: "var(--text-muted)"}}>
  DMAs included if they reach &ge;10% of the district population. DMA boundaries are approximate and for illustrative purposes only.
  {(selectedDistrict && (selectedDistrict.split("/")[0] === "AK" || selectedDistrict.split("/")[0] === "HI")) && (
    <> DMA boundary map not available for Alaska or Hawaii.</>
  )}
</div>
      </>
    ) : (
      <div className="mobile-no-selection">
        No DMA data available for this district.
      </div>
    )}
  </div>
)}
          </div>
        </>
      )}

      <div className="mobile-desktop-link">
        <button onClick={() => setIsMobile(false)} className="mobile-desktop-btn">
          Switch to desktop view
        </button>
      </div>
    </div>
  );

  const renderDesktop = () => (
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
            placeholder="Search districts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {dataLoading && <div className="loading-msg">Loading district data...</div>}
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
            {recommendedThreshold !== null && selectedDistrict && (
              <button
                className="recommended-btn"
                onClick={() => setWasteThreshold(recommendedThreshold)}
                title={"Set waste threshold to " + recommendedThreshold + "%"}
              >
                Set to recommended: {recommendedThreshold}% &rarr;
              </button>
            )}
          </div>
          <div className="threshold-stepper">
            <button className="stepper-btn" onClick={() => setWasteThreshold(Math.max(0, wasteThreshold - 1))}>-</button>
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
              View {selectedDistrict} on Ballotpedia
            </a>
          </section>
        )}

        {selectedDistrict && qualifyingZips.length > 0 && (
          <section className="panel">
            <label className="panel-label">Export ZIPs</label>
            <div className="copy-buttons">
              <button className="copy-btn-large" onClick={handleCopySpreadsheet}>
                {copied === "sheet" ? "Copied!" : "Copy for Spreadsheet"}
                <span className="copy-btn-sub">One ZIP per line</span>
              </button>
              <button className="copy-btn-large" onClick={handleCopyComma}>
                {copied === "comma" ? "Copied!" : "Copy with commas separating ZIPs"}
                <span className="copy-btn-sub">Comma-separated</span>
              </button>
            </div>
          </section>
        )}
      </aside>

      <div className="content">
        {selectedDistrict && stats && (
          <section className="stats-bar">
            <div className="stats-insights-row">
              <div className="stats-insight">
                Targeting <strong>{qualifyingZips.length} ZIP{qualifyingZips.length !== 1 ? "s" : ""}</strong> reaches{" "}
                <strong className={stats.coveragePct >= 90 ? "pct-reach" : "pct-waste-high"}>{stats.coveragePct.toFixed(1)}%</strong> of voters in{" "}
                <strong>{selectedDistrict}</strong> ({stats.reachedPop.toLocaleString()} of {stats.totalDistrictPop.toLocaleString()} people).{" "}
                You would waste <strong className={stats.wastePct < 30 ? "pct-reach" : stats.wastePct <= 50 ? "pct-waste" : "pct-waste-high"}>{stats.wastePct.toFixed(1)}%</strong> of your spend on people outside the district.
              </div>
              {renderDMAComparison()}
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
              <div className="stats-pills-spacer" />
              {dmaStats && (
                <>
                  <div className="stat-pill stat-pill-dma">
                    <span className={"stat-pill-value " + (dmaStats.wastePct < 30 ? "value-good" : dmaStats.wastePct <= 50 ? "value-amber" : "value-warn")}>
                      {dmaStats.wastePct.toFixed(1)}%
                    </span>
                    <span className="stat-pill-label">DMA spend waste</span>
                  </div>
                  <div className="stat-pill stat-pill-dma">
                    <span className="stat-pill-value">{dmaStats.dmaCount}</span>
                    <span className="stat-pill-label">DMAs required</span>
                  </div>
                </>
              )}
            </div>

            <div className="dma-toggle-row">
              <div style={{flex: 1}} />
              <button
                className={"dma-toggle-btn" + (showDMA ? " active" : "")}
                onClick={() => setShowDMA(!showDMA)}
              >
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                {showDMA ? "Hide DMA Boundaries on Map" : "Show DMA Boundaries on Map"}
              </button>
            </div>
          </section>
        )}

        <section className="map-section">
          {!selectedDistrict ? (
            <div className="map-placeholder">
              <span>Select a district to see its ZIP codes on the map</span>
            </div>
          ) : (
            <ZipMap
              geoJSON={geoJSON}
              zipData={zipDataMap}
              loading={geoLoading}
              error={geoError}
              showDMA={showDMA}
              setShowDMA={setShowDMA}
              dmaStats={dmaStats}
            />
          )}
        </section>

        {selectedDistrict && stats && (
          <section className="results-section">
            <div className="results-header">
              <h2>
                {qualifyingZips.length} ZIP{qualifyingZips.length !== 1 ? "s" : ""} in{" "}
                <strong>{selectedDistrict}</strong>
                {wasteThreshold > 0 && (
                  <span className="threshold-badge">&ge;{100 - wasteThreshold}% overlap</span>
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
                              <div className="overlap-bar" style={{ width: (z.overlap * 100).toFixed(1) + "%" }} />
                            </div>
                            <span className="overlap-pct">{(z.overlap * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>{z.district_pop != null ? z.district_pop.toLocaleString() : "-"}</td>
                        <td>{z.zip_pop != null ? z.zip_pop.toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                    {(() => {
                      const excludedZips = allDistrictZips
                        .filter((z) => z.overlap < (100 - wasteThreshold) / 100)
                        .sort((a, b) => b.overlap - a.overlap);
                      if (excludedZips.length === 0) return null;
                      return (
                        <>
                          <tr className="excluded-divider-row">
                            <td colSpan={4}>
                              <div className="excluded-divider">
                                Not included at current threshold — these ZIPs will not be exported
                              </div>
                            </td>
                          </tr>
                          {excludedZips.map((z) => (
                            <tr key={z.zip} className="zip-row-excluded">
                              <td className="zip-cell zip-cell-excluded"><s>{z.zip}</s></td>
                              <td>
                                <div className="overlap-bar-wrap">
                                  <div className="overlap-bar-track">
                                    <div className="overlap-bar overlap-bar-excluded" style={{ width: (z.overlap * 100).toFixed(1) + "%" }} />
                                  </div>
                                  <span className="overlap-pct">{(z.overlap * 100).toFixed(1)}%</span>
                                </div>
                              </td>
                              <td>{z.district_pop != null ? z.district_pop.toLocaleString() : "-"}</td>
                              <td>{z.zip_pop != null ? z.zip_pop.toLocaleString() : "-"}</td>
                            </tr>
                          ))}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1>District ZIP Finder <span className="header-subtitle">&amp; DMA Waste Calculator</span></h1>
          <p className="subtitle">Find ZIP codes by legislative district, filtered by overlap percentage</p>
        </div>
      </header>
{isMobile ? renderMobile() : renderDesktop()}
    </div>
  );
}