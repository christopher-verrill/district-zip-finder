// districtConfig.js
export const DISTRICT_TYPES = [
  {
    id: "federal",
    recommendedCoverageFloor: 99,
    label: "U.S. Congressional District",
    dataFile: "./data/congressional.json",
    dmaFile: "./data/congressional_dma_crosswalk.json",
    ballotpedia: (cdPath) => {
      const [state, num] = cdPath.split("/");
      const district = parseInt(num, 10);
      const stateNames = {
        AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
        CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
        FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
        IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
        KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
        MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
        MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
        NH: "New_Hampshire", NJ: "New_Jersey", NM: "New_Mexico", NY: "New_York",
        NC: "North_Carolina", ND: "North_Dakota", OH: "Ohio", OK: "Oklahoma",
        OR: "Oregon", PA: "Pennsylvania", RI: "Rhode_Island", SC: "South_Carolina",
        SD: "South_Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
        VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West_Virginia",
        WI: "Wisconsin", WY: "Wyoming", DC: "District_of_Columbia",
        PR: "Puerto_Rico",
      };
      const stateName = stateNames[state] || state;
      return `https://ballotpedia.org/${stateName}%27s_${district}${ordinal(district)}_Congressional_District`;
    },
    parseId: (cdPath) => {
      const [state, num] = cdPath.split("/");
      return { state, district: parseInt(num, 10) };
    },
    formatLabel: (cdPath) => {
      const [state, num] = cdPath.split("/");
      return `${state}-${parseInt(num, 10)} (Federal)`;
    },
  },

{
  id: "state_senate",
  recommendedCoverageFloor: 95,
  recommendedWasteCeiling: 30,
  label: "State Senate District",
  dataFile: "./data/state_senate.json",
  dmaFile: "./data/state_senate_dma_crosswalk.json",
  ballotpedia: (cdPath) => {
    const [state, districtRaw] = cdPath.split("/");
    const suffix = districtRaw.trim();
    const base = "https://ballotpedia.org";
if (state === "MA") {
  // Strip the number prefix, title case the county names, keep "and" lowercase
  const namePart = suffix.replace(/^\d+\s*/, "").trim();
  const words = namePart.split(/\s+/);
  const converted = words.map((w) => {
    if (w.toLowerCase() === "and") return "and";
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
  const districtName = converted.join("_");
  return `${base}/Massachusetts_State_Senate_${districtName}_District`;
}
if (state === "VT") {
  // Join all words together as one title-cased string (no hyphens)
  // "CHITTENDEN SOUTH EAST" -> "ChittendenSoutheast" -- but Ballotpedia uses "ChittendenSoutheast"
  // Actually each word is individually title-cased and joined with underscores
  // "ADDISON" -> "Addison"
  // "CHITTENDEN CENTRAL" -> "Chittenden_Central"  
  // "CHITTENDEN SOUTH EAST" -> "Chittenden_Southeast"
  const words = suffix.split(/\s+/);
  // Combine "SOUTH" + "EAST" into "Southeast", "NORTH" + "EAST" into "Northeast" etc.
  const combined = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === "SOUTH" && words[i+1] === "EAST") {
      combined.push("Southeast"); i++;
    } else if (words[i] === "NORTH" && words[i+1] === "EAST") {
      combined.push("Northeast"); i++;
    } else if (words[i] === "NORTH" && words[i+1] === "WEST") {
      combined.push("Northwest"); i++;
    } else if (words[i] === "SOUTH" && words[i+1] === "WEST") {
      combined.push("Southwest"); i++;
    } else {
      combined.push(words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase());
    }
  }
  const districtName = combined.join("_");
  return `${base}/Vermont_State_Senate_${districtName}_District`;
}

    const stateNames = {
      AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
      CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
      FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
      IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
      KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
      MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
      MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
      NH: "New_Hampshire", NJ: "New_Jersey", NM: "New_Mexico", NY: "New_York",
      NC: "North_Carolina", ND: "North_Dakota", OH: "Ohio", OK: "Oklahoma",
      OR: "Oregon", PA: "Pennsylvania", RI: "Rhode_Island", SC: "South_Carolina",
      SD: "South_Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
      VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West_Virginia",
      WI: "Wisconsin", WY: "Wyoming",
    };

    const writtenOrdinals = {
      FIRST: "1st", SECOND: "2nd", THIRD: "3rd", FOURTH: "4th",
      FIFTH: "5th", SIXTH: "6th", SEVENTH: "7th", EIGHTH: "8th",
      NINTH: "9th", TENTH: "10th", ELEVENTH: "11th", TWELFTH: "12th",
      THIRTEENTH: "13th", FOURTEENTH: "14th", FIFTEENTH: "15th",
      SIXTEENTH: "16th", SEVENTEENTH: "17th", EIGHTEENTH: "18th",
      NINETEENTH: "19th", TWENTIETH: "20th",
    };

    const stateName = stateNames[state] || state;
    const searchFallback = (q) =>
      `${base}/wiki/index.php?search=${encodeURIComponent(q)}`;

    // AK: single letter districts "A" through "T"
    if (state === "AK") {
      return `${base}/Alaska_State_Senate_District_${suffix}`;
    }

    // MA: "001 BERKSHIRE HAMPDEN FRANKLIN AND HAMPSHIRE"
    if (state === "MA") {
      const namePart = suffix.replace(/^\d+\s*/, "").trim();
      const words = namePart.split(/\s+/);
      const converted = words.map((w, i) => {
        if (i === 0 && writtenOrdinals[w]) return writtenOrdinals[w];
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      });
      const districtName = converted.join("_").replace(/,/g, "");
      return `${base}/Massachusetts_State_Senate_${districtName}_District`;
    }

    // VT: full county name "ADDISON", "CHITTENDEN CENTRAL"
    if (state === "VT") {
      const name = suffix.split(/\s+/).map((w) =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join("_");
      return `${base}/Vermont_State_Senate_${name}_District`;
    }

    // Standard numeric
    if (/^\d+$/.test(suffix)) {
      const district = parseInt(suffix, 10);
      return `${base}/${stateName}_State_Senate_District_${district}`;
    }

    // Fallback
    return searchFallback(`${stateName} State Senate District ${suffix}`);
  },
  parseId: (cdPath) => {
    const [state, num] = cdPath.split("/");
    return { state, district: num };
  },
  formatLabel: (cdPath) => `${cdPath} (State Senate)`,
},

  {
    id: "state_house",
    recommendedCoverageFloor: 95,
    recommendedWasteCeiling: 30,
    label: "State House District",
    dataFile: "./data/state_house.json",
    dmaFile: "./data/state_house_dma_crosswalk.json",
    ballotpedia: (cdPath) => {
  const [state, districtRaw] = cdPath.split("/");
  const suffix = districtRaw.trim();

  const stateNames = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
    CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
    FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
    IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
    KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
    MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
    NH: "New_Hampshire", NJ: "New_Jersey", NM: "New_Mexico", NY: "New_York",
    NC: "North_Carolina", ND: "North_Dakota", OH: "Ohio", OK: "Oklahoma",
    OR: "Oregon", PA: "Pennsylvania", RI: "Rhode_Island", SC: "South_Carolina",
    SD: "South_Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
    VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West_Virginia",
    WI: "Wisconsin", WY: "Wyoming",
  };

  const writtenOrdinals = {
    FIRST: "1st", SECOND: "2nd", THIRD: "3rd", FOURTH: "4th",
    FIFTH: "5th", SIXTH: "6th", SEVENTH: "7th", EIGHTH: "8th",
    NINTH: "9th", TENTH: "10th", ELEVENTH: "11th", TWELFTH: "12th",
    THIRTEENTH: "13th", FOURTEENTH: "14th", FIFTEENTH: "15th",
    SIXTEENTH: "16th", SEVENTEENTH: "17th", EIGHTEENTH: "18th",
    NINETEENTH: "19th", TWENTIETH: "20th",
  };

  const vtCounties = {
    ADD: "Addison", BEN: "Bennington", CAL: "Caledonia",
    CHI: "Chittenden", ESX: "Essex", FRA: "Franklin",
    GI: "Grand_Isle", LAM: "Lamoille", ORA: "Orange",
    ORL: "Orleans", RUT: "Rutland", WAS: "Washington",
    WDH: "Windham", WDR: "Windsor",
  };

  const stateName = stateNames[state] || state;
  const base = `https://ballotpedia.org`;
  const searchFallback = (q) =>
    `${base}/wiki/index.php?search=${encodeURIComponent(q)}`;

  // MA: "001 FIRST BARNSTABLE DISTRICT" -> Massachusetts_House_of_Representatives_1st_Barnstable_District
  if (state === "MA") {
    const namePart = suffix.replace(/^\d+\s*/, "").replace(/\s*DISTRICT$/, "").trim();
    const words = namePart.split(/\s+/);
    const converted = words.map((w, i) => {
      if (i === 0 && writtenOrdinals[w]) return writtenOrdinals[w];
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
    const districtName = converted.join("_").replace(/,/g, "");
    return `${base}/Massachusetts_House_of_Representatives_${districtName}_District`;
  }

  // NH: "BELKNAP1" -> New_Hampshire_House_of_Representatives_Belknap_1
  if (state === "NH") {
    const m = suffix.match(/^([A-Z]+)(\d+)$/);
    if (m) {
      const county = m[1].charAt(0) + m[1].slice(1).toLowerCase();
      return `${base}/New_Hampshire_House_of_Representatives_${county}_${m[2]}`;
    }
    return searchFallback(`New Hampshire House ${suffix}`);
  }

  // MD: "01A" -> Maryland_House_of_Delegates_District_1A
  if (state === "MD") {
    const district = suffix.replace(/^0+/, "") || suffix;
    return `${base}/Maryland_House_of_Delegates_District_${district}`;
  }

  // MN: "01A" -> Minnesota_House_of_Representatives_District_1A
  if (state === "MN") {
    const district = suffix.replace(/^0+/, "") || suffix;
    return `${base}/Minnesota_House_of_Representatives_District_${district}`;
  }

  // ND, SD: "04A" -> North_Dakota_House_of_Representatives_District_4A
  if (state === "ND" || state === "SD") {
    const district = suffix.replace(/^0+/, "") || suffix;
    return `${base}/${stateName}_House_of_Representatives_District_${district}`;
  }

  // VT: expand abbreviations and fall back to search
  if (state === "VT") {
    const tokens = suffix.split(/\s+/);
    const expanded = tokens.map((t) => vtCounties[t] || t).join(" ");
    return searchFallback(`Vermont House of Representatives ${expanded}`);
  }

  // CA oddity and anything else unrecognized — search fallback
  if (!/^\d+$/.test(suffix)) {
    return searchFallback(`${stateName} House of Representatives ${suffix}`);
  }

  // Standard numeric: "118" -> South_Carolina_House_of_Representatives_District_118
  const district = parseInt(suffix, 10);
  return `${base}/${stateName}_House_of_Representatives_District_${district}`;
},
    parseId: (cdPath) => {
      const [state, num] = cdPath.split("/");
      return { state, district: parseInt(num, 10) };
    },
    formatLabel: (cdPath) => `${cdPath} (State House)`,
  },

  {
    id: "county",
    recommendedCoverageFloor: 95,
    recommendedWasteCeiling: 30,
    label: "County",
    dataFile: "./data/county.json",
    dmaFile: "./data/county_dma_crosswalk.json",
    ballotpedia: (cdPath) => {
      // Despite the field name, this builds a Wikipedia URL for counties since
      // Ballotpedia doesn't have consistent per-county pages.
      // Source format: "STATE/COUNTY NAME" all caps, e.g. "NC/FORSYTH",
      // "VA/CHARLES CITY", "AK/MUNICIPALITY OF ANCHORAGE".
      const [state, countyRaw] = cdPath.split("/");
      const rawName = countyRaw.trim();

      const stateNames = {
        AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
        CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
        FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
        IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
        KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
        MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
        MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
        NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
        NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
        OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
        SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
        VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
        WI: "Wisconsin", WY: "Wyoming",
      };
      const stateName = stateNames[state] || state;

      // Title-case helper that handles small words / Mc / hyphens
      const SMALL_WORDS = new Set(["of", "and", "the"]);
      const titleWord = (w) => {
        if (!w) return w;
        const lower = w.toLowerCase();
        // Handle hyphenated words (e.g. "WALES-HYDER" -> "Wales-Hyder")
        if (lower.includes("-")) {
          return lower.split("-").map(titleWord).join("-");
        }
        // Mc-prefix (McDonald, McKinley)
        if (lower.startsWith("mc") && lower.length > 2) {
          return "Mc" + lower.charAt(2).toUpperCase() + lower.slice(3);
        }
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      };
      const titleCase = (s) => {
        const words = s.split(/\s+/);
        return words.map((w, i) => {
          // Lowercase small words except when they're the first word
          if (i > 0 && SMALL_WORDS.has(w.toLowerCase())) return w.toLowerCase();
          return titleWord(w);
        }).join(" ");
      };

      const wikiEncode = (s) =>
        encodeURIComponent(s.replace(/ /g, "_"));

      const wiki = (title) =>
        `https://en.wikipedia.org/wiki/${wikiEncode(title)}`;

      const search = (q) =>
        `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`;

      // Normalize ST -> St. and STE -> Ste. up front so every branch gets it.
      // Also expand & -> and. Keep the result in upper case for now so the
      // title-caser still sees the rest of the word as needing capitalization.
      const normalized = rawName
        .replace(/^ST /, "St. ")
        .replace(/ ST /g, " St. ")
        .replace(/^STE /, "Ste. ")
        .replace(/ STE /g, " Ste. ")
        .replace(/&/g, "and");

      // --- Special cases ---

      // Two AK names are truncated in the source data:
      //   "PRINCE OF WALES HYDER CENSUS" -> "Prince of Wales–Hyder Census Area"
      //   "SOUTHEAST FAIRBANKS CENSUS A" -> "Southeast Fairbanks Census Area"
      // Wikipedia uses en-dash for Prince of Wales–Hyder.
      if (state === "AK") {
        if (rawName === "PRINCE OF WALES HYDER CENSUS") {
          return wiki("Prince of Wales\u2013Hyder Census Area, Alaska");
        }
        if (rawName === "SOUTHEAST FAIRBANKS CENSUS A") {
          return wiki("Southeast Fairbanks Census Area, Alaska");
        }
        // Generic AK: Boroughs / Census Areas / Municipalities — title-case the
        // whole name and append ", Alaska".
        return wiki(`${titleCase(rawName)}, Alaska`);
      }

      // CT: 9 planning regions (not counties). Wikipedia title format:
      //   "Capitol Planning Region" -> Capitol_Planning_Region
      if (state === "CT") {
        // Source has just the name, e.g. "CAPITOL", "GREATER BRIDGEPORT"
        // Wiki articles use "X Planning Region"
        return wiki(`${titleCase(rawName)} Planning Region`);
      }

      // LA: counties are "parishes"
      if (state === "LA") {
        return wiki(`${titleCase(normalized)} Parish, Louisiana`);
      }

      // VA: independent cities end in " CITY". Two false positives:
      //   "CHARLES CITY" and "JAMES CITY" are counties, not independent cities.
      if (state === "VA") {
        if (rawName === "CHARLES CITY") {
          return wiki("Charles City County, Virginia");
        }
        if (rawName === "JAMES CITY") {
          return wiki("James City County, Virginia");
        }
        if (rawName.endsWith(" CITY")) {
          const cityName = rawName.replace(/ CITY$/, "");
          // Wikipedia titles for VA independent cities are usually just
          // "<Name>, Virginia" (e.g. "Alexandria, Virginia"). A handful do
          // need the explicit "(independent city)" disambiguator (Richmond,
          // Roanoke, Franklin, Fairfax — all share names with VA counties).
          const needsDisambig = new Set([
            "RICHMOND", "ROANOKE", "FRANKLIN", "FAIRFAX",
          ]);
          if (needsDisambig.has(cityName)) {
            return wiki(`${titleCase(cityName)}, Virginia`);
          }
          return wiki(`${titleCase(cityName)}, Virginia`);
        }
        // "KING & QUEEN" -> "King and Queen County, Virginia"
        if (rawName === "KING & QUEEN") {
          return wiki("King and Queen County, Virginia");
        }
        return wiki(`${titleCase(rawName)} County, Virginia`);
      }

      // MD: "BALTIMORE CITY" is an independent city; "BALTIMORE COUNTY" is the
      // surrounding county. Both appear in the source.
      if (state === "MD") {
        if (rawName === "BALTIMORE CITY") {
          return wiki("Baltimore");
        }
        if (rawName.endsWith(" COUNTY")) {
          const base = rawName.replace(/ COUNTY$/, "");
          return wiki(`${titleCase(base)} County, Maryland`);
        }
        return wiki(`${titleCase(rawName)} County, Maryland`);
      }

      // MO: "ST LOUIS CITY" is the independent city of St. Louis; "ST LOUIS"
      // is St. Louis County. Need to convert "ST" -> "St." for the title.
      if (state === "MO") {
        if (rawName === "ST LOUIS CITY") {
          return wiki("St. Louis");
        }
      }

      // Generic fallback: title-case the normalized name and append the state.
      // NM has counties like "DONA ANA" (really Doña Ana) and "DE BACA" — the
      // plain ASCII forms redirect correctly on Wikipedia so no special case
      // needed.
      return wiki(`${titleCase(normalized)} County, ${stateName}`);
    },
    parseId: (cdPath) => {
      const [state, county] = cdPath.split("/");
      return { state, district: county };
    },
    formatLabel: (cdPath) => `${cdPath} (County)`,
  },
];

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}