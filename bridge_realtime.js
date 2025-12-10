require('dotenv').config();
const axios = require('axios');

const CLOUD_API = process.env.CLOUD_API_URL;
const LOCAL_API = 'http://localhost:3000/api/track';

console.log("=== BRIDGE REAL-TIME STARTED ===");

async function syncData() {
    try {
        const response = await axios.get(CLOUD_API);
        const buses = response.data.data;

        if (buses && buses.length > 0) {
            buses.forEach(async (bus) => {
                const payload = {
                    bus_id: bus.bus_id,
                    latitude: bus.latitude,
                    longitude: bus.longitude,
                    gas_level: bus.gas_level || 0,
                    speed: bus.speed || 0
                };

                try {
                    await axios.post(LOCAL_API, payload);
                    process.stdout.write(`\r[SYNC] Forwarded: ${bus.bus_id}`);
                } catch (localErr) { }
            });
        }
    } catch (err) {
        console.error(`\n[ERROR CLOUD] ${err.message}`);
    }
}

setInterval(syncData, 2000);