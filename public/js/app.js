import { initMap, addRoutes, addStops, add3DBuildings, updateMarker, removeInactiveMarkers, getMap, setFollowBusId, getFollowBusId } from './map.js';
import { setupControls, updateSidebar, calculateETA, checkAlerts, switchTab, closeImage } from './ui.js';

const map = initMap();

map.on('load', () => {
    addRoutes();
    try { add3DBuildings(); } catch (e) { console.error("3D Buildings error", e); }
    addStops();

    document.getElementById('skeleton-loader').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');

    fetchData();
    setInterval(fetchData, 3000);

    map.on('dragstart', () => { setFollowBusId(null); });
    map.on('touchmove', () => { setFollowBusId(null); });
});

setupControls();

document.addEventListener('keydown', function (event) {
    if (event.key === "Escape") {
        closeImage();
    }
});

async function fetchData() {
    try {
        console.debug('[CLIENT] fetchData() called');
        const res = await fetch('/api/bus/location');
        const json = await res.json();
        const data = json.data || [];
        console.debug('[CLIENT] /api/bus/location response:', data);

        const list = document.getElementById('bus-list');
        const skeleton = document.getElementById('skeleton-loader');
        const emptyState = document.getElementById('empty-state');

        skeleton.classList.add('hidden');

        if (data.length === 0) {
            emptyState.classList.remove('hidden');
            Array.from(list.children).forEach(c => {
                if (!c.classList.contains('skeleton-loader') && !c.classList.contains('empty-state')) c.remove();
            });
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        Array.from(list.children).forEach(c => {
            if (!c.classList.contains('skeleton-loader') && !c.classList.contains('empty-state')) c.remove();
        });

        const activeIds = new Set();
        data.forEach(bus => {
            activeIds.add(bus.bus_id);
            updateMarker(bus);
            updateSidebar(bus, list);
            calculateETA(bus);
            checkAlerts(bus);

            if (getFollowBusId() === bus.bus_id) {
                if (getMap()) getMap().flyTo({ center: [bus.longitude, bus.latitude], speed: 0.5 });
            }
        });

        removeInactiveMarkers(activeIds);

    } catch (e) { console.error('[CLIENT] fetchData error', e); }
}

fetchData();