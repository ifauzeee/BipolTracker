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
        bounds: bounds,
        fitBoundsOptions: { padding: { top: 20, bottom: 180, left: 10, right: 10 } },
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
        el.style.width = '30px'; el.style.height = '30px';
        el.style.backgroundSize = 'contain'; el.style.backgroundRepeat = 'no-repeat';

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
    const pos = [bus.longitude, bus.latitude];
    const content = `<div class="iw-header"><img src="./images/bipol.png" class="iw-icon"><h3>${bus.bus_id}</h3></div><p>Speed: ${bus.speed} km/h<br>Gas: ${bus.gas_level}</p>`;
    if (busMarkers[bus.bus_id]) {
        busMarkers[bus.bus_id].setLngLat(pos);
        busMarkers[bus.bus_id].getPopup().setHTML(content);
    } else {
        const el = document.createElement('div');
        el.className = 'bus-marker-icon';
        el.style.backgroundImage = 'url(/images/bipol.png)';
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.cursor = 'pointer';

        const pulse = document.createElement('div');
        pulse.className = 'marker-pulse';
        el.appendChild(pulse);

        el.onclick = () => {
            setFollowBusId(bus.bus_id);
            map.flyTo({ center: pos, zoom: 17 });
            document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active-focus'));
        };
        busMarkers[bus.bus_id] = new maplibregl.Marker({ element: el })
            .setLngLat(pos)
            .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(content))
            .addTo(map);
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
