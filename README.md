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
- Global 3D terrain (Cesium World Terrain when available, with graceful fallback).
- Global 3D buildings via OSM Buildings (auto-disables if unavailable).
- Realism controls: day/night, sun slider, clouds, fog, atmosphere, terrain exaggeration.
- Interaction tools: lat/lon/elevation info card, distance measure, area measure, pin notes.
- Personal overlays (work/food/gym/danger) with per-layer toggles.
- Route Lab panel (experimental compare-3-routes UX placeholder).
- Data layers: USGS earthquakes toggle, GeoJSON/KML/GPX import.
- Keyboard shortcuts: `F` search, `R` auto-rotate, `M` measure, `A` annotate.
- Event-scene design mode: waypoint markers, shoreline grandstands, staging zones, route-side custom structures, and activation areas.
- Sponsor overlays as native environmental placements (ground-integrated halos + labels) to maximize visibility without billboard clutter.
- Mood slider for atmospheric color/tone shaping suitable for premium event visualization.

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

- Cesium for Unreal + Google Photorealistic 3D Tiles pipeline is not part of this web repo; this implementation provides the CesiumJS web equivalent for event-scene prototyping.

See PRODUCT_PLAN.md for a full mobility OS roadmap and phased architecture.
