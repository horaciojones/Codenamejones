const FEATURE_FLAGS = {
  routeLab: true,
  overlays: true,
  quakesLayer: true,
  geoImport: true,
  tourMode: true,
  annotations: true,
  measurements: true
};

const ORBITAL_DESTINATION = Cesium.Cartesian3.fromDegrees(-30.0, 25.0, 25_000_000);
const EASTERN_TIMEZONE = 'America/New_York';
const SAVED_VIEWS_KEY = 'map-lab-saved-views-v1';
const RECENT_SEARCHES_KEY = 'map-lab-recent-searches-v1';

const viewer = new Cesium.Viewer('cesiumContainer', {
  animation: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  timeline: false,
  sceneModePicker: false,
  fullscreenButton: false,
  infoBox: false,
  selectionIndicator: false,
  navigationHelpButton: false,
  requestRenderMode: true,
  maximumRenderTimeChange: Infinity,
  imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
  }),
  terrainProvider: new Cesium.EllipsoidTerrainProvider()
});

const scene = viewer.scene;
const globe = scene.globe;
const imageryLayers = globe.imageryLayers;

globe.enableLighting = true;
scene.skyAtmosphere.show = true;
scene.fog.enabled = true;
scene.screenSpaceCameraController.minimumZoomDistance = 20;
scene.screenSpaceCameraController.maximumZoomDistance = 40_000_000;
viewer.clock.multiplier = 0;

const labelsLayer = imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }));
labelsLayer.alpha = 0.45;
const cloudLayer = imageryLayers.addImageryProvider(
  new Cesium.UrlTemplateImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Cloud_Mask/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    tileMatrixSetID: 'GoogleMapsCompatible_Level9',
    tileMatrixLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    maximumLevel: 8
  })
);
cloudLayer.alpha = 0.26;
const nightLayer = imageryLayers.addImageryProvider(
  new Cesium.WebMapTileServiceImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    layer: 'VIIRS_Black_Marble',
    style: 'default',
    tileMatrixSetID: 'GoogleMapsCompatible_Level8',
    format: 'image/jpeg',
    maximumLevel: 8
  })
);
nightLayer.alpha = 0;

const dom = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  cityButtons: document.querySelectorAll('[data-city-lon][data-city-lat]'),
  goHomeBtn: document.getElementById('goHomeBtn'),
  goWorkBtn: document.getElementById('goWorkBtn'),
  nightToggle: document.getElementById('nightToggle'),
  labelsToggle: document.getElementById('labelsToggle'),
  cloudsToggle: document.getElementById('cloudsToggle'),
  fogToggle: document.getElementById('fogToggle'),
  atmosphereToggle: document.getElementById('atmosphereToggle'),
  buildingsToggle: document.getElementById('buildingsToggle'),
  quakesToggle: document.getElementById('quakesToggle'),
  sunSlider: document.getElementById('sunSlider'),
  terrainExaggeration: document.getElementById('terrainExaggeration'),
  nowBtn: document.getElementById('nowBtn'),
  orbitalViewBtn: document.getElementById('orbitalViewBtn'),
  resetNorthBtn: document.getElementById('resetNorthBtn'),
  autoRotateBtn: document.getElementById('autoRotateBtn'),
  measureBtn: document.getElementById('measureBtn'),
  measureAreaBtn: document.getElementById('measureAreaBtn'),
  clearMeasureBtn: document.getElementById('clearMeasureBtn'),
  annotateBtn: document.getElementById('annotateBtn'),
  saveViewBtn: document.getElementById('saveViewBtn'),
  savedViews: document.getElementById('savedViews'),
  loadViewBtn: document.getElementById('loadViewBtn'),
  deleteViewBtn: document.getElementById('deleteViewBtn'),
  tourBtn: document.getElementById('tourBtn'),
  importFile: document.getElementById('importFile'),
  infoText: document.getElementById('infoText'),
  easternClock: document.getElementById('easternClock'),
  panelToggle: document.getElementById('panelToggle'),
  labPanel: document.getElementById('labPanel'),
  routeFrom: document.getElementById('routeFrom'),
  routeTo: document.getElementById('routeTo'),
  routeCompareBtn: document.getElementById('routeCompareBtn'),
  routeResults: document.getElementById('routeResults'),
  recentPlaces: document.getElementById('recentPlaces'),
  overlayToggles: document.querySelectorAll('.overlayToggle')
};

const state = {
  autoRotate: false,
  activeTool: null,
  clickPoints: [],
  areaPoints: [],
  scratchEntities: [],
  overlayEntities: [],
  buildingsTileset: null,
  quakesDataSource: null,
  tourTimer: null
};

const clickHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

function initBuildings() {
  Cesium.createOsmBuildingsAsync()
    .then((tileset) => {
      state.buildingsTileset = tileset;
      scene.primitives.add(tileset);
    })
    .catch(() => {
      dom.buildingsToggle.disabled = true;
      dom.buildingsToggle.checked = false;
    });
}

function updateEasternClock() {
  dom.easternClock.textContent = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: EASTERN_TIMEZONE,
    timeZoneName: 'short'
  }).format(new Date());
}

function addRecentPlace(text) {
  const recent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  const deduped = [text, ...recent.filter((item) => item !== text)].slice(0, 8);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(deduped));
  renderRecentPlaces();
}

function renderRecentPlaces() {
  const recent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  dom.recentPlaces.innerHTML = '';
  recent.forEach((entry) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = entry;
    btn.addEventListener('click', () => flyToAddress(entry));
    li.append(btn);
    dom.recentPlaces.append(li);
  });
}

function setInfoCard(cartesian) {
  const c = Cesium.Cartographic.fromCartesian(cartesian);
  const lat = Cesium.Math.toDegrees(c.latitude);
  const lon = Cesium.Math.toDegrees(c.longitude);
  const elev = globe.getHeight(c) ?? 0;
  dom.infoText.textContent = `Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)}, Elev ${elev.toFixed(1)}m`;
}

function parseCoords(text) {
  const parts = text.split(',').map((v) => Number(v.trim()));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  return { lat: parts[0], lon: parts[1] };
}

async function flyToAddress(text) {
  const query = text.trim();
  if (!query) return;
  addRecentPlace(query);

  const coords = parseCoords(query);
  if (coords) {
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(coords.lon, coords.lat, 4500), duration: 2 });
    return;
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  const [result] = await response.json();
  if (!result) throw new Error('No result found.');
  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(Number(result.lon), Number(result.lat), 4500), duration: 2 });
}

function getPick(position) {
  const ray = viewer.camera.getPickRay(position);
  return scene.globe.pick(ray, scene) || viewer.camera.pickEllipsoid(position, globe.ellipsoid);
}

function clearScratch() {
  state.scratchEntities.forEach((e) => viewer.entities.remove(e));
  state.scratchEntities = [];
  state.clickPoints = [];
  state.areaPoints = [];
}

function setTool(tool) {
  state.activeTool = state.activeTool === tool ? null : tool;
  dom.measureBtn.classList.toggle('active', state.activeTool === 'measure');
  dom.measureAreaBtn.classList.toggle('active', state.activeTool === 'area');
  dom.annotateBtn.classList.toggle('active', state.activeTool === 'annotate');
}

function polygonAreaKm2(points) {
  const carto = points.map((p) => Cesium.Cartographic.fromCartesian(p));
  const deg = carto.map((x) => [Cesium.Math.toDegrees(x.longitude), Cesium.Math.toDegrees(x.latitude)]);
  let area = 0;
  for (let i = 0; i < deg.length; i += 1) {
    const [x1, y1] = deg[i];
    const [x2, y2] = deg[(i + 1) % deg.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2) * 111 * 111;
}

function refreshSavedViews() {
  const defaults = [
    { name: 'Miami', lon: -80.1918, lat: 25.7617 },
    { name: 'NYC', lon: -74.006, lat: 40.7128 },
    { name: 'Tokyo', lon: 139.6917, lat: 35.6895 }
  ];
  const custom = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  const merged = [...defaults, ...custom];
  dom.savedViews.innerHTML = '';
  merged.forEach((v, idx) => {
    const option = document.createElement('option');
    option.value = String(idx);
    option.textContent = v.name;
    dom.savedViews.append(option);
  });
  dom.savedViews.dataset.views = JSON.stringify(merged);
}

function saveView() {
  const name = prompt('Name viewpoint');
  if (!name) return;
  const p = viewer.camera.positionCartographic;
  const saved = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  saved.push({ name, lon: Cesium.Math.toDegrees(p.longitude), lat: Cesium.Math.toDegrees(p.latitude), height: p.height, heading: viewer.camera.heading, pitch: viewer.camera.pitch, roll: viewer.camera.roll });
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(saved));
  refreshSavedViews();
}

function loadView() {
  const views = JSON.parse(dom.savedViews.dataset.views || '[]');
  const view = views[Number(dom.savedViews.value)];
  if (!view) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(view.lon, view.lat, view.height || 7000),
    orientation: { heading: view.heading || 0, pitch: view.pitch || -0.8, roll: view.roll || 0 },
    duration: 1.8
  });
}

function deleteView() {
  const selected = dom.savedViews.options[dom.savedViews.selectedIndex]?.textContent;
  const saved = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]').filter((v) => v.name !== selected);
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(saved));
  refreshSavedViews();
}

async function toggleQuakes(on) {
  if (!FEATURE_FLAGS.quakesLayer) return;
  if (!on) {
    if (state.quakesDataSource) viewer.dataSources.remove(state.quakesDataSource);
    state.quakesDataSource = null;
    return;
  }
  state.quakesDataSource = await Cesium.GeoJsonDataSource.load('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', {
    markerColor: Cesium.Color.RED,
    markerSize: 7
  });
  viewer.dataSources.add(state.quakesDataSource);
}

function initOverlays() {
  const presets = [
    { type: 'work', label: 'Office', lon: -80.197, lat: 25.774, color: Cesium.Color.DODGERBLUE },
    { type: 'food', label: 'Favorite Cafe', lon: -80.191, lat: 25.763, color: Cesium.Color.GOLD },
    { type: 'gym', label: 'Gym', lon: -80.205, lat: 25.768, color: Cesium.Color.LIME },
    { type: 'danger', label: 'Flood-prone', lon: -80.187, lat: 25.758, color: Cesium.Color.RED }
  ];

  presets.forEach((item) => {
    state.overlayEntities.push(
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat),
        point: { pixelSize: 9, color: item.color },
        label: { text: item.label, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.6), pixelOffset: new Cesium.Cartesian2(0, -14) },
        properties: { overlayType: item.type }
      })
    );
  });
}

function filterOverlay(type, isVisible) {
  state.overlayEntities
    .filter((entity) => entity.properties?.overlayType?.getValue?.() === type)
    .forEach((entity) => {
      entity.show = isVisible;
    });
}

function compareRoutes() {
  if (!FEATURE_FLAGS.routeLab) return;
  const from = dom.routeFrom.value.trim();
  const to = dom.routeTo.value.trim();
  if (!from || !to) return;

  const mockRoutes = [
    { name: 'Fastest', eta: '27 min', distance: '12.1 mi', annoyance: 6 },
    { name: 'Low stress', eta: '33 min', distance: '13.7 mi', annoyance: 3 },
    { name: 'No tolls', eta: '35 min', distance: '14.9 mi', annoyance: 4 }
  ];

  dom.routeResults.innerHTML = '';
  mockRoutes.forEach((r) => {
    const li = document.createElement('li');
    li.textContent = `${r.name}: ${r.eta}, ${r.distance}, annoyance ${r.annoyance}/10`;
    dom.routeResults.append(li);
  });
}

function startTour() {
  if (!FEATURE_FLAGS.tourMode) return;
  const stops = [
    Cesium.Cartesian3.fromDegrees(-80.1918, 25.7617, 9000),
    Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 9000),
    Cesium.Cartesian3.fromDegrees(139.6917, 35.6895, 9000)
  ];
  let idx = 0;
  clearInterval(state.tourTimer);
  state.tourTimer = setInterval(() => {
    viewer.camera.flyTo({ destination: stops[idx % stops.length], duration: 4 });
    idx += 1;
  }, 4500);
}

function stopTour() {
  clearInterval(state.tourTimer);
}

function bindEvents() {
  dom.searchBtn.addEventListener('click', async () => {
    try {
      await flyToAddress(dom.searchInput.value);
    } catch (e) {
      alert(e.message);
    }
  });

  dom.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dom.searchBtn.click();
  });

  dom.cityButtons.forEach((btn) => btn.addEventListener('click', () => viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(Number(btn.dataset.cityLon), Number(btn.dataset.cityLat), 7000), duration: 2 })));
  dom.goHomeBtn.addEventListener('click', () => flyToAddress('Home, Miami, FL'));
  dom.goWorkBtn.addEventListener('click', () => flyToAddress('Downtown Miami, FL'));

  dom.nightToggle.addEventListener('change', () => (nightLayer.alpha = dom.nightToggle.checked ? 0.85 : 0));
  dom.labelsToggle.addEventListener('change', () => (labelsLayer.show = dom.labelsToggle.checked));
  dom.cloudsToggle.addEventListener('change', () => (cloudLayer.show = dom.cloudsToggle.checked));
  dom.fogToggle.addEventListener('change', () => (scene.fog.enabled = dom.fogToggle.checked));
  dom.atmosphereToggle.addEventListener('change', () => (scene.skyAtmosphere.show = dom.atmosphereToggle.checked));
  dom.buildingsToggle.addEventListener('change', () => state.buildingsTileset && (state.buildingsTileset.show = dom.buildingsToggle.checked));
  dom.quakesToggle.addEventListener('change', () => toggleQuakes(dom.quakesToggle.checked));

  dom.sunSlider.addEventListener('input', () => {
    const d = new Date();
    d.setHours(Number(dom.sunSlider.value));
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(d);
  });
  dom.terrainExaggeration.addEventListener('input', () => (scene.verticalExaggeration = Number(dom.terrainExaggeration.value)));

  dom.nowBtn.addEventListener('click', () => (viewer.clock.currentTime = Cesium.JulianDate.now()));
  dom.orbitalViewBtn.addEventListener('click', () => viewer.camera.flyTo({ destination: ORBITAL_DESTINATION, duration: 1.6 }));
  dom.resetNorthBtn.addEventListener('click', () => viewer.camera.flyTo({ destination: viewer.camera.positionWC, orientation: { heading: 0, pitch: viewer.camera.pitch, roll: 0 }, duration: 0.8 }));
  dom.autoRotateBtn.addEventListener('click', () => {
    state.autoRotate = !state.autoRotate;
    dom.autoRotateBtn.classList.toggle('active', state.autoRotate);
  });

  dom.measureBtn.addEventListener('click', () => setTool('measure'));
  dom.measureAreaBtn.addEventListener('click', () => setTool('area'));
  dom.annotateBtn.addEventListener('click', () => setTool('annotate'));
  dom.clearMeasureBtn.addEventListener('click', clearScratch);

  dom.saveViewBtn.addEventListener('click', saveView);
  dom.loadViewBtn.addEventListener('click', loadView);
  dom.deleteViewBtn.addEventListener('click', deleteView);
  dom.tourBtn.addEventListener('click', () => {
    const on = dom.tourBtn.classList.toggle('active');
    if (on) startTour();
    else stopTour();
  });

  if (FEATURE_FLAGS.geoImport) {
    dom.importFile.addEventListener('change', async (event) => {
      const [file] = event.target.files;
      if (!file) return;
      const url = URL.createObjectURL(file);
      const ds = file.name.endsWith('.kml') || file.name.endsWith('.gpx')
        ? await Cesium.KmlDataSource.load(url, { camera: scene.camera, canvas: scene.canvas })
        : await Cesium.GeoJsonDataSource.load(url);
      viewer.dataSources.add(ds);
    });
  }

  dom.panelToggle.addEventListener('click', () => dom.labPanel.classList.toggle('open'));
  dom.routeCompareBtn.addEventListener('click', compareRoutes);

  dom.overlayToggles.forEach((toggle) => {
    toggle.addEventListener('change', () => filterOverlay(toggle.dataset.overlay, toggle.checked));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'f') dom.searchInput.focus();
    if (event.key.toLowerCase() === 'r') dom.autoRotateBtn.click();
    if (event.key.toLowerCase() === 'm') dom.measureBtn.click();
    if (event.key.toLowerCase() === 'a') dom.annotateBtn.click();
  });

  clickHandler.setInputAction((movement) => {
    const p = getPick(movement.position);
    if (!p) return;
    setInfoCard(p);

    if (state.activeTool === 'measure' && FEATURE_FLAGS.measurements) {
      state.clickPoints.push(p);
      state.scratchEntities.push(viewer.entities.add({ position: p, point: { pixelSize: 8, color: Cesium.Color.CYAN } }));
      if (state.clickPoints.length === 2) {
        const km = Cesium.Cartesian3.distance(state.clickPoints[0], state.clickPoints[1]) / 1000;
        state.scratchEntities.push(viewer.entities.add({ polyline: { positions: [...state.clickPoints], width: 3, material: Cesium.Color.YELLOW } }));
        state.scratchEntities.push(viewer.entities.add({ position: p, label: { text: `${km.toFixed(2)} km`, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.65) } }));
        state.clickPoints = [];
      }
    }

    if (state.activeTool === 'area' && FEATURE_FLAGS.measurements) {
      state.areaPoints.push(p);
      state.scratchEntities.push(viewer.entities.add({ position: p, point: { pixelSize: 7, color: Cesium.Color.LIME } }));
    }

    if (state.activeTool === 'annotate' && FEATURE_FLAGS.annotations) {
      const note = prompt('Pin note');
      if (!note) return;
      state.scratchEntities.push(
        viewer.entities.add({
          position: p,
          point: { pixelSize: 9, color: Cesium.Color.ORANGE },
          label: { text: note, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.7), pixelOffset: new Cesium.Cartesian2(0, -16) }
        })
      );
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  clickHandler.setInputAction(() => {
    if (state.activeTool === 'area' && state.areaPoints.length >= 3) {
      const km2 = polygonAreaKm2(state.areaPoints);
      state.scratchEntities.push(viewer.entities.add({ polygon: { hierarchy: new Cesium.PolygonHierarchy([...state.areaPoints]), material: Cesium.Color.LIME.withAlpha(0.25) } }));
      state.scratchEntities.push(viewer.entities.add({ position: state.areaPoints[0], label: { text: `${km2.toFixed(2)} km²`, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.7) } }));
      state.areaPoints = [];
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  viewer.clock.onTick.addEventListener(() => {
    if (state.autoRotate && state.activeTool === null) scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0004);
  });
}

function initialize() {
  initBuildings();
  initOverlays();
  bindEvents();
  updateEasternClock();
  setInterval(updateEasternClock, 30_000);
  refreshSavedViews();
  renderRecentPlaces();
  viewer.camera.flyTo({ destination: ORBITAL_DESTINATION, duration: 0 });
}

initialize();
