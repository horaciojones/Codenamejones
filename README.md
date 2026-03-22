# Earth Digital Twin — Personal Map Laboratory

This app is designed as a **map laboratory**: one 3D renderer (Cesium) with modular, switchable behavior layers for search, overlays, measurement, notes, route experiments, and replay-style workflows.

## Architecture concept

- One renderer, many behaviors.
- No proprietary map-layer mixing from restricted ecosystems.
- Feature modules guarded by `FEATURE_FLAGS` in `app.js` for easy experimentation.

## Current feature modules

- Command bar search (address/city/coordinates) + recent searches.
- Saved viewpoints + city presets (Miami/NYC/Tokyo) + tour mode.
- Camera controls: orbital reset, compass reset, auto-rotate.
- Realism controls: day/night, sun slider, clouds, fog, atmosphere, terrain exaggeration, optional 3D buildings.
- Interaction tools: lat/lon/elevation info card, distance measure, area measure, pin notes.
- Personal overlays (work/food/gym/danger) with per-layer toggles.
- Route Lab panel (experimental compare-3-routes UX placeholder).
- Data layers: USGS earthquakes toggle, GeoJSON/KML/GPX import.
- Keyboard shortcuts: `F` search, `R` auto-rotate, `M` measure, `A` annotate.

## Run

```bash
./run-local.sh
```

Open:

- <http://localhost:8080>

## Data sources

- Esri World Imagery: https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer
- OpenStreetMap tiles + geocoder: https://tile.openstreetmap.org/ + https://nominatim.openstreetmap.org/
- NASA GIBS cloud + Black Marble: https://gibs.earthdata.nasa.gov/
- USGS earthquakes: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson

## Notes

- This is for personal experimentation and uses public/free endpoints only.
- If OSM 3D buildings are unavailable, the buildings toggle auto-disables.
