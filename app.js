const ORBITAL_DESTINATION = Cesium.Cartesian3.fromDegrees(-30.0, 25.0, 25_000_000);
const EASTERN_TIMEZONE = 'America/New_York';
const SAVED_VIEWS_KEY = 'earth-digital-twin-saved-views-v2';

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
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    enablePickFeatures: false
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
    maximumLevel: 8,
    credit: 'NASA GIBS'
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
    maximumLevel: 8,
    credit: 'NASA Black Marble'
  })
);
nightLayer.alpha = 0;

let quakesDataSource;
let buildingsTileset;
let autoRotate = false;
let tourTimer;

(async () => {
  try {
    buildingsTileset = await Cesium.createOsmBuildingsAsync();
    scene.primitives.add(buildingsTileset);
  } catch {
    const buildingsToggle = document.getElementById('buildingsToggle');
    buildingsToggle.disabled = true;
    buildingsToggle.checked = false;
  }
})();

const dom = {
  sunLight: scene.light,
  nightToggle: document.getElementById('nightToggle'),
  labelsToggle: document.getElementById('labelsToggle'),
  cloudsToggle: document.getElementById('cloudsToggle'),
  fogToggle: document.getElementById('fogToggle'),
  atmosphereToggle: document.getElementById('atmosphereToggle'),
  buildingsToggle: document.getElementById('buildingsToggle'),
  quakesToggle: document.getElementById('quakesToggle'),
  dateTime: document.getElementById('dateTime'),
  sunSlider: document.getElementById('sunSlider'),
  terrainExaggeration: document.getElementById('terrainExaggeration'),
  nowBtn: document.getElementById('nowBtn'),
  orbitalViewBtn: document.getElementById('orbitalViewBtn'),
  resetNorthBtn: document.getElementById('resetNorthBtn'),
  autoRotateBtn: document.getElementById('autoRotateBtn'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  easternClock: document.getElementById('easternClock'),
  cityButtons: document.querySelectorAll('[data-city-lon][data-city-lat]'),
  measureBtn: document.getElementById('measureBtn'),
  measureAreaBtn: document.getElementById('measureAreaBtn'),
  clearMeasureBtn: document.getElementById('clearMeasureBtn'),
  annotateBtn: document.getElementById('annotateBtn'),
  saveViewBtn: document.getElementById('saveViewBtn'),
  loadViewBtn: document.getElementById('loadViewBtn'),
  deleteViewBtn: document.getElementById('deleteViewBtn'),
  tourBtn: document.getElementById('tourBtn'),
  savedViews: document.getElementById('savedViews'),
  importFile: document.getElementById('importFile'),
  infoText: document.getElementById('infoText')
};

const clickHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
let activeTool = null;
let measurePoints = [];
let areaPoints = [];
let tempEntities = [];

function toLocalInputDateTime(date) {
  const pad = (value) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function updateEasternClock() {
  dom.easternClock.textContent = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: EASTERN_TIMEZONE,
    timeZoneName: 'short'
  }).format(new Date());
}

function setSimulationDate(rawDate) {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return;
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(parsed);
  dom.sunSlider.value = String(parsed.getHours());

  if (dom.nightToggle.checked) {
    const sunIntensity = Cesium.Math.clamp(
      Cesium.Cartesian3.dot(
        Cesium.Cartesian3.normalize(dom.sunLight.direction, new Cesium.Cartesian3()),
        Cesium.Cartesian3.normalize(viewer.camera.positionWC, new Cesium.Cartesian3())
      ),
      -1,
      1
    );
    nightLayer.alpha = Cesium.Math.lerp(0.4, 0.95, (1 - sunIntensity) / 2);
  }
  scene.requestRender();
}

function parseCoordinates(raw) {
  const parts = raw.split(',').map((v) => Number(v.trim()));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  return { lat: parts[0], lon: parts[1] };
}

async function flyToAddress(query) {
  const trimmed = query.trim();
  if (!trimmed) return;

  const coords = parseCoordinates(trimmed);
  if (coords) {
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(coords.lon, coords.lat, 4200), duration: 2 });
    return;
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', trimmed);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');

  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Search failed (${response.status})`);

  const [result] = await response.json();
  if (!result) throw new Error('No results found for this search.');

  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(Number(result.lon), Number(result.lat), 4200), duration: 2 });
}

function getCartesian(position) {
  const ray = viewer.camera.getPickRay(position);
  return scene.globe.pick(ray, scene) || viewer.camera.pickEllipsoid(position, globe.ellipsoid);
}

function clearTempEntities() {
  tempEntities.forEach((entity) => viewer.entities.remove(entity));
  tempEntities = [];
}

function setTool(toolName) {
  activeTool = activeTool === toolName ? null : toolName;
  dom.measureBtn.classList.toggle('active', activeTool === 'measure');
  dom.measureAreaBtn.classList.toggle('active', activeTool === 'area');
  dom.annotateBtn.classList.toggle('active', activeTool === 'annotate');
}

function polygonAreaSqKm(cartesians) {
  const cartographics = cartesians.map((c) => Cesium.Cartographic.fromCartesian(c));
  const points = cartographics.map((c) => [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)]);
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2) * 111 * 111;
}

function saveCameraView() {
  const name = prompt('Name this viewpoint:');
  if (!name) return;

  const position = viewer.camera.positionCartographic;
  const views = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  views.push({
    name,
    lon: position.longitude,
    lat: position.latitude,
    height: position.height,
    heading: viewer.camera.heading,
    pitch: viewer.camera.pitch,
    roll: viewer.camera.roll
  });
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  refreshSavedViews();
}

function refreshSavedViews() {
  const defaults = [
    { name: 'Miami', lon: Cesium.Math.toRadians(-80.1918), lat: Cesium.Math.toRadians(25.7617), height: 7000, heading: 0, pitch: -0.8, roll: 0 },
    { name: 'NYC', lon: Cesium.Math.toRadians(-74.006), lat: Cesium.Math.toRadians(40.7128), height: 7000, heading: 0, pitch: -0.8, roll: 0 },
    { name: 'Tokyo', lon: Cesium.Math.toRadians(139.6917), lat: Cesium.Math.toRadians(35.6895), height: 7000, heading: 0, pitch: -0.8, roll: 0 }
  ];
  const saved = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  const views = [...defaults, ...saved];

  dom.savedViews.innerHTML = '';
  views.forEach((view, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = view.name;
    dom.savedViews.append(option);
  });

  dom.savedViews.dataset.views = JSON.stringify(views);
}

function loadSelectedView() {
  const index = Number(dom.savedViews.value);
  const views = JSON.parse(dom.savedViews.dataset.views || '[]');
  const view = views[index];
  if (!view) return;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromRadians(view.lon, view.lat, view.height),
    orientation: { heading: view.heading, pitch: view.pitch, roll: view.roll },
    duration: 1.6
  });
}

function deleteSelectedView() {
  const selectedName = dom.savedViews.options[dom.savedViews.selectedIndex]?.textContent;
  const saved = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  const next = saved.filter((view) => view.name !== selectedName);
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
  refreshSavedViews();
}

function setInfoCard(cartesian) {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const elevation = globe.getHeight(cartographic) ?? 0;
  dom.infoText.textContent = `Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)}, Elev ${elevation.toFixed(1)} m`;
}

async function toggleQuakes(show) {
  if (!show) {
    if (quakesDataSource) {
      viewer.dataSources.remove(quakesDataSource);
      quakesDataSource = undefined;
    }
    return;
  }

  quakesDataSource = await Cesium.GeoJsonDataSource.load(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    {
      markerSize: 7,
      markerColor: Cesium.Color.RED
    }
  );
  viewer.dataSources.add(quakesDataSource);
}

function startTour() {
  const stops = [
    Cesium.Cartesian3.fromDegrees(-80.1918, 25.7617, 9000),
    Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 9000),
    Cesium.Cartesian3.fromDegrees(139.6917, 35.6895, 9000)
  ];

  let index = 0;
  clearInterval(tourTimer);
  tourTimer = setInterval(() => {
    viewer.camera.flyTo({ destination: stops[index % stops.length], duration: 4 });
    index += 1;
  }, 4500);
}

function stopTour() {
  clearInterval(tourTimer);
}

viewer.clock.onTick.addEventListener(() => {
  if (autoRotate && activeTool === null) {
    viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0004);
  }
});

clickHandler.setInputAction((movement) => {
  const cartesian = getCartesian(movement.position);
  if (!cartesian) return;

  setInfoCard(cartesian);

  if (activeTool === 'measure') {
    measurePoints.push(cartesian);
    tempEntities.push(viewer.entities.add({ position: cartesian, point: { pixelSize: 8, color: Cesium.Color.CYAN } }));
    if (measurePoints.length === 2) {
      const km = Cesium.Cartesian3.distance(measurePoints[0], measurePoints[1]) / 1000;
      tempEntities.push(viewer.entities.add({ polyline: { positions: [...measurePoints], width: 3, material: Cesium.Color.YELLOW } }));
      tempEntities.push(
        viewer.entities.add({
          position: Cesium.Cartesian3.midpoint(measurePoints[0], measurePoints[1], new Cesium.Cartesian3()),
          label: { text: `${km.toFixed(2)} km`, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.6) }
        })
      );
      measurePoints = [];
    }
  }

  if (activeTool === 'area') {
    areaPoints.push(cartesian);
    tempEntities.push(viewer.entities.add({ position: cartesian, point: { pixelSize: 7, color: Cesium.Color.LIME } }));
  }

  if (activeTool === 'annotate') {
    const note = prompt('Pin label:');
    if (note) {
      tempEntities.push(
        viewer.entities.add({
          position: cartesian,
          point: { pixelSize: 9, color: Cesium.Color.ORANGE },
          label: { text: note, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.7), pixelOffset: new Cesium.Cartesian2(0, -18) }
        })
      );
    }
  }

  scene.requestRender();
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

clickHandler.setInputAction(() => {
  if (activeTool === 'area' && areaPoints.length >= 3) {
    const areaSqKm = polygonAreaSqKm(areaPoints);
    tempEntities.push(viewer.entities.add({ polygon: { hierarchy: new Cesium.PolygonHierarchy([...areaPoints]), material: Cesium.Color.LIME.withAlpha(0.25) } }));
    tempEntities.push(
      viewer.entities.add({
        position: areaPoints[0],
        label: { text: `${areaSqKm.toFixed(2)} km²`, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.6) }
      })
    );
    areaPoints = [];
  }
}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

dom.nightToggle.addEventListener('change', () => {
  nightLayer.alpha = dom.nightToggle.checked ? 0.85 : 0;
  scene.requestRender();
});
dom.labelsToggle.addEventListener('change', () => (labelsLayer.show = dom.labelsToggle.checked));
dom.cloudsToggle.addEventListener('change', () => (cloudLayer.show = dom.cloudsToggle.checked));
dom.fogToggle.addEventListener('change', () => (scene.fog.enabled = dom.fogToggle.checked));
dom.atmosphereToggle.addEventListener('change', () => (scene.skyAtmosphere.show = dom.atmosphereToggle.checked));
dom.buildingsToggle.addEventListener('change', () => {
  if (buildingsTileset) buildingsTileset.show = dom.buildingsToggle.checked;
});
dom.quakesToggle.addEventListener('change', async () => {
  await toggleQuakes(dom.quakesToggle.checked);
  scene.requestRender();
});

dom.sunSlider.addEventListener('input', () => {
  const d = new Date(dom.dateTime.value || new Date());
  d.setHours(Number(dom.sunSlider.value));
  dom.dateTime.value = toLocalInputDateTime(d);
  setSimulationDate(dom.dateTime.value);
});

dom.terrainExaggeration.addEventListener('input', () => {
  scene.verticalExaggeration = Number(dom.terrainExaggeration.value);
  scene.requestRender();
});

dom.dateTime.addEventListener('change', () => setSimulationDate(dom.dateTime.value));
dom.nowBtn.addEventListener('click', () => {
  dom.dateTime.value = toLocalInputDateTime(new Date());
  setSimulationDate(dom.dateTime.value);
  updateEasternClock();
});
dom.orbitalViewBtn.addEventListener('click', () => viewer.camera.flyTo({ destination: ORBITAL_DESTINATION, duration: 1.6 }));
dom.resetNorthBtn.addEventListener('click', () => {
  viewer.camera.flyTo({ destination: viewer.camera.positionWC, orientation: { heading: 0, pitch: viewer.camera.pitch, roll: 0 }, duration: 0.8 });
});
dom.autoRotateBtn.addEventListener('click', () => {
  autoRotate = !autoRotate;
  dom.autoRotateBtn.classList.toggle('active', autoRotate);
});

dom.searchBtn.addEventListener('click', async () => {
  dom.searchBtn.disabled = true;
  dom.searchBtn.textContent = 'Searching…';
  try {
    await flyToAddress(dom.searchInput.value);
  } catch (error) {
    alert(error.message);
  } finally {
    dom.searchBtn.disabled = false;
    dom.searchBtn.textContent = 'Go';
  }
});
dom.searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    dom.searchBtn.click();
  }
});

dom.cityButtons.forEach((button) => {
  button.addEventListener('click', () =>
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(Number(button.dataset.cityLon), Number(button.dataset.cityLat), 7000), duration: 2 })
  );
});

dom.measureBtn.addEventListener('click', () => setTool('measure'));
dom.measureAreaBtn.addEventListener('click', () => setTool('area'));
dom.annotateBtn.addEventListener('click', () => setTool('annotate'));
dom.clearMeasureBtn.addEventListener('click', () => {
  clearTempEntities();
  measurePoints = [];
  areaPoints = [];
});
dom.saveViewBtn.addEventListener('click', saveCameraView);
dom.loadViewBtn.addEventListener('click', loadSelectedView);
dom.deleteViewBtn.addEventListener('click', deleteSelectedView);
dom.tourBtn.addEventListener('click', () => {
  const isActive = dom.tourBtn.classList.toggle('active');
  if (isActive) {
    startTour();
  } else {
    stopTour();
  }
});

dom.importFile.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (file.name.endsWith('.kml') || file.name.endsWith('.gpx')) {
    const dataSource = await Cesium.KmlDataSource.load(url, { camera: viewer.scene.camera, canvas: viewer.scene.canvas });
    viewer.dataSources.add(dataSource);
  } else {
    const dataSource = await Cesium.GeoJsonDataSource.load(url, { stroke: Cesium.Color.SKYBLUE, fill: Cesium.Color.SKYBLUE.withAlpha(0.2), strokeWidth: 2 });
    viewer.dataSources.add(dataSource);
  }
  scene.requestRender();
});

dom.dateTime.value = toLocalInputDateTime(new Date());
setSimulationDate(dom.dateTime.value);
updateEasternClock();
refreshSavedViews();
setInterval(updateEasternClock, 30_000);
viewer.camera.flyTo({ destination: ORBITAL_DESTINATION, duration: 0 });
