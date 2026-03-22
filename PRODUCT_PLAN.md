# Personal Mobility OS — Product Plan

## 1) Refined app concept

**Concept:** A 3D-first personal mobility operating system (not a generic map clone) that helps one user make better trip decisions across modes, constraints, and contexts.

**Core promise:**
- Compare modes and routes quickly.
- See traffic and friction at a glance.
- Optimize for what matters *right now* (speed, energy, simplicity, cost).
- Stay useful in low-signal/offline scenarios with explicit online/offline boundaries.

**Differentiator:**
- One 3D map renderer + modular decision tools (mode compare, traffic intelligence, personal memory, multi-stop optimizer, glanceable guidance).
- Personal preference model (“least annoying”, “lowest stress”, “post-shift mode”) layered on top of routing infrastructure.

---

## 2) Feature architecture: MVP vs V2 vs Advanced

## MVP (prototype + practical utility)

1. **Multi-modal route compare (UI + API-backed where possible)**
   - Modes: driving, walking, biking, transit, motorcycle, rideshare-estimate.
   - Cards show ETA, distance, rough cost, transfers (transit), and confidence indicator.
2. **Traffic readability layer**
   - Road color coding (green/yellow/red/dark red).
   - Basic incident markers (closures/crashes) if provider data is available.
3. **Route objective presets**
   - Fastest / simplest / least tolls / lowest energy (simplified model).
4. **Multi-stop trip builder (basic)**
   - Add/reorder stops.
5. **Glance bar navigation panel**
   - Next maneuver, ETA, arrival time, reroute trigger.
6. **Offline pack manager (MVP constraints)**
   - Download area + saved places + last routes.
   - Explicitly mark “traffic/transit live updates unavailable offline”.

## V2 (high-value intelligence)

1. **Energy-aware routing model**
   - Gas/diesel/hybrid/EV profiles.
   - EV route confidence (range buffer + charger dependency risk).
2. **Transit detail expansion**
   - Bus/train/subway distinctions, transfer friction score.
3. **Departure/arrival-time planning**
   - Quality estimate by time window.
4. **Personal route memory engine**
   - Track chosen vs suggested route outcomes.
   - “Usually best for me at this time/day” suggestions.
5. **Incident context panel**
   - Severity, expected delay, reroute recommendation.

## Advanced / future

1. **Probabilistic route simulation** (arrival-time reliability envelopes).
2. **Campus/hospital indoor-adjacent wayfinding hooks** (if partner data exists).
3. **Adaptive recommendation model** (preference learning + confidence score).
4. **Voice workflows** (hands-free pin/note/reroute).
5. **Collaborative fleet/team mode** (for operations scenarios).

---

## 3) Clean information architecture (IA)

## Global layout
- **Top command bar:** search, mode switch, objective preset.
- **Left decision panel:** route alternatives, multi-stop editor, filter toggles.
- **Map canvas (center):** 2D/3D adaptive view with traffic + incidents.
- **Right contextual panel:** selected route details, energy/cost breakdown, transit transfers.
- **Bottom glance strip:** live maneuver + ETA + arrival + status.

## Primary IA sections
1. Search & Places
2. Routes & Modes
3. Traffic & Incidents
4. Energy & Cost
5. Offline Packs
6. Personal Memory
7. Settings (vehicle profile, notification thresholds)

---

## 4) Key screens to build first

1. **Home / Command Screen**
   - Search + quick presets + recent places.
2. **Route Compare Screen**
   - 3–5 alternative cards across selected modes.
3. **Navigation Screen (Glanceable)**
   - Large maneuver UI, high-contrast ETA, minimal distractions.
4. **Trip Builder Screen**
   - Multi-stop sequencing + stop reordering.
5. **Offline Manager Screen**
   - Downloaded regions, storage budget, feature-availability matrix.

---

## 5) 3D interactions that feel advanced (and useful)

1. **Adaptive camera by context**
   - City-level pitched 3D in dense zones; flatter tactical view at high speed.
2. **Traffic extrusion ribbons**
   - Slight road-height/brightness changes by congestion severity.
3. **Maneuver focus bubble**
   - Temporary camera focus near next complex turn/interchange.
4. **Route confidence shading**
   - Segment-level uncertainty overlay (especially for traffic forecasts).
5. **Mode-transition animation**
   - Smooth visual transition when switching drive ↔ walk ↔ transit.

---

## 6) Practical use cases

## Commuting
- Compare fastest vs least stressful route in <10 seconds.
- Pick departure time with best arrival reliability.

## Errands
- Add 4–8 stops and auto-reorder by least total time or least backtracking.
- Use “simplicity mode” to reduce difficult turns.

## Hospital work
- Fast parking + entrance routing, post-shift low-cognitive mode.
- Quick fallback routing when signal quality drops.

## Campus use
- Multi-modal transitions (walk + shuttle + transit).
- Time-to-building confidence around class change peaks.

## Road trips
- EV route confidence + charging risk visibility.
- Offline regions preloaded with explicit limits.

---

## 7) Required data layers

1. Base map + road graph
2. Real-time traffic speeds + incidents + closures
3. Transit GTFS/real-time feeds (where available)
4. Routing engine outputs (multi-modal + alternatives)
5. Elevation/terrain + slope context (for energy routing)
6. EV charging POIs + availability (if available)
7. Fuel prices (optional, regional)
8. Offline vector/raster tile packs + geocoder index
9. User private layers (saved places, route history, notes)

---

## 8) Technical considerations (prototype vs production)

## Mostly frontend/prototype-able
- Mode tabs, compare cards, objective toggles
- Multi-stop UI/reorder
- Glanceable nav shell
- 3D camera behaviors
- Offline manager UX shell
- Simulated traffic/ETA for demos

## Requires backend + licensed/provider data
- Accurate multi-modal routing at scale
- Real-time traffic and incident truth
- Transit schedules/realtime reliability
- Rideshare ETAs/cost realism
- EV charging status + availability
- Production geocoding + place search quality

## Architecture guidance
- Keep provider adapters behind a clean service layer:
  - `routingProvider`
  - `trafficProvider`
  - `transitProvider`
  - `placesProvider`
  - `offlinePackProvider`
- Use feature flags to degrade gracefully by region/provider availability.

## Offline vs real-time tension (explicit policy)
- Offline mode: local tiles + local search index + cached routes + saved places.
- Online-only: live traffic, incidents, dynamic transit predictions.
- UI must clearly label stale vs live data states.

---

## 9) UX suggestions to avoid clutter

1. **Progressive disclosure**
   - Show only 3 key metrics by default (ETA, distance, confidence).
2. **Mode-aware defaults**
   - Driving shows traffic severity first; transit shows transfers first.
3. **One-tap objective chips**
   - Fastest / Simplest / Lowest Energy / Lowest Cost.
4. **Compact + Expanded route cards**
   - Keep list readable; details on demand.
5. **Focus mode while navigating**
   - Hide non-essential layers and controls.
6. **Data trust indicators**
   - “Live”, “Predicted”, “Cached”, “Offline” badges everywhere relevant.

---

## 10) Product vision + positioning

## Vision statement
A premium personal mobility operating system that turns complex movement decisions into clear, confidence-ranked choices across modes, traffic conditions, and real-life constraints.

## Positioning summary
Not a map clone. A decision engine on top of a 3D map: personal, modular, context-aware, and honest about live-data vs offline limits.
