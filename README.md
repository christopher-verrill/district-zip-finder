# District ZIP Finder

A static React web app that lets you look up ZIP codes by legislative district, filtered by a configurable overlap threshold ("waste slider"). Deployable to GitHub Pages with zero backend.

## Features

- Interactive map — visualizes exactly which ZIPs are targeted, with hover tooltips showing overlap % and population
- Waste threshold slider — set a minimum overlap %; ZIPs below it are excluded
- ZIP table — overlap bars, population in district, and total ZIP population
- Ballotpedia links — one-click link to the Ballotpedia page for any district
- Copy ZIPs — copies the filtered ZIP list to your clipboard
- Scalable — drop in state senate / state house data by adding a JSON file and one config entry

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & run locally

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
cd YOUR_REPO_NAME
npm install
npm run dev
```

Open http://localhost:5173

---

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set Source to **GitHub Actions**.
4. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically.

### Base path

If your site will be at `https://username.github.io/repo-name/` (project page), open `vite.config.js` and change:

```js
base: './',
// to:
base: '/your-repo-name/',
```

If using a custom domain or user/org page (`username.github.io`), leave it as `'./'`.

---

## Data Format

`public/data/congressional.json` is structured as:

```json
{
  "AL/001": [
    { "zip": "35004", "zip_pop": 12345, "district_pop": 10000, "overlap": 0.81 },
    ...
  ]
}
```

### Regenerating from XLSX

If your source data changes:

```bash
python3 scripts/convert_xlsx.py
```

This reads `scripts/source/congressional.xlsx` and writes `public/data/congressional.json`.

---

## Adding State Legislature Districts

### 1. Prepare the data file

Same column format as the federal data. Run the converter and place the output at `public/data/state_senate.json` or `public/data/state_house.json`.

### 2. Enable it in the config

Open `src/districtConfig.js` and uncomment the state senate or state house block. The district type switcher appears in the UI automatically once more than one type is active.

---

## Project Structure

```
district-zip-finder/
├── public/
│   └── data/
│       └── congressional.json     # Federal district -> ZIP data
├── scripts/
│   └── convert_xlsx.py            # Regenerate JSON from source XLSX
├── src/
│   ├── districtConfig.js          # Add/configure district types here
│   ├── useDistrictData.js         # Hook: loads + caches district JSON
│   ├── useZipGeoJSON.js           # Hook: fetches ZIP boundary GeoJSON
│   ├── ZipMap.jsx                 # Leaflet map component
│   ├── App.jsx                    # Main app UI
│   └── App.css                    # Styles
├── .github/
│   └── workflows/
│       └── deploy.yml             # Auto-deploy to GitHub Pages on push
└── vite.config.js
```

---

## ZIP Boundary GeoJSON

ZIP boundaries are fetched at runtime from a public GeoJSON source (no API key required). The full dataset is fetched once and cached in memory for the session, then filtered to only the ZIPs in the selected district.

---

## License

MIT
