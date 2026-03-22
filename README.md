# Earth Digital Twin (Web)

A lightweight Cesium-based digital twin of Earth that lets you zoom from orbital view down to city-scale imagery in a normal browser.

## Features

- Globe-to-street zoom with smooth fly-to transitions and saved city viewpoints (Miami, NYC, Tokyo).
- Search by city/address or raw coordinates (`lat,lon`).
- Navigation tools: orbital reset, compass reset, and auto-rotate.
- Visual realism tools: day/night lighting, sun-hour slider, cloud/fog/atmosphere toggles, optional OSM 3D buildings, terrain exaggeration slider.
- Click any location for an info card with latitude, longitude, and elevation readout.
- Interaction tools: distance measurement, area measurement, pins/annotations.
- Save/load/delete viewpoints and guided tour mode.
- Data/layer tools: earthquake feed toggle (USGS), plus GeoJSON/KML/GPX import.
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
- USGS earthquake feed:
  - https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson

## Notes

- This implementation avoids paid APIs and private keys.
- OSM 3D buildings may depend on provider availability; the toggle auto-disables if unavailable.
