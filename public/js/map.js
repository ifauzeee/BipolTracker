import { stops, rutePagi, ruteSore, bounds } from './data.js';

let map;
let busMarkers = {};
let stopMarkers = [];
let followBusId = null;

export function getMap() {
    return map;
}

export function setFollowBusId(id) {
    followBusId = id;
}

export function getFollowBusId() {
    return followBusId;
}

export function initMap() {
    const styleUrl = 'https://tiles.openfreemap.org/styles/bright';
    map = new maplibregl.Map({
        container: 'map',
        style: styleUrl,
        attributionControl: false,
        bounds: bounds,
        fitBoundsOptions: { padding: { top: 40, bottom: 250, left: 20, right: 20 } },
        pitch: 0,
        bearing: 0,
        antialias: true
    });
    return map;
}

export function addRoutes() {
    if (!map.getSource('rutePagi')) {
        map.addSource('rutePagi', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: rutePagi } } });
        map.addLayer({
            id: 'rutePagiLayer', type: 'line', source: 'rutePagi',
            layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': 'visible' },
            paint: { 'line-color': '#BF1E2E', 'line-width': 5, 'line-opacity': 0.8 }
        });
    }

    if (!map.getSource('ruteSore')) {
        map.addSource('ruteSore', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: ruteSore } } });
        map.addLayer({
            id: 'ruteSoreLayer', type: 'line', source: 'ruteSore',
            layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': 'visible' },
            paint: { 'line-color': '#159BB3', 'line-width': 5, 'line-opacity': 0.8 }
        });
    }

    document.querySelectorAll('.chip').forEach(el => el.classList.add('active-route'));
    document.querySelectorAll('.route-card-item').forEach(el => el.classList.add('active-card'));
}

export function toggleRoute(layerIdObj, element) {
    if (!map) return;
    const layerId = layerIdObj + 'Layer';
    const visibility = map.getLayoutProperty(layerId, 'visibility');

    const newVisibility = (visibility === 'visible' || visibility === undefined) ? 'none' : 'visible';
    map.setLayoutProperty(layerId, 'visibility', newVisibility);

    const isVisible = newVisibility === 'visible';

    document.querySelectorAll(`.chip[onclick*="${layerIdObj}"]`).forEach(el => {
        if (isVisible) {
            el.classList.add('active-route');
            el.querySelector('i').className = 'fa-solid fa-check';
        } else {
            el.classList.remove('active-route');
            el.querySelector('i').className = 'fa-solid fa-xmark';
        }
    });
    const cardId = 'card-' + layerIdObj;
    const card = document.getElementById(cardId);
    if (card) {
        if (isVisible) {
            card.classList.add('active-card');
        } else {
            card.classList.remove('active-card');
        }
    }
}

export function addStops() {
    stopMarkers.forEach(m => m.remove());
    stopMarkers = [];
    stops.forEach(stop => {
        const el = document.createElement('div');
        el.style.backgroundImage = "url('https://png.pngtree.com/png-clipart/20230321/original/pngtree-bus-stop-vector-icon-design-illustration-png-image_8997806.png')";
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';

        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(new maplibregl.Popup({ offset: 25 }).setText(stop.title))
            .addTo(map);
        stopMarkers.push(marker);
    });
}

export function add3DBuildings() {
    const style = map.getStyle();
    if (!style || !style.sources) return;
    const vectorSource = Object.keys(style.sources).find(key => style.sources[key].type === 'vector');

    if (vectorSource && !map.getLayer('add-3d-buildings')) {
        map.addLayer({
            'id': 'add-3d-buildings',
            'source': vectorSource,
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 14,
            'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': ['coalesce', ['get', 'height'], 0],
                'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
                'fill-extrusion-opacity': 0.6
            }
        });
    }
}

const ANIMATION_DURATION = 3000;
let animationLoopStarted = false;

function easeLinear(t) { return t; }

function animateMarkers() {
    const now = performance.now();
    Object.keys(busMarkers).forEach(id => {
        const markerObj = busMarkers[id];
        if (!markerObj.isAnimating) return;

        const timeSinceStart = now - markerObj.startTime;
        let progress = timeSinceStart / ANIMATION_DURATION;

        if (progress >= 1) {
            progress = 1;
            markerObj.marker.setLngLat(markerObj.targetPos);
        } else {
            const currentLng = markerObj.startPos[0] + (markerObj.targetPos[0] - markerObj.startPos[0]) * easeLinear(progress);
            const currentLat = markerObj.startPos[1] + (markerObj.targetPos[1] - markerObj.startPos[1]) * easeLinear(progress);
            markerObj.marker.setLngLat([currentLng, currentLat]);
        }
    });
    requestAnimationFrame(animateMarkers);
}

export function updateMarker(bus) {
    const targetPos = [bus.longitude, bus.latitude];
    const gasClass = bus.gas_level > 600 ? 'popup-danger' : '';
    const statusText = bus.speed < 1 ? 'Berhenti' : 'Berjalan';
    const statusClass = bus.speed < 1 ? 'status-stopped' : 'status-moving';

    const content = `
        <div class="bus-popup">
            <div class="popup-header">
                <img src="./images/bipol.png" class="popup-icon">
                <div class="popup-title">
                    <h3>${bus.bus_id}</h3>
                    <span class="popup-status ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="popup-stats">
                <div class="popup-stat">
                    <i class="fa-solid fa-gauge"></i>
                    <span>${bus.speed} km/h</span>
                </div>
                <div class="popup-stat ${gasClass}">
                    <i class="fa-solid fa-fire"></i>
                    <span>${bus.gas_level}</span>
                </div>
            </div>
        </div>
    `;

    if (busMarkers[bus.bus_id]) {
        const markerObj = busMarkers[bus.bus_id];
        markerObj.startPos = markerObj.marker.getLngLat().toArray();
        markerObj.targetPos = targetPos;
        markerObj.startTime = performance.now();
        markerObj.isAnimating = true;
        markerObj.marker.getPopup().setHTML(content);

        if (getFollowBusId() === bus.bus_id && getMap()) {
            getMap().easeTo({ center: targetPos, duration: ANIMATION_DURATION, easing: easeLinear, zoom: 17.5 });
        }
    } else {
        const el = document.createElement('div');
        el.className = 'bus-marker-icon';
        el.style.backgroundImage = 'url(/images/bipol.png)';
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.cursor = 'pointer';
        el.style.willChange = 'transform';

        const pulse = document.createElement('div');
        pulse.className = 'marker-pulse';
        el.appendChild(pulse);

        el.onclick = () => {
            if (getFollowBusId() === bus.bus_id) return;
            setFollowBusId(bus.bus_id);
            getMap().flyTo({ center: targetPos, zoom: 17.5 });
            document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active-focus'));
        };

        const marker = new maplibregl.Marker({ element: el })
            .setLngLat(targetPos)
            .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(content))
            .addTo(map);

        busMarkers[bus.bus_id] = {
            marker: marker,
            startPos: targetPos,
            targetPos: targetPos,
            startTime: performance.now(),
            isAnimating: false
        };
    }

    if (!animationLoopStarted) {
        requestAnimationFrame(animateMarkers);
        animationLoopStarted = true;
    }
}

export function removeInactiveMarkers(activeIds) {
    Object.keys(busMarkers).forEach(id => {
        if (!activeIds.has(id)) {
            busMarkers[id].remove();
            delete busMarkers[id];
        }
    });
}

export function flyToBus(pos) {
    if (map) map.flyTo({ center: pos, speed: 0.5 });
}
