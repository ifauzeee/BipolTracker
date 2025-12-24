const supabase = require('../config/supabase');
const { memoryCache } = require('../utils/cache');

let geofenceZones = [];
let ioInstance = null;

function setIo(io) {
    ioInstance = io;
}

async function loadGeofences() {
    try {
        const { data, error } = await supabase.from('geofences').select('*');
        if (error) throw error;
        geofenceZones = data || [];
        console.log(`🌍 Loaded ${geofenceZones.length} Geofence Zones.`);
    } catch (err) {
        console.error('❌ Failed to load geofences:', err.message);
    }
}

loadGeofences();
setInterval(loadGeofences, 5 * 60 * 1000);

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

async function logGeofenceEvent(bus_id, zone_id, event_type) {
    try {
        const { error } = await supabase
            .from('geofence_events')
            .insert([{ bus_id, geofence_id: zone_id, event_type }]);

        if (error) throw error;

        const zoneName = geofenceZones.find(z => z.id === zone_id)?.name || 'Unknown Zone';
        if (ioInstance) {
            ioInstance.emit('geofence_event', { bus_id, zoneName, event_type, time: new Date() });
        }
    } catch (err) {
        console.error("❌ Geofence Log Error:", err.message);
    }
}

async function checkGeofence(bus_id, lat, lon) {
    if (!geofenceZones.length) return;

    let currentlyInsideZoneId = null;

    for (const zone of geofenceZones) {
        const distance = getDistanceFromLatLonInKm(lat, lon, zone.latitude, zone.longitude);
        if (distance <= zone.radius_meters) {
            currentlyInsideZoneId = zone.id;
            break;
        }
    }

    const previousZoneId = memoryCache.geofenceState.get(bus_id) || null;

    if (currentlyInsideZoneId !== previousZoneId) {
        if (previousZoneId) {
            console.log(`⚠️ ${bus_id} EXITED Zone ${previousZoneId}`);
            await logGeofenceEvent(bus_id, previousZoneId, 'EXIT');
        }

        if (currentlyInsideZoneId) {
            const zoneName = geofenceZones.find(z => z.id === currentlyInsideZoneId)?.name;
            console.log(`✅ ${bus_id} ENTERED Zone ${currentlyInsideZoneId} (${zoneName})`);
            await logGeofenceEvent(bus_id, currentlyInsideZoneId, 'ENTER');
        }

        memoryCache.geofenceState.set(bus_id, currentlyInsideZoneId);
    }
}

module.exports = {
    setIo,
    checkGeofence,
    geofenceZones
};
