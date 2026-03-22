# Earth Digital Twin (Web)

A lightweight Cesium-based digital twin of Earth that lets you zoom from orbital view down to city-scale imagery in a normal browser.

## Features

- Photorealistic global base map (Esri World Imagery).
- Address search (OpenStreetMap Nominatim) to fly directly to streets/places/buildings in cities like Miami.
- One-click city shortcuts for Miami, New York, and Los Angeles.
- Inspect mode with optional 3D OSM buildings when available.
- Layer toggles for night lights, road labels, cloud layer, and 3D buildings.
- Measure tool (click two points to get distance in km).
- Annotation tool (drop labeled notes on map clicks).
- Save/load/delete camera viewpoints in local storage.
- Orbital date/time picker (local timezone) with live Eastern time readout.

## How to view the app

### Option A (recommended): one command script

```bash
./run-local.sh
```

Then open:

- <http://localhost:8080>

### Option B: custom port

```bash
./run-local.sh 3000
```

Then open:

- <http://localhost:3000>

### Option C: direct Python command

```bash
python3 -m http.server 8080
```

Then open:

- <http://localhost:8080>

`earth-digital-twin.html` currently redirects to `index.html` so both entrypoints run the same latest feature set.

## Public data layers used

- Esri World Imagery:
  - https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer
- OpenStreetMap tiles + geocoder:
  - https://tile.openstreetmap.org/
  - https://nominatim.openstreetmap.org/
- NASA GIBS VIIRS Cloud Mask:
  - https://gibs.earthdata.nasa.gov/
- NASA GIBS VIIRS Black Marble:
  - https://gibs.earthdata.nasa.gov/

## Notes

- This implementation avoids paid APIs and private keys.
- OSM 3D buildings may depend on provider availability; the toggle auto-disables if unavailable.
