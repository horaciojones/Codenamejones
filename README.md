# Earth Digital Twin (Web)

A lightweight Cesium-based digital twin of Earth that lets you zoom from orbital view down to city-scale imagery in a normal browser.

## Features

- Photorealistic global base map (Esri World Imagery).
- Interactive globe controls with smooth zoom/pan/tilt.
- Address search (OpenStreetMap Nominatim) to fly to streets/places/buildings in cities like Miami.
- One-click city shortcuts for Miami, New York, and Los Angeles.
- Atmospheric scattering and dynamic sun lighting.
- Real-time cloud overlay (NASA GIBS VIIRS cloud mask).
- Night-light toggle using NASA Black Marble.
- Orbital date/time picker (local timezone) and quick **Now** reset.
- Live Eastern Time (America/New_York) clock in the control panel.

## How to view the app

### Option A (recommended): one command script

From this project folder:

```bash
./run-local.sh
```

Then open this URL in your browser:

- <http://localhost:8080>

You can also choose a custom port:

```bash
./run-local.sh 3000
```

Then open:

- <http://localhost:3000>


### Option C: standalone single HTML file

If you specifically want an HTML-only version, use:

- `earth-digital-twin.html`

Serve the folder (same as above) and open:

- <http://localhost:8080/earth-digital-twin.html>

### Option B: direct Python command

```bash
python3 -m http.server 8080
```

Then open:

- <http://localhost:8080>

## Public data layers used

- Esri World Imagery:
  - https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer
- NASA GIBS VIIRS Cloud Mask:
  - https://gibs.earthdata.nasa.gov/
- NASA GIBS VIIRS Black Marble:
  - https://gibs.earthdata.nasa.gov/

## Notes

- This implementation avoids paid APIs and private keys.
- For very low-end devices, disable the cloud layer in `app.js` for additional performance headroom.
