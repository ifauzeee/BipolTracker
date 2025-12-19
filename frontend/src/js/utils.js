export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function estimateArrival(distanceKm, speedKmh) {
    const effectiveSpeed = (speedKmh && speedKmh > 5) ? speedKmh : 20;
    const timeHours = distanceKm / effectiveSpeed;
    const timeMinutes = Math.ceil(timeHours * 60);
    return timeMinutes;
}

export function formatTime(minutes) {
    if (minutes <= 0) return 'Tiba sekarang';
    if (minutes === 1) return '1 min';
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h} jam ${m} min`;
    }
    return `${minutes} min`;
}

export function getCrowdConfig(level) {
    switch (level?.toLowerCase()) {
        case 'sepi':
            return { color: '#10b981', text: 'Sepi' };
        case 'sedang':
            return { color: '#f59e0b', text: 'Sedang' };
        case 'penuh':
            return { color: '#ef4444', text: 'Penuh' };
        default:
            return { color: '#6b7280', text: 'Normal' };
    }
}