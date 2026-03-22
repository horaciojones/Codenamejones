const KEYS = {
  lists: 'map_lab_lists_v1',
  timeline: 'map_lab_timeline_v1',
  sharing: 'map_lab_sharing_v1',
  contributions: 'map_lab_contrib_v1',
  timelinePaused: 'map_lab_timeline_paused_v1'
};

function read(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const adapters = {
  // Replace with real external adapters in production.
  routingProvider: 'mock-routing-adapter',
  streetImageryProvider: 'mock-street-imagery-adapter',
  indoorProvider: 'mock-indoor-adapter',
  sharingProvider: 'mock-sharing-adapter',
  contributionsProvider: 'mock-community-adapter'
};

export const listService = {
  get(defaults) {
    const existing = read(KEYS.lists, defaults);
    return existing.length ? existing : defaults;
  },
  save(lists) {
    write(KEYS.lists, lists);
  }
};

export const timelineService = {
  get() {
    return read(KEYS.timeline, []);
  },
  add(event) {
    if (this.isPaused()) return;
    const current = this.get();
    current.unshift(event);
    write(KEYS.timeline, current.slice(0, 500));
  },
  clear() {
    write(KEYS.timeline, []);
  },
  export() {
    return JSON.stringify(this.get(), null, 2);
  },
  setPaused(paused) {
    write(KEYS.timelinePaused, paused);
  },
  isPaused() {
    return read(KEYS.timelinePaused, false);
  }
};

export const sharingService = {
  getSessions() {
    return read(KEYS.sharing, []);
  },
  start(session) {
    const sessions = this.getSessions();
    sessions.push(session);
    write(KEYS.sharing, sessions);
  },
  stop(sessionId) {
    const sessions = this.getSessions().filter((x) => x.id !== sessionId);
    write(KEYS.sharing, sessions);
  }
};

export const contributionService = {
  get() {
    return read(KEYS.contributions, []);
  },
  add(entry) {
    const items = this.get();
    items.unshift(entry);
    write(KEYS.contributions, items);
  }
};
