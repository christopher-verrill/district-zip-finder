// Helper to bump a threshold up to the highest value that produces the same ZIP set
function bumpToHighest(t, allDistrictZips) {
  if (t === null) return null;
  const recommendedZips = new Set(
    allDistrictZips
      .filter((z) => z.overlap >= (100 - t) / 100)
      .map((z) => z.zip)
  );
  for (let candidate = 99; candidate > t; candidate--) {
    const minOverlap = (100 - candidate) / 100;
    const zips = allDistrictZips.filter((z) => z.overlap >= minOverlap);
    if (zips.length === recommendedZips.size && zips.every((z) => recommendedZips.has(z.zip))) {
      return candidate;
    }
  }
  return t;
}

export function computeRecommendedThreshold(allDistrictZips, districtType) {
  if (!allDistrictZips.length) return null;
  const totalDistrictPop = allDistrictZips.reduce((s, z) => s + (z.district_pop || 0), 0);
  if (totalDistrictPop === 0) return null;

  const floor = districtType.recommendedCoverageFloor || 99;
  const wasteCeiling = districtType.recommendedWasteCeiling ?? null;

  // Pre-compute stats for all thresholds
  const stats = [];
  for (let t = 0; t <= 99; t++) {
    const minOverlap = (100 - t) / 100;
    const zips = allDistrictZips.filter((z) => z.overlap >= minOverlap);
    const reached = zips.reduce((s, z) => s + (z.district_pop || 0), 0);
    const totalSpend = zips.reduce((s, z) => s + (z.zip_pop || 0), 0);
    const outsidePop = zips.reduce((s, z) => s + Math.max(0, (z.zip_pop || 0) - (z.district_pop || 0)), 0);
    const coverage = totalDistrictPop > 0 ? (reached / totalDistrictPop) * 100 : 0;
    const waste = totalSpend > 0 ? (outsidePop / totalSpend) * 100 : 0;
    const efficiency = totalSpend > 0 ? reached / totalSpend : 0;
    stats.push({ t, coverage, waste, efficiency });
  }

  let bestT = null;

  if (wasteCeiling !== null) {
    // State house/senate logic: marginal ZIP analysis
    const sorted = [...allDistrictZips].sort((a, b) => b.overlap - a.overlap);

    let cumulativeReached = 0;
    let cumulativeSpend = 0;
    let lastGoodT = 0;

    for (let i = 0; i < sorted.length; i++) {
      const z = sorted[i];

      // Hard cutoff — never include ZIPs below 1% overlap
      if (z.overlap < 0.01) break;

      const wasteBefore = cumulativeSpend > 0
        ? ((cumulativeSpend - cumulativeReached) / cumulativeSpend) * 100
        : 0;

      const newSpend = cumulativeSpend + (z.zip_pop || 0);
      const newReached = cumulativeReached + (z.district_pop || 0);
      const wasteAfter = newSpend > 0
        ? ((newSpend - newReached) / newSpend) * 100
        : 0;

      const wasteIncrease = wasteAfter - wasteBefore;
      const marginalCoverage = totalDistrictPop > 0
        ? (z.district_pop || 0) / totalDistrictPop * 100
        : 0;

      if (wasteIncrease > 5 && marginalCoverage < 1) break;

      cumulativeReached = newReached;
      cumulativeSpend = newSpend;
      lastGoodT = Math.round((1 - z.overlap) * 100);
    }

    // Check if we met the coverage floor
    const minOverlap = (100 - lastGoodT) / 100;
    const zips = allDistrictZips.filter((z) => z.overlap >= minOverlap);
    const reached = zips.reduce((s, z) => s + (z.district_pop || 0), 0);
    const coverage = totalDistrictPop > 0 ? (reached / totalDistrictPop) * 100 : 0;

    if (coverage >= floor) {
      bestT = lastGoodT;
    } else {
      // Hard floor — find most efficient threshold that hits floor
      let bestEfficiency = -1;
      for (const s of stats) {
        if (s.coverage >= floor && s.efficiency > bestEfficiency) {
          bestEfficiency = s.efficiency;
          bestT = s.t;
        }
      }
      if (bestT === null) {
        // Floor unreachable — best coverage available
        let bestCoverage = 0;
        for (const s of stats) {
          if (s.coverage > bestCoverage) { bestCoverage = s.coverage; bestT = s.t; }
        }
      }
    }
  } else {
    // Federal logic: maximize efficiency above coverage floor
    let bestEfficiency = -1;
    for (const s of stats) {
      if (s.coverage >= floor && s.efficiency > bestEfficiency) {
        bestEfficiency = s.efficiency;
        bestT = s.t;
      }
    }
    if (bestT === null) {
      let bestCoverage = 0;
      for (const s of stats) {
        if (s.coverage > bestCoverage) { bestCoverage = s.coverage; bestT = s.t; }
      }
    }
  }

  return bumpToHighest(bestT, allDistrictZips);
}
