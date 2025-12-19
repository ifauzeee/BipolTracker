import { stops, rutePagi, ruteSore, bounds } from './data.js';
import { calculateDistance, estimateArrival, formatTime, getCrowdConfig } from './utils.js';
import { getBusStatus, GAS_ALERT_THRESHOLD } from './status.js';
let map;
let busMarkers = {};
let stopMarkers = [];
let followBusId = null;
let animationLoopStarted = false;
const ANIMATION_DURATION = 1000;
const easeLinear = t => t;
export function getMap() {
    return map;
}
export function setFollowBusId(id) {
    followBusId = id;
}
export function getFollowBusId() {
    return followBusId;
}
export function closeAllPopups() {
    Object.values(busMarkers).forEach(obj => {
        const popup = obj.marker.getPopup();
        if (popup) popup.remove();
    });
}
export function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: {
            'version': 8,
            'sources': {
                'google-maps': {
                    'type': 'raster',
                    'tiles': [
                        `https://mt0.google.com/vt/lyrs=m${(window.devicePixelRatio > 1) ? '&scale=2' : ''}&hl=id&x={x}&y={y}&z={z}`,
                        `https://mt1.google.com/vt/lyrs=m${(window.devicePixelRatio > 1) ? '&scale=2' : ''}&hl=id&x={x}&y={y}&z={z}`,
                        `https://mt2.google.com/vt/lyrs=m${(window.devicePixelRatio > 1) ? '&scale=2' : ''}&hl=id&x={x}&y={y}&z={z}`,
                        `https://mt3.google.com/vt/lyrs=m${(window.devicePixelRatio > 1) ? '&scale=2' : ''}&hl=id&x={x}&y={y}&z={z}`
                    ],
                    'tileSize': 256,
                    'attribution': '&copy; Google Maps'
                }
            },
            'layers': [
                {
                    'id': 'google-maps-layer',
                    'type': 'raster',
                    'source': 'google-maps',
                    'minzoom': 0,
                    'maxzoom': 22
                }
            ]
        },
        bounds: bounds,
        maxBounds: [
            [bounds.getSouthWest().lng - 0.05, bounds.getSouthWest().lat - 0.05],
            [bounds.getNorthEast().lng + 0.05, bounds.getNorthEast().lat + 0.05]
        ],
        fitBoundsOptions: { padding: { top: 40, bottom: (window.innerWidth < 768) ? 230 : 150, left: 20, right: 20 } },
        pitch: 0,
        bearing: 0,
        bearing: 0,
        antialias: true,
        maxZoom: 18
    });



    map.on('styleimagemissing', (e) => {
        const id = e.id;
        if (!map.hasImage(id)) {
            const pixel = new Uint8Array(4);
            pixel[0] = 0; pixel[1] = 0; pixel[2] = 0; pixel[3] = 0;
            map.addImage(id, { width: 1, height: 1, data: pixel });
        }
    });

    map.on('error', (e) => {
        if (e.error && e.error.message &&
            e.error.message.includes('Expected value to be of type number, but found null')) {
            return;
        }
        console.warn('Map error:', e.error);
    });

    return map;
}
export function addRoutes() {
    if (!map.getSource('rutePagi')) {
        map.addSource('rutePagi', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: rutePagi } } });
        map.addLayer({
            id: 'rutePagiLayer', type: 'line', source: 'rutePagi',
            layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': 'visible' },
            paint: {
                'line-color': '#BF1E2E',
                'line-width': 4,
                'line-opacity': 0.9,
                'line-offset': -3
            }
        });
    }
    if (!map.getSource('ruteSore')) {
        map.addSource('ruteSore', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: ruteSore } } });
        map.addLayer({
            id: 'ruteSoreLayer', type: 'line', source: 'ruteSore',
            layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': 'visible' },
            paint: {
                'line-color': '#159BB3',
                'line-width': 4,
                'line-opacity': 0.9,
                'line-offset': 3
            }
        });
    }
    document.querySelectorAll('.chip').forEach(el => el.classList.add('active-route'));
}
export function toggleRoute(layerIdObj, element) {
    if (!map) return;
    const layerId = layerIdObj + 'Layer';
    const visibility = map.getLayoutProperty(layerId, 'visibility');
    const newVisibility = (visibility === 'visible' || visibility === undefined) ? 'none' : 'visible';
    map.setLayoutProperty(layerId, 'visibility', newVisibility);
    const isVisible = newVisibility === 'visible';
    if (element) {
        if (element.classList.contains('chip') || element.classList.contains('chip-dashboard')) {
            element.classList.toggle('active-route', isVisible);
        }
        if (element.classList.contains('route-card-item')) {
            element.classList.toggle('active-card', isVisible);
        }
        if (!element.classList.contains('chip-dashboard')) {
            const icon = element.querySelector('i');
            if (icon) {
                icon.className = isVisible ? 'fa-solid fa-check' : 'fa-solid fa-xmark';
            }
        }
    }
}
if (typeof window !== 'undefined') {
    window.toggleRoute = toggleRoute;
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
            'filter': ['all',
                ['has', 'extrude'],
                ['==', ['get', 'extrude'], 'true']
            ],
            'type': 'fill-extrusion',
            'minzoom': 14,
            'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                    'case',
                    ['has', 'render_height'], ['to-number', ['get', 'render_height'], 0],
                    ['has', 'height'], ['to-number', ['get', 'height'], 0],
                    0
                ],
                'fill-extrusion-base': [
                    'case',
                    ['has', 'render_min_height'], ['to-number', ['get', 'render_min_height'], 0],
                    ['has', 'min_height'], ['to-number', ['get', 'min_height'], 0],
                    0
                ],
                'fill-extrusion-opacity': 0.6
            }
        });
    }
}
export function updateMarker(bus) {
    const targetPos = [bus.longitude, bus.latitude];
    const gasClass = bus.gas_level > GAS_ALERT_THRESHOLD ? 'popup-danger' : '';

    const busStatus = getBusStatus(bus);
    const statusText = busStatus.status;

    let statusClass = 'status-stopped';
    if (statusText === 'Berjalan') statusClass = 'status-moving';
    else if (statusText === 'Berhenti') statusClass = 'status-paused';

    let etaHtml = '';
    let sortStops = stops.map(stop => {
        return {
            ...stop,
            dist: calculateDistance(bus.latitude, bus.longitude, stop.lat, stop.lng)
        };
    }).sort((a, b) => a.dist - b.dist);
    const nearest = sortStops[0];
    if (nearest && nearest.dist < 5) {
        const timeMin = estimateArrival(nearest.dist, bus.speed);
        etaHtml = `
        <div class="popup-eta" style="margin-top:10px; padding-top:10px; border-top:1px solid #eee;">
            <div style="font-size:0.75rem; color:#6b7280; display:flex; justify-content:space-between; align-items:center;">
                <span>Menuju <b>${nearest.title.replace('Halte ', '')}</b></span>
                <span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:700;">${formatTime(timeMin)}</span>
            </div>
            <div style="width:100%; height:4px; background:#f3f4f6; border-radius:2px; margin-top:6px; overflow:hidden;">
                <div style="width:${Math.max(10, Math.min(100, (1 - nearest.dist / 3) * 100))}%; height:100%; background:#0369a1; border-radius:2px;"></div>
            </div>
        </div>`;
    }
    const content = `
        <div class="bus-popup">
            <div class="popup-header">
                <img src="./images/bipol.png" class="popup-icon">
                <div class="popup-title">
                    <h3>${bus.bus_id}</h3>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <span class="popup-status ${statusClass}" style="font-size:0.7rem; padding:2px 6px;">${statusText}</span>
                    </div>
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
            ${etaHtml}
        </div>
    `;
    if (busMarkers[bus.bus_id]) {
        const markerObj = busMarkers[bus.bus_id];
        markerObj.marker.setLngLat(targetPos);
        markerObj.marker.getPopup().setHTML(content);
        if (getFollowBusId() === bus.bus_id && getMap()) {
            getMap().jumpTo({ center: targetPos });
        }
    } else {
        const el = document.createElement('div');
        el.className = 'bus-marker-icon';
        el.style.backgroundImage = 'url(/images/bipol.png)';
        el.style.width = '42px';
        el.style.height = '42px';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.cursor = 'pointer';
        const pulse = document.createElement('div');
        pulse.className = 'marker-pulse';
        el.appendChild(pulse);
        el.onclick = () => {
            if (getFollowBusId() === bus.bus_id) return;
            setFollowBusId(bus.bus_id);
            getMap().jumpTo({ center: targetPos, zoom: 17.5 });
            document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active-focus'));
        };
        const marker = new maplibregl.Marker({ element: el })
            .setLngLat(targetPos)
            .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(content))
            .addTo(map);
        busMarkers[bus.bus_id] = {
            marker: marker
        };
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