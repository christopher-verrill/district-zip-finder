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
    // State house/senate/county logic: hard waste ceiling, prefer it over floor.
    //
    // Walk ZIPs in descending overlap order. Stop (don't skip) when adding the
    // next ZIP would:
    //   1. Push total waste over the ceiling, OR
    //   2. Add a big waste jump (>3 pts) AND deliver tiny marginal coverage (<1%).
    //      Both conditions must be true so we never reject high-overlap ZIPs that
    //      add zero waste just because they're small.
    //   3. Or the ZIP itself is below 1% overlap (sanity floor).
    //
    // Tiebreaker among ZIPs with identical overlap: smaller zip_pop first.
    // Big-population ZIPs are more likely to spike waste; preferring small ones
    // first means a ceiling-stop happens at a sensible boundary.
    const sorted = [...allDistrictZips].sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return (a.zip_pop || 0) - (b.zip_pop || 0);
    });
    let cumulativeReached = 0;
    let cumulativeSpend = 0;
    let lastIncludedOverlap = 1.0;
    let anyIncluded = false;

    for (const z of sorted) {
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
      const marginalCoverage = (z.district_pop || 0) / totalDistrictPop * 100;

      // Hard ceiling on total waste
      if (wasteAfter > wasteCeiling) break;
      // Low-value high-cost ZIP — both conditions must be true. A 100% overlap
      // ZIP adds 0 waste no matter how tiny it is; never reject those.
      if (wasteIncrease > 3 && marginalCoverage < 1) break;

      cumulativeReached = newReached;
      cumulativeSpend = newSpend;
      lastIncludedOverlap = z.overlap;
      anyIncluded = true;
    }

    let loopT = anyIncluded ? Math.round((1 - lastIncludedOverlap) * 100) : 99;

    // The slider can only filter by overlap percentage — it can't split a tie
    // group. If the loop stopped MID-GROUP (e.g. included one ZIP at overlap=0.6
    // and stopped before another at overlap=0.6), the threshold-based filter
    // would still include both, pushing actual waste past the ceiling. Bump
    // loopT down (= stricter threshold) until the filter's actual waste fits.
    while (loopT > 0 && stats[loopT].waste > wasteCeiling) {
      loopT--;
    }

    const loopStat = stats[loopT];

    if (loopStat.coverage >= floor && loopStat.waste <= wasteCeiling) {
      // Loop result hits both targets — use it.
      bestT = loopT;
    } else {
      // Can't hit both. Prefer the ceiling: find threshold under the ceiling
      // with the BEST coverage we can get under that ceiling.
      let bestCoverage = -1;
      for (const s of stats) {
        if (s.waste <= wasteCeiling && s.coverage > bestCoverage) {
          bestCoverage = s.coverage;
          bestT = s.t;
        }
      }
      if (bestT === null) {
        // Even the best ZIP exceeds the ceiling. Fall back to lowest-waste.
        let lowestWaste = Infinity;
        for (const s of stats) {
          if (s.waste < lowestWaste) {
            lowestWaste = s.waste;
            bestT = s.t;
          }
        }
      }
    }
  } else {
    // Federal logic: maximize efficiency above coverage floor (unchanged)
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