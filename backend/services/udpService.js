const dgram = require('dgram');
const validate = require('../utils/validators');
const sanitizeInput = require('../utils/sanitizer');
const supabase = require('../config/supabase');
const { checkGeofence } = require('./geofenceService');
const { getSettingSync } = require('./settingsService');

const UDP_PORT = process.env.UDP_PORT || 3333;

function startUdpServer(io) {
    const udpServer = dgram.createSocket('udp4');

    udpServer.on('error', (err) => {
        console.error(`❌ UDP Error:\n${err.stack}`);
        udpServer.close();
    });

    udpServer.on('message', async (msg, rinfo) => {
        try {
            const raw = msg.toString().trim();
            const parts = raw.split(',');
            if (parts.length < 5) return;

            const bus_id = sanitizeInput(parts[0]);
            const latitude = parseFloat(parts[1]);
            const longitude = parseFloat(parts[2]);
            const speed = parseFloat(parts[3]);
            const gas_level = parseInt(parts[4]);

            if (!bus_id || !validate.coordinate(latitude) || !validate.coordinate(longitude)) return;

            console.log(`📡 [UDP] ${bus_id} | 📍 ${latitude.toFixed(6)},${longitude.toFixed(6)} | 🚀 ${speed} | ⛽ ${gas_level}`);

            let cleanSpeed = validate.speed(speed) ? speed : 0;
            const minSpeed = parseFloat(getSettingSync('UDP_MIN_SPEED_THRESHOLD'));
            if (cleanSpeed < minSpeed) cleanSpeed = 0;

            const insertData = {
                bus_id, latitude, longitude,
                speed: cleanSpeed,
                gas_level: validate.gasLevel(gas_level) ? gas_level : 0,
                created_at: new Date().toISOString()
            };

            supabase.from('bipol_tracker').insert([insertData]).select().then(({ data, error }) => {
                if (error) console.error("❌ DB fail:", error.message);
            });

            checkGeofence(bus_id, latitude, longitude);

            insertData.id = Date.now();

            if (io) {
                io.emit("update_bus", insertData);
            }

            const LEGACY_ID_MAP = {
                'B 2013 EPA': 'BT-240601',
                'B 2027 EPA': 'BT-240602',
                'BPL-BIPOL': 'BT-240603'
            };

            const LEGACY_HOST = process.env.LEGACY_SERVER_HOST;
            const LEGACY_PORT = process.env.LEGACY_SERVER_PORT || 5005;

            if (LEGACY_HOST && LEGACY_ID_MAP[bus_id]) {
                const legacyBusId = LEGACY_ID_MAP[bus_id];
                const legacyPayload = `${legacyBusId},${latitude},${longitude}`;
                const message = Buffer.from(legacyPayload);

                udpServer.send(message, LEGACY_PORT, LEGACY_HOST, (err) => {
                    if (err) {
                        console.error(`❌ Forward Error: ${err.message}`);
                    }
                });
            }

        } catch (err) {
            console.error('UDP message error:', err.message);
        }
    });

    udpServer.bind(UDP_PORT, () => {
        console.log(`⚡ UDP Server Listening on Port ${UDP_PORT}`);
    });

    return udpServer;
}

module.exports = { startUdpServer };
