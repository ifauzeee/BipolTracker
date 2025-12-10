import { initMap, addRoutes, addStops, add3DBuildings, updateMarker, removeInactiveMarkers, getMap, setFollowBusId, getFollowBusId } from './map.js';
import { setupControls, updateSidebar, calculateETA, checkAlerts, switchTab, closeImage } from './ui.js';

const map = initMap();
map.on('load', () => {
    addRoutes();
    try { add3DBuildings(); } catch (e) { console.error("3D Buildings error", e); }
    addStops();

    document.getElementById('skeleton-loader').classList.remove('hidden');
    document.getElementById('empty-state').style.display = 'none';

    fetchData();

    const socket = io();

    socket.on('connect', () => {
        console.log('[SOCKET] Connected!');
    });

    socket.on('update_bus', (bus) => {
        console.log('[SOCKET] New Data:', bus);

        updateMarker(bus);

        const list = document.getElementById('bus-list');
        const existingItem = document.getElementById(`bus-item-${bus.bus_id}`);

        if (existingItem) {
            const statusDot = bus.speed < 1 ? 'dot-gray' : 'dot-green';
            const gasClass = bus.gas_level > 600 ? 'status-text-danger' : '';

            existingItem.innerHTML = `
                <div class="bus-icon-wrapper"><img src="./images/bipol.png"></div>
                <div class="bus-info">
                    <h4>${bus.bus_id} <span class="status-dot ${statusDot}"></span></h4>
                    <p><span><i class="fa-solid fa-gauge"></i> ${bus.speed} km/h</span> &bull;
                    <span class="${gasClass}"><i class="fa-solid fa-fire"></i> ${bus.gas_level}</span></p>
                </div>`;

        } else {
            const item = document.createElement('div');
            item.className = 'bus-item';
            item.id = `bus-item-${bus.bus_id}`;

            let statusDot = bus.speed < 1 ? 'dot-gray' : 'dot-green';
            item.innerHTML = `
                <div class="bus-icon-wrapper"><img src="./images/bipol.png"></div>
                <div class="bus-info">
                    <h4>${bus.bus_id} <span class="status-dot ${statusDot}"></span></h4>
                    <p><span><i class="fa-solid fa-gauge"></i> ${bus.speed} km/h</span> &bull;
                    <span><i class="fa-solid fa-fire"></i> ${bus.gas_level}</span></p>
                </div>`;

            item.onclick = () => {
                setFollowBusId(bus.bus_id);
                if (getMap()) getMap().flyTo({ center: [bus.longitude, bus.latitude], zoom: 17.5 });
                document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active-focus'));
                item.classList.add('active-focus');
            };
            list.appendChild(item);
        }

        calculateETA(bus);
        checkAlerts(bus);

        if (getFollowBusId() === bus.bus_id) {
            if (getMap()) getMap().flyTo({ center: [bus.longitude, bus.latitude], speed: 0.5 });
        }

        document.getElementById('skeleton-loader').classList.add('hidden');
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('empty-state').style.display = 'none';
    });

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

        const list = document.getElementById('bus-list');
        const skeleton = document.getElementById('skeleton-loader');
        const emptyState = document.getElementById('empty-state');

        skeleton.classList.add('hidden');
        skeleton.style.display = 'none';

        if (data.length === 0) {
            emptyState.style.display = 'flex';
            emptyState.classList.remove('hidden');

            Array.from(list.children).forEach(c => {
                if (!c.classList.contains('skeleton-loader') && !c.classList.contains('empty-state')) c.remove();
            });
            return;
        } else {
            emptyState.style.display = 'none';
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
