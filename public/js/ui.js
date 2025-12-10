import { stops, bounds } from './data.js';
import { getMap, getFollowBusId, setFollowBusId, toggleRoute } from './map.js';

let lastAlert = 0;

export function setupControls() {
    document.getElementById('recenterBtn').onclick = () => {
        setFollowBusId(null);
        getMap().fitBounds(bounds, { padding: { top: 20, bottom: 180, left: 10, right: 10 }, pitch: 0, bearing: 0 });
        document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active-focus'));
    };
    
    window.toggleRouteCard = (layerIdObj) => {
        toggleRoute(layerIdObj, null);
    }
}

export function updateSidebar(bus, list) {
    const item = document.createElement('div');
    item.className = 'bus-item';
    if (getFollowBusId() === bus.bus_id) item.classList.add('active-focus');

    let statusDot = bus.speed < 1 ? 'dot-gray' : 'dot-green';
    if (bus.gas_level > 600) statusDot = 'dot-red';

    item.innerHTML = `
        <div class="bus-icon-wrapper"><img src="./images/bipol.png"></div>
        <div class="bus-info">
            <h4>${bus.bus_id} <span class="status-dot ${statusDot}"></span></h4>
            <p><span><i class="fa-solid fa-gauge"></i> ${bus.speed} km/h</span> &bull; <span><i class="fa-solid fa-fire"></i> ${bus.gas_level}</span></p>
        </div>`;

    item.onclick = () => {
        setFollowBusId(bus.bus_id);
        getMap().flyTo({ center: [bus.longitude, bus.latitude], zoom: 17.5, speed: 1.2 });
        document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active-focus'));
        item.classList.add('active-focus');
    };
    list.appendChild(item);
}

export function calculateETA(bus) {
    const from = turf.point([bus.longitude, bus.latitude]);
    let minDist = Infinity;
    let nearestStop = '';
    stops.forEach(stop => {
        const to = turf.point([stop.lng, stop.lat]);
        const dist = turf.distance(from, to, { units: 'kilometers' });
        if (dist < minDist) { minDist = dist; nearestStop = stop.title; }
    });
    const etaEl = document.getElementById('eta-display');
    const displaySpeed = (bus.speed && bus.speed > 1) ? bus.speed : 20;

    if (minDist < 0.05) {
        etaEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Tiba di ${nearestStop}`;
        etaEl.classList.remove('hidden');
    } else {
        const time = Math.ceil((minDist / displaySpeed) * 60);
        etaEl.innerHTML = `<i class="fa-solid fa-clock"></i> ${time} min ke ${nearestStop}`;
        etaEl.classList.remove('hidden');
    }
}

export function checkAlerts(bus) {
    if (bus.gas_level > 600 && Date.now() - lastAlert > 30000) {
        Swal.fire({ icon: 'warning', title: 'BAHAYA!', text: `Gas Tinggi: ${bus.gas_level}`, timer: 5000, background: '#BF1E2E', color: '#fff' });
        lastAlert = Date.now();
    }
}

export function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const navItem = document.querySelector(`.nav-item[onclick*="'${tab}'"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    const sheet = document.querySelector('.bottom-sheet');
    const infoPage = document.getElementById('info-page');
    const routeView = document.getElementById('route-view');

    if (tab === 'home') {
        sheet.classList.remove('hidden');
        infoPage.classList.remove('active-page');
        routeView.classList.remove('active-page');
        
        if (getFollowBusId()) {
            setFollowBusId(null);
            document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active-focus'));
        }
        
        getMap().fitBounds(bounds, { padding: { top: 20, bottom: 180, left: 10, right: 10 }, pitch: 0, bearing: 0 });
    } else if (tab === 'map') {
        sheet.classList.add('hidden');
        infoPage.classList.remove('active-page');
        routeView.classList.add('active-page');
        
        getMap().resize();
        
        getMap().fitBounds(bounds, { padding: { top: 50, bottom: 250, left: 20, right: 20 }, pitch: 0, bearing: 0 });
        
    } else if (tab === 'announcement') {
        sheet.classList.add('hidden');
        routeView.classList.remove('active-page');
        infoPage.classList.add('active-page');
    }
}

export function viewImage(src) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('img01');
    const captionText = document.getElementById('caption');

    modal.style.display = "block";
    modalImg.src = src;
}

export function closeImage() {
    const modal = document.getElementById('image-modal');
    modal.style.display = "none";
}

window.switchTab = switchTab;
window.viewImage = viewImage;
window.closeImage = closeImage;