const memoryCache = {
    busData: new Map(),
    lastUpdate: new Map(),
    geofenceState: new Map(),
    rateLimits: new Map()
};

const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS) || 5000;

function getFromCache(key) {
    const data = memoryCache.busData.get(key);
    const lastUpdate = memoryCache.lastUpdate.get(key);
    if (data && lastUpdate && (Date.now() - lastUpdate) < CACHE_TTL) {
        return data;
    }
    return null;
}

function setToCache(key, data) {
    memoryCache.busData.set(key, data);
    memoryCache.lastUpdate.set(key, Date.now());
}

module.exports = {
    memoryCache,
    getFromCache,
    setToCache
};
