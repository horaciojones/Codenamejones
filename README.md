# Earth Digital Twin (Web)

A lightweight Cesium-based digital twin of Earth that lets you zoom from orbital view down to city-scale imagery in a normal browser.

## Features

- Photorealistic global base map (Esri World Imagery).
- Interactive globe controls with smooth zoom/pan/tilt.
- Atmospheric scattering and dynamic sun lighting.
- Real-time cloud overlay (NASA GIBS VIIRS cloud mask).
- Night-light toggle using NASA Black Marble.
- Orbital date/time picker (UTC) and quick **Now** reset.

## Run locally

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080>.

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
