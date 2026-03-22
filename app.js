const ORBITAL_DESTINATION = Cesium.Cartesian3.fromDegrees(-30.0, 25.0, 25_000_000);
const EASTERN_TIMEZONE = 'America/New_York';
const SAVED_VIEWS_KEY = 'earth-digital-twin-saved-views-v1';

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

const labelsLayer = imageryLayers.addImageryProvider(
  new Cesium.OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/'
  })
);
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

let buildingsTileset;
let buildingsVisible = true;

(async () => {
  try {
    buildingsTileset = await Cesium.createOsmBuildingsAsync();
    scene.primitives.add(buildingsTileset);
    scene.requestRender();
  } catch {
    buildingsVisible = false;
    const buildingsToggle = document.getElementById('buildingsToggle');
    if (buildingsToggle) {
      buildingsToggle.disabled = true;
      buildingsToggle.checked = false;
    }
  }
})();

const sunLight = scene.light;
const nightToggle = document.getElementById('nightToggle');
const labelsToggle = document.getElementById('labelsToggle');
const cloudsToggle = document.getElementById('cloudsToggle');
const buildingsToggle = document.getElementById('buildingsToggle');
const dateTime = document.getElementById('dateTime');
const nowBtn = document.getElementById('nowBtn');
const orbitalViewBtn = document.getElementById('orbitalViewBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const easternClock = document.getElementById('easternClock');
const cityButtons = document.querySelectorAll('[data-city-lon][data-city-lat]');
const measureBtn = document.getElementById('measureBtn');
const clearMeasureBtn = document.getElementById('clearMeasureBtn');
const annotateBtn = document.getElementById('annotateBtn');
const saveViewBtn = document.getElementById('saveViewBtn');
const loadViewBtn = document.getElementById('loadViewBtn');
const deleteViewBtn = document.getElementById('deleteViewBtn');
const savedViews = document.getElementById('savedViews');

let activeTool = null;
let measurePoints = [];
let measureEntities = [];
let annotations = [];

const clickHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

function toLocalInputDateTime(date) {
  const pad = (value) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function updateEasternClock() {
  if (!easternClock) {
    return;
  }

  easternClock.textContent = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: EASTERN_TIMEZONE,
    timeZoneName: 'short'
  }).format(new Date());
}

function setSimulationDate(rawDate) {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return;
  }

  viewer.clock.currentTime = Cesium.JulianDate.fromDate(parsed);

  if (nightToggle.checked) {
    const sunIntensity = Cesium.Math.clamp(
      Cesium.Cartesian3.dot(
        Cesium.Cartesian3.normalize(sunLight.direction, new Cesium.Cartesian3()),
        Cesium.Cartesian3.normalize(viewer.camera.positionWC, new Cesium.Cartesian3())
      ),
      -1,
      1
    );
    nightLayer.alpha = Cesium.Math.lerp(0.4, 0.95, (1 - sunIntensity) / 2);
  }

  scene.requestRender();
}

async function flyToAddress(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', trimmed);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const [result] = await response.json();
  if (!result) {
    throw new Error('No results found for this search.');
  }

  const lon = Number(result.lon);
  const lat = Number(result.lat);

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 4200),
    duration: 2
  });
}

function getCartesianFromClick(position) {
  const ray = viewer.camera.getPickRay(position);
  return scene.globe.pick(ray, scene) || viewer.camera.pickEllipsoid(position, globe.ellipsoid);
}

function setTool(toolName) {
  activeTool = activeTool === toolName ? null : toolName;
  measureBtn.classList.toggle('active', activeTool === 'measure');
  annotateBtn.classList.toggle('active', activeTool === 'annotate');
}

function clearMeasurements() {
  measureEntities.forEach((entity) => viewer.entities.remove(entity));
  measureEntities = [];
  measurePoints = [];
  scene.requestRender();
}

function distanceInKm(pointA, pointB) {
  return Cesium.Cartesian3.distance(pointA, pointB) / 1000;
}

function saveCameraView() {
  const name = prompt('Name this viewpoint:');
  if (!name) {
    return;
  }

  const views = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  views.push({
    name,
    destination: viewer.camera.positionCartographic,
    heading: viewer.camera.heading,
    pitch: viewer.camera.pitch,
    roll: viewer.camera.roll
  });

  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  refreshSavedViews();
}

function refreshSavedViews() {
  const views = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  savedViews.innerHTML = '';

  views.forEach((view, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = view.name;
    savedViews.append(option);
  });
}

function loadSelectedView() {
  const index = Number(savedViews.value);
  if (Number.isNaN(index)) {
    return;
  }

  const views = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  const view = views[index];
  if (!view) {
    return;
  }

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromRadians(
      view.destination.longitude,
      view.destination.latitude,
      view.destination.height
    ),
    orientation: {
      heading: view.heading,
      pitch: view.pitch,
      roll: view.roll
    },
    duration: 1.6
  });
}

function deleteSelectedView() {
  const index = Number(savedViews.value);
  if (Number.isNaN(index)) {
    return;
  }

  const views = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
  views.splice(index, 1);
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  refreshSavedViews();
}

clickHandler.setInputAction((movement) => {
  const cartesian = getCartesianFromClick(movement.position);
  if (!cartesian) {
    return;
  }

  if (activeTool === 'measure') {
    measurePoints.push(cartesian);
    measureEntities.push(
      viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 9,
          color: Cesium.Color.CYAN
        }
      })
    );

    if (measurePoints.length === 2) {
      const km = distanceInKm(measurePoints[0], measurePoints[1]);
      measureEntities.push(
        viewer.entities.add({
          polyline: {
            positions: [...measurePoints],
            material: Cesium.Color.YELLOW,
            width: 3
          }
        })
      );
      measureEntities.push(
        viewer.entities.add({
          position: Cesium.Cartesian3.midpoint(
            measurePoints[0],
            measurePoints[1],
            new Cesium.Cartesian3()
          ),
          label: {
            text: `${km.toFixed(2)} km`,
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
            pixelOffset: new Cesium.Cartesian2(0, -14)
          }
        })
      );
      measurePoints = [];
    }
  }

  if (activeTool === 'annotate') {
    const labelText = prompt('Annotation label:');
    if (!labelText) {
      return;
    }

    annotations.push(
      viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 8,
          color: Cesium.Color.ORANGE
        },
        label: {
          text: labelText,
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.DARKSLATEGRAY.withAlpha(0.8),
          pixelOffset: new Cesium.Cartesian2(0, -18)
        }
      })
    );
  }

  scene.requestRender();
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

nightToggle.addEventListener('change', () => {
  nightLayer.alpha = nightToggle.checked ? 0.85 : 0;
  scene.requestRender();
});

labelsToggle.addEventListener('change', () => {
  labelsLayer.show = labelsToggle.checked;
  scene.requestRender();
});

cloudsToggle.addEventListener('change', () => {
  cloudLayer.show = cloudsToggle.checked;
  scene.requestRender();
});

buildingsToggle.addEventListener('change', () => {
  buildingsVisible = buildingsToggle.checked;
  if (buildingsTileset) {
    buildingsTileset.show = buildingsVisible;
    scene.requestRender();
  }
});

dateTime.addEventListener('change', () => {
  setSimulationDate(dateTime.value);
});

nowBtn.addEventListener('click', () => {
  const now = new Date();
  dateTime.value = toLocalInputDateTime(now);
  setSimulationDate(dateTime.value);
  updateEasternClock();
});

orbitalViewBtn.addEventListener('click', () => {
  viewer.camera.flyTo({
    destination: ORBITAL_DESTINATION,
    duration: 1.6
  });
});

searchBtn.addEventListener('click', async () => {
  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching…';

  try {
    await flyToAddress(searchInput.value);
  } catch (error) {
    alert(error.message);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Go';
  }
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchBtn.click();
  }
});

cityButtons.forEach((button) => {
  button.addEventListener('click', () => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        Number(button.dataset.cityLon),
        Number(button.dataset.cityLat),
        7000
      ),
      duration: 2
    });
  });
});

measureBtn.addEventListener('click', () => setTool('measure'));
annotateBtn.addEventListener('click', () => setTool('annotate'));
clearMeasureBtn.addEventListener('click', () => clearMeasurements());
saveViewBtn.addEventListener('click', saveCameraView);
loadViewBtn.addEventListener('click', loadSelectedView);
deleteViewBtn.addEventListener('click', deleteSelectedView);

dateTime.value = toLocalInputDateTime(new Date());
setSimulationDate(dateTime.value);
updateEasternClock();
refreshSavedViews();
setInterval(updateEasternClock, 30_000);
viewer.camera.flyTo({ destination: ORBITAL_DESTINATION, duration: 0 });
scene.requestRender();
