const ORBITAL_DESTINATION = Cesium.Cartesian3.fromDegrees(-30.0, 25.0, 25_000_000);
const EASTERN_TIMEZONE = 'America/New_York';

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

const sunLight = scene.light;
const nightToggle = document.getElementById('nightToggle');
const dateTime = document.getElementById('dateTime');
const nowBtn = document.getElementById('nowBtn');
const orbitalViewBtn = document.getElementById('orbitalViewBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const easternClock = document.getElementById('easternClock');
const cityButtons = document.querySelectorAll('[data-city-lon][data-city-lat]');

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

nightToggle.addEventListener('change', () => {
  nightLayer.alpha = nightToggle.checked ? 0.85 : 0;
  scene.requestRender();
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

dateTime.value = toLocalInputDateTime(new Date());
setSimulationDate(dateTime.value);
updateEasternClock();
setInterval(updateEasternClock, 30_000);
viewer.camera.flyTo({ destination: ORBITAL_DESTINATION, duration: 0 });
scene.requestRender();
