import { initMap, addRoutes, addStops, add3DBuildings, updateMarker, removeInactiveMarkers, getMap, setFollowBusId, getFollowBusId } from './map.js';
import { setupControls, updateSidebar, calculateETA, checkAlerts, switchTab, closeImage } from './ui.js';
import { updateStatusConfig, GAS_ALERT_THRESHOLD, getBusStatus } from './status.js';

fetch('/api/config')
    .then(r => r.json())
    .then(config => { updateStatusConfig(config); })
    .catch(() => { });

const map = initMap();
map.on('load', () => {
    addRoutes();
    try { add3DBuildings(); } catch (e) { }
    addStops();

    const removeLoading = () => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            loadingScreen.classList.add('hidden');
        }
    };

    setTimeout(removeLoading, 300);

    setTimeout(removeLoading, 3000);

    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    if (skeletonLoader) skeletonLoader.classList.remove('hidden');
    if (emptyState) emptyState.style.display = 'none';


    const socket = io();

    socket.on('update_bus', (bus) => {
        updateMarker(bus);

        const list = document.getElementById('bus-list');
        const existingItem = document.getElementById(`bus-item-${bus.bus_id}`);

        if (existingItem) {
            const busStatus = getBusStatus(bus);
            let statusDot = busStatus.class;
            if (bus.gas_level > GAS_ALERT_THRESHOLD) statusDot = 'dot-red';
            const gasClass = bus.gas_level > GAS_ALERT_THRESHOLD ? 'text-danger' : '';
            const eta = calculateETA(bus);

            existingItem.innerHTML = `
                <div class="bus-icon-wrapper"><img src="./images/bipol.png"></div>
                <div class="bus-info">
                    <h4>${bus.bus_id} <span class="status-dot ${statusDot}"></span> <span class="eta-inline"><i class="fa-solid ${eta.icon}"></i> ${eta.text}</span></h4>
                    <p><span><i class="fa-solid ${busStatus.icon}"></i> ${busStatus.status}</span> &bull;
                    <span><i class="fa-solid fa-gauge"></i> ${bus.speed} km/h</span> &bull;
                    <span class="${gasClass}"><i class="fa-solid fa-fire"></i> ${bus.gas_level}</span></p>
                </div>`;

            existingItem.onclick = () => {
                if (getFollowBusId() === bus.bus_id) return;
                setFollowBusId(bus.bus_id);
                if (getMap()) getMap().flyTo({ center: [bus.longitude, bus.latitude], zoom: 18, speed: 1.5 });
                document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active-focus'));
                existingItem.classList.add('active-focus');
            };
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
                if (getFollowBusId() === bus.bus_id) return;
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

    map.on('dragstart', () => {
        setFollowBusId(null);
        const popup = document.querySelector('.maplibregl-popup');
        if (popup) popup.remove();
    });
    map.on('touchmove', () => {
        setFollowBusId(null);
        const popup = document.querySelector('.maplibregl-popup');
        if (popup) popup.remove();
    });
});
setupControls();

document.addEventListener('keydown', function (event) {
    if (event.key === "Escape") {
        closeImage();
    }
});

async function fetchData() {
    try {
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
        data.forEach((bus, index) => {
            activeIds.add(bus.bus_id);
            updateMarker(bus);
            updateSidebar(bus, list, index);
            calculateETA(bus);
            checkAlerts(bus);

            if (getFollowBusId() === bus.bus_id) {
                if (getMap()) getMap().flyTo({ center: [bus.longitude, bus.latitude], speed: 0.5 });
            }
        });

        const summaryEl = document.getElementById('collapsed-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `<i class="fa-solid fa-bus"></i> ${activeIds.size} Armada Aktif`;
        }

        removeInactiveMarkers(activeIds);

    } catch (e) { }
}

async function fetchInfo() {
    try {
        const res = await fetch('/api/info');
        const data = await res.json();

        const listContainer = document.getElementById('dynamic-info-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        const lostItemDiv = document.createElement('div');
        lostItemDiv.className = 'info-card';

        lostItemDiv.innerHTML = `
            <div class="info-icon"><i class="fa-solid fa-box-open"></i></div>
            <div class="info-text">
                <div style="font-size:0.75em; color:#64748b; margin-bottom:4px; font-weight:500;">
                    <i class="fa-solid fa-thumbtack" style="transform:rotate(45deg); margin-right:4px;"></i> Tersemat
                </div>
                <h4>Barang Ketinggalan?</h4>
                <p>Lapor segera melalui fitur lost & found kami.</p>
                <button onclick="goToLostItems()" style="margin-top:10px; background:var(--accent); color:white; border:none; padding:8px 16px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-weight:500; display:inline-flex; align-items:center; gap:6px;">
                    Lapor Sekarang <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(lostItemDiv);

        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'info-card';

        feedbackDiv.innerHTML = `
            <div class="info-icon"><i class="fa-solid fa-code"></i></div>
            <div class="info-text">
                <div style="font-size:0.75em; color:#64748b; margin-bottom:4px; font-weight:500;">
                    <i class="fa-solid fa-thumbtack" style="transform:rotate(45deg); margin-right:4px;"></i> Tersemat
                </div>
                <h4>Temukan Bug / Saran?</h4>
                <p>Bantu kami kembangkan aplikasi ini jadi lebih baik.</p>
                <button onclick="goToFeedback()" style="margin-top:10px; background:#475569; color:white; border:none; padding:8px 16px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-weight:500; display:inline-flex; align-items:center; gap:6px;">
                    Beri Masukan <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(feedbackDiv);

        window.goToLostItems = function () {
            if (window.switchTab) window.switchTab('faq');
            setTimeout(() => {
                const el = document.querySelector('.lost-items-section');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        };

        window.goToFeedback = function () {
            if (window.switchTab) window.switchTab('faq');
            setTimeout(() => {
                const el = document.querySelector('.feedback-section');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        };

        if (data.length === 0) {
            return;
        }

        data.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            const div = document.createElement('div');

            div.className = 'info-card';
            div.innerHTML = `
                <div class="info-icon"><i class="fa-solid fa-bullhorn"></i></div>
                <div class="info-text">
                    <h4>${item.title}</h4>
                    <p>${item.content}</p>
                    <div style="font-size:0.75em; color:#888; margin-top:5px;"><i class="fa-regular fa-clock"></i> ${date}</div>
                </div>
            `;
            listContainer.appendChild(div);
        });

    } catch (e) { }
}

fetchData();
fetchInfo();
