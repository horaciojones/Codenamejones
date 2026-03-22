import {
  STREET_HISTORY_STATES,
  DEFAULT_PLACE_LISTS,
  MOCK_INDOOR_LOCATIONS,
  MOCK_POPULAR_TIMES,
  MOCK_CONTACTS,
  CONTRIBUTION_BADGES
} from './mockData.js';
import { adapters, listService, timelineService, sharingService, contributionService } from './services.js';

const FEATURE_FLAGS = {
  streetMode: true,
  savedLists: true,
  indoorMaps: true,
  popularTimes: true,
  timeline: true,
  incognito: true,
  locationSharing: true,
  communityGuides: true,
  mockDataMode: true
};

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

const state = {
  selectedCartesian: null,
  incognito: sessionStorage.getItem('map_lab_incognito') === '1',
  streetHeading: 0,
  savedLists: listService.get(DEFAULT_PLACE_LISTS),
  contributions: contributionService.get(),
  panoramaYearIndex: 0
};

const dom = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  cityButtons: document.querySelectorAll('[data-city-lon][data-city-lat]'),
  panelToggle: document.getElementById('panelToggle'),
  labPanel: document.getElementById('labPanel'),
  infoText: document.getElementById('infoText'),
  incognitoToggle: document.getElementById('incognitoToggle'),
  privacyStatus: document.getElementById('privacyStatus'),

  streetModeBtn: document.getElementById('streetModeBtn'),
  enterStreetViewBtn: document.getElementById('enterStreetViewBtn'),
  streetOverlay: document.getElementById('streetOverlay'),
  streetExitBtn: document.getElementById('streetExitBtn'),
  streetPanorama: document.getElementById('streetPanorama'),
  panLeftBtn: document.getElementById('panLeftBtn'),
  panRightBtn: document.getElementById('panRightBtn'),
  streetYearSlider: document.getElementById('streetYearSlider'),
  streetYearLabel: document.getElementById('streetYearLabel'),

  saveCurrentPlaceBtn: document.getElementById('saveCurrentPlaceBtn'),
  newListName: document.getElementById('newListName'),
  createListBtn: document.getElementById('createListBtn'),
  savedLists: document.getElementById('savedLists'),

  indoorLocationSelect: document.getElementById('indoorLocationSelect'),
  indoorFloorSelect: document.getElementById('indoorFloorSelect'),
  indoorSearch: document.getElementById('indoorSearch'),
  indoorFindBtn: document.getElementById('indoorFindBtn'),
  indoorResult: document.getElementById('indoorResult'),

  popularTimesType: document.getElementById('popularTimesType'),
  renderPopularTimesBtn: document.getElementById('renderPopularTimesBtn'),
  popularTimesGraph: document.getElementById('popularTimesGraph'),

  timelineBtn: document.getElementById('timelineBtn'),
  pauseTimelineBtn: document.getElementById('pauseTimelineBtn'),
  deleteTimelineBtn: document.getElementById('deleteTimelineBtn'),
  exportTimelineBtn: document.getElementById('exportTimelineBtn'),
  timelineList: document.getElementById('timelineList'),

  sharingBtn: document.getElementById('sharingBtn'),
  shareContactSelect: document.getElementById('shareContactSelect'),
  shareDurationSelect: document.getElementById('shareDurationSelect'),
  startShareBtn: document.getElementById('startShareBtn'),
  shareSessions: document.getElementById('shareSessions'),

  guidesBtn: document.getElementById('guidesBtn'),
  contribType: document.getElementById('contribType'),
  contribText: document.getElementById('contribText'),
  submitContribBtn: document.getElementById('submitContribBtn'),
  contribScore: document.getElementById('contribScore'),
  contribList: document.getElementById('contribList')
};

function setPrivacyStatus() {
  dom.incognitoToggle.checked = state.incognito;
  dom.privacyStatus.textContent = state.incognito
    ? 'Incognito active: searches and movement are session-private.'
    : 'Private history enabled (local-first timeline).';
}

function maybeLogTimeline(event) {
  if (!FEATURE_FLAGS.timeline || state.incognito) return;
  timelineService.add(event);
  renderTimeline();
}

function getPickCartesian(position) {
  const ray = viewer.camera.getPickRay(position);
  return viewer.scene.globe.pick(ray, viewer.scene) || viewer.camera.pickEllipsoid(position);
}

function updateInfoCard(cartesian) {
  const c = Cesium.Cartographic.fromCartesian(cartesian);
  const lat = Cesium.Math.toDegrees(c.latitude).toFixed(5);
  const lon = Cesium.Math.toDegrees(c.longitude).toFixed(5);
  const elev = (viewer.scene.globe.getHeight(c) ?? 0).toFixed(1);
  dom.infoText.textContent = `Lat ${lat}, Lon ${lon}, Elev ${elev}m`;
}

async function flyToQuery(query) {
  const raw = query.trim();
  if (!raw) return;

  const parts = raw.split(',').map((x) => Number(x.trim()));
  if (parts.length === 2 && parts.every((x) => !Number.isNaN(x))) {
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(parts[1], parts[0], 4500), duration: 1.8 });
    maybeLogTimeline({ type: 'search_coords', value: raw, at: new Date().toISOString(), mode: 'map' });
    return;
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', raw);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  const [result] = await response.json();
  if (!result) throw new Error('No search result found.');

  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(Number(result.lon), Number(result.lat), 4500), duration: 1.8 });
  maybeLogTimeline({ type: 'search_place', value: raw, at: new Date().toISOString(), mode: 'map' });
}

function renderStreetMode() {
  const stateDef = STREET_HISTORY_STATES[state.panoramaYearIndex];
  dom.streetYearLabel.textContent = `Year: ${stateDef.year} (${stateDef.label})`;
  dom.streetPanorama.style.background = `conic-gradient(from ${state.streetHeading}deg, #1d2f4d, #27486f, #396ea1, #1d2f4d)`;
  dom.streetPanorama.textContent = `Mock 360° pano · ${stateDef.year}`;
}

function enterStreetMode() {
  if (!FEATURE_FLAGS.streetMode) return;
  if (!state.selectedCartesian) {
    alert('Select a map point first.');
    return;
  }
  dom.streetOverlay.classList.remove('hidden');
  renderStreetMode();
  maybeLogTimeline({ type: 'street_mode_enter', at: new Date().toISOString(), mode: 'walk' });
}

function exitStreetMode() {
  dom.streetOverlay.classList.add('hidden');
}

function persistLists() {
  listService.save(state.savedLists);
}

function renderSavedLists() {
  dom.savedLists.innerHTML = '';
  state.savedLists.forEach((list, listIndex) => {
    const li = document.createElement('li');
    const header = document.createElement('div');
    header.className = 'route-row';

    const title = document.createElement('strong');
    title.textContent = list.name;

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', () => {
      const name = prompt('Rename list:', list.name);
      if (!name) return;
      state.savedLists[listIndex].name = name;
      persistLists();
      renderSavedLists();
    });

    header.append(title, renameBtn);
    li.append(header);

    const ul = document.createElement('ul');
    list.items.forEach((item, itemIndex) => {
      const row = document.createElement('li');
      row.textContent = `${item.name} (${item.tag || 'tagless'}) — ${item.note || 'no note'}`;

      const upBtn = document.createElement('button');
      upBtn.textContent = '↑';
      upBtn.addEventListener('click', () => {
        if (itemIndex === 0) return;
        [list.items[itemIndex - 1], list.items[itemIndex]] = [list.items[itemIndex], list.items[itemIndex - 1]];
        persistLists();
        renderSavedLists();
      });

      row.append(' ', upBtn);
      ul.append(row);
    });
    li.append(ul);
    dom.savedLists.append(li);
  });
}

function saveCurrentPlaceToList() {
  if (!FEATURE_FLAGS.savedLists) return;
  if (!state.selectedCartesian) {
    alert('Select a place on the map first.');
    return;
  }

  const listName = prompt('Save to which list? (type list name)', state.savedLists[0]?.name || 'Favorite Brunch Spots');
  if (!listName) return;

  const list = state.savedLists.find((x) => x.name === listName) || state.savedLists[0];
  const carto = Cesium.Cartographic.fromCartesian(state.selectedCartesian);
  const name = prompt('Place title:', 'Pinned place');
  const note = prompt('Note:', '');
  const tag = prompt('Tag:', 'general');

  list.items.push({
    id: `p_${Date.now()}`,
    name: name || 'Pinned place',
    note,
    tag,
    lat: Cesium.Math.toDegrees(carto.latitude),
    lon: Cesium.Math.toDegrees(carto.longitude),
    sharedWith: ['mock_friend_a']
  });

  persistLists();
  renderSavedLists();
  maybeLogTimeline({ type: 'save_place', value: name || 'Pinned place', at: new Date().toISOString(), mode: 'map' });
}

function initIndoorDemo() {
  MOCK_INDOOR_LOCATIONS.forEach((location) => {
    const option = document.createElement('option');
    option.value = location.id;
    option.textContent = location.name;
    dom.indoorLocationSelect.append(option);
  });
  refreshIndoorFloors();
}

function refreshIndoorFloors() {
  const location = MOCK_INDOOR_LOCATIONS.find((x) => x.id === dom.indoorLocationSelect.value) || MOCK_INDOOR_LOCATIONS[0];
  dom.indoorFloorSelect.innerHTML = '';
  location.floors.forEach((floor) => {
    const option = document.createElement('option');
    option.value = floor.id;
    option.textContent = floor.name;
    dom.indoorFloorSelect.append(option);
  });
}

function runIndoorSearch() {
  const location = MOCK_INDOOR_LOCATIONS.find((x) => x.id === dom.indoorLocationSelect.value) || MOCK_INDOOR_LOCATIONS[0];
  const floor = location.floors.find((x) => x.id === dom.indoorFloorSelect.value) || location.floors[0];
  const query = dom.indoorSearch.value.trim().toLowerCase();
  const match = floor.rooms.find((room) => room.toLowerCase().includes(query));
  dom.indoorResult.textContent = match
    ? `Path highlighted in mock indoor graph: Entrance → ${match} (${floor.name})`
    : `No direct match. Suggested path: Entrance → Info Desk (${floor.name})`;
}

function renderPopularTimes() {
  const key = dom.popularTimesType.value;
  const values = MOCK_POPULAR_TIMES[key] || [];
  dom.popularTimesGraph.innerHTML = '';
  const current = values[new Date().getHours() % values.length] ?? 0;

  values.forEach((value) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${value}%`;
    bar.title = `${value}% busy`;
    dom.popularTimesGraph.append(bar);
  });

  const wait = current > 75 ? 'High wait' : current > 50 ? 'Moderate wait' : 'Low wait';
  dom.indoorResult.textContent = `Current busyness: ${current}% · ${wait}`;
}

function renderTimeline() {
  const entries = timelineService.get();
  dom.timelineList.innerHTML = '';
  entries.slice(0, 20).forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.at} · ${entry.type} · ${entry.mode || 'unknown'}`;
    dom.timelineList.append(li);
  });
  dom.pauseTimelineBtn.textContent = timelineService.isPaused() ? 'Resume tracking' : 'Pause tracking';
}

function initSharing() {
  MOCK_CONTACTS.forEach((contact) => {
    const option = document.createElement('option');
    option.value = contact.id;
    option.textContent = contact.name;
    dom.shareContactSelect.append(option);
  });
  renderSharingSessions();
}

function renderSharingSessions() {
  const sessions = sharingService.getSessions();
  dom.shareSessions.innerHTML = '';
  sessions.forEach((session) => {
    const li = document.createElement('li');
    li.textContent = `${session.contactName} · ${session.durationMin} min · ETA ${session.eta} · Battery ${session.battery}%`;
    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.addEventListener('click', () => {
      sharingService.stop(session.id);
      renderSharingSessions();
    });
    li.append(' ', stopBtn);
    dom.shareSessions.append(li);
  });
}

function renderContributions() {
  dom.contribList.innerHTML = '';
  state.contributions.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.type}: ${entry.text} · ${entry.status}`;
    dom.contribList.append(li);
  });

  const points = state.contributions.length * 2;
  const badge = [...CONTRIBUTION_BADGES].reverse().find((x) => points >= x.threshold)?.badge || 'New';
  dom.contribScore.textContent = `Points: ${points} · Badge: ${badge}`;
}

function bindEvents() {
  dom.panelToggle.addEventListener('click', () => dom.labPanel.classList.toggle('open'));
  dom.searchBtn.addEventListener('click', () => flyToQuery(dom.searchInput.value).catch((e) => alert(e.message)));
  dom.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dom.searchBtn.click();
  });

  dom.cityButtons.forEach((button) => {
    button.addEventListener('click', () => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(Number(button.dataset.cityLon), Number(button.dataset.cityLat), 6000),
        duration: 1.6
      });
      maybeLogTimeline({ type: 'preset_jump', value: button.textContent, at: new Date().toISOString(), mode: 'map' });
    });
  });

  const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  clickHandler.setInputAction((movement) => {
    const cartesian = getPickCartesian(movement.position);
    if (!cartesian) return;
    state.selectedCartesian = cartesian;
    updateInfoCard(cartesian);
    maybeLogTimeline({ type: 'map_select', at: new Date().toISOString(), mode: 'map' });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  dom.incognitoToggle.addEventListener('change', () => {
    state.incognito = dom.incognitoToggle.checked;
    sessionStorage.setItem('map_lab_incognito', state.incognito ? '1' : '0');
    setPrivacyStatus();
  });

  dom.streetModeBtn.addEventListener('click', enterStreetMode);
  dom.enterStreetViewBtn.addEventListener('click', enterStreetMode);
  dom.streetExitBtn.addEventListener('click', exitStreetMode);
  dom.panLeftBtn.addEventListener('click', () => {
    state.streetHeading -= 30;
    renderStreetMode();
  });
  dom.panRightBtn.addEventListener('click', () => {
    state.streetHeading += 30;
    renderStreetMode();
  });
  dom.streetYearSlider.addEventListener('input', () => {
    state.panoramaYearIndex = Number(dom.streetYearSlider.value);
    renderStreetMode();
  });

  dom.createListBtn.addEventListener('click', () => {
    const name = dom.newListName.value.trim();
    if (!name) return;
    state.savedLists.push({ id: `list_${Date.now()}`, name, items: [] });
    dom.newListName.value = '';
    persistLists();
    renderSavedLists();
  });
  dom.saveCurrentPlaceBtn.addEventListener('click', saveCurrentPlaceToList);

  dom.indoorLocationSelect.addEventListener('change', refreshIndoorFloors);
  dom.indoorFindBtn.addEventListener('click', runIndoorSearch);

  dom.renderPopularTimesBtn.addEventListener('click', renderPopularTimes);

  dom.timelineBtn.addEventListener('click', () => dom.labPanel.classList.add('open'));
  dom.pauseTimelineBtn.addEventListener('click', () => {
    timelineService.setPaused(!timelineService.isPaused());
    renderTimeline();
  });
  dom.deleteTimelineBtn.addEventListener('click', () => {
    timelineService.clear();
    renderTimeline();
  });
  dom.exportTimelineBtn.addEventListener('click', () => {
    const blob = new Blob([timelineService.export()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline-export.json';
    a.click();
  });

  dom.sharingBtn.addEventListener('click', () => dom.labPanel.classList.add('open'));
  dom.startShareBtn.addEventListener('click', () => {
    const contact = MOCK_CONTACTS.find((x) => x.id === dom.shareContactSelect.value) || MOCK_CONTACTS[0];
    sharingService.start({
      id: `share_${Date.now()}`,
      contactId: contact.id,
      contactName: contact.name,
      durationMin: Number(dom.shareDurationSelect.value),
      eta: `${Math.floor(Math.random() * 25 + 8)} min`,
      battery: Math.floor(Math.random() * 40 + 55)
    });
    renderSharingSessions();
  });

  dom.guidesBtn.addEventListener('click', () => dom.labPanel.classList.add('open'));
  dom.submitContribBtn.addEventListener('click', () => {
    const text = dom.contribText.value.trim();
    if (!text) return;
    const entry = {
      id: `contrib_${Date.now()}`,
      type: dom.contribType.value,
      text,
      status: 'pending',
      at: new Date().toISOString(),
      moderation: adapters.contributionsProvider
    };
    contributionService.add(entry);
    state.contributions = contributionService.get();
    dom.contribText.value = '';
    renderContributions();
  });
}

function initialize() {
  setPrivacyStatus();
  renderSavedLists();
  initIndoorDemo();
  renderPopularTimes();
  renderTimeline();
  initSharing();
  renderContributions();
  bindEvents();
}

initialize();
