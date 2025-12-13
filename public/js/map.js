import { stops, rutePagi, ruteSore, bounds } from './data.js';
import { calculateDistance, estimateArrival, formatTime, getCrowdConfig } from './utils.js';
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
    map.on('load', () => {
        const initialZoom = map.getZoom();
        map.setMinZoom(initialZoom);
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
export function updateMarker(bus) {
    const targetPos = [bus.longitude, bus.latitude];
    const gasClass = bus.gas_level > 600 ? 'popup-danger' : '';
    const statusText = bus.speed < 1 ? 'Berhenti' : 'Berjalan';
    const statusClass = bus.speed < 1 ? 'status-stopped' : 'status-moving';
    const crowd = getCrowdConfig(bus.occupancy);
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
                        <span style="background:${crowd.color}15; color:${crowd.color}; border:1px solid ${crowd.color}30; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; gap:3px;">
                            <i class="fa-solid fa-users" style="font-size:0.6rem;"></i> ${crowd.text}
                        </span>
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