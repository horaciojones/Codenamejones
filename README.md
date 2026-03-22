# Earth Digital Twin — Personal Map Laboratory

A Cesium-based 3D map prototype focused on exploration, personal intelligence, and privacy-first behavior layers.

## What this build now includes

- **Exploration & Discovery modules**
  - Street View-style immersive ground mode (mock 360 pano + historical year slider).
  - Saved places in custom lists with notes/tags and reorder scaffolding.
  - Indoor map demo with floor switching and room/path highlighting.
  - Popular times / busyness visual graph with realistic mock patterns.

- **Personalization & Privacy modules**
  - Local-first personal timeline with pause/delete/export controls.
  - Session-based incognito mode respected by timeline/search logging.
  - Trusted-contact location sharing mock flow with duration and stop-sharing controls.
  - Local guides contribution system with moderation states and reputation badges.

- **Architecture and extensibility**
  - Feature flags in `app.js` for module-level experimentation.
  - Dedicated mock data models in `mockData.js`.
  - Service/data adapter scaffold in `services.js` for easy swap to real APIs.

## Run

```bash
./run-local.sh
```

Open:

- <http://localhost:8080>

## Notes

- This is a serious prototype scaffold using mock data where proprietary/live datasets are unavailable.
- `services.js` marks adapter boundaries for future real integrations (routing, street imagery, indoor, sharing, community).
- See `PRODUCT_PLAN.md` for phased product roadmap and infrastructure strategy.
