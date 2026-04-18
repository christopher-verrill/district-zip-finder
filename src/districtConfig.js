// districtConfig.js
// Add new district types here as you acquire data.
// Each entry needs:
//   label       - human-readable name shown in the UI
//   dataFile    - path under /public/data/ to the JSON data file
//   ballotpedia - function(cdPath) => Ballotpedia URL for that district
//   parseId     - function(cdPath) => { state, district } for display

export const DISTRICT_TYPES = [
  {
    id: "federal",
    label: "U.S. Congressional District",
    dataFile: "/data/congressional.json",
    ballotpedia: (cdPath) => {
      // cdPath format: "AL/001"
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

  // Uncomment and populate when you have state senate data:
  // {
  //   id: "state_senate",
  //   label: "State Senate District",
  //   dataFile: "/data/state_senate.json",
  //   ballotpedia: (cdPath) => { /* build URL */ },
  //   parseId: (cdPath) => { /* parse */ },
  //   formatLabel: (cdPath) => `${cdPath} (State Senate)`,
  // },


{
  id: "state_house",
  label: "State House District",
  dataFile: "/data/state_house.json",
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
      WI: "Wisconsin", WY: "Wyoming",
    };
    const stateName = stateNames[state] || state;
    return `https://ballotpedia.org/${stateName}_House_of_Representatives_District_${district}`;
  },
  parseId: (cdPath) => {
    const [state, num] = cdPath.split("/");
    return { state, district: parseInt(num, 10) };
  },
  formatLabel: (cdPath) => `${cdPath} (State House)`,
},
];

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
