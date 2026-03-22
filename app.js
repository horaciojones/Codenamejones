const ORBITAL_DESTINATION = Cesium.Cartesian3.fromDegrees(-30.0, 25.0, 25_000_000);

const viewer = new Cesium.Viewer('cesiumContainer', {
  animation: false,
  baseLayerPicker: false,
  geocoder: true,
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

const cloudLayer = imageryLayers.addImageryProvider(
  new Cesium.UrlTemplateImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Cloud_Mask/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    tileMatrixSetID: 'GoogleMapsCompatible_Level9',
    tileMatrixLabels: [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9'
    ],
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

function toInputDateTime(julianDate) {
  const date = Cesium.JulianDate.toDate(julianDate);
  const pad = (value) => `${value}`.padStart(2, '0');

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())}`;
}

function setSimulationDate(rawDate) {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return;
  }

  viewer.clock.currentTime = Cesium.JulianDate.fromDate(parsed);

  // Increase city-light contrast once the night layer is enabled.
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

nightToggle.addEventListener('change', () => {
  nightLayer.alpha = nightToggle.checked ? 0.85 : 0;
  scene.requestRender();
});

dateTime.addEventListener('change', () => {
  setSimulationDate(dateTime.value);
});

nowBtn.addEventListener('click', () => {
  const now = new Date();
  dateTime.value = toInputDateTime(Cesium.JulianDate.fromDate(now));
  setSimulationDate(dateTime.value);
});

orbitalViewBtn.addEventListener('click', () => {
  viewer.camera.flyTo({
    destination: ORBITAL_DESTINATION,
    duration: 1.6
  });
});

dateTime.value = toInputDateTime(viewer.clock.currentTime);
viewer.camera.flyTo({ destination: ORBITAL_DESTINATION, duration: 0 });
scene.requestRender();
