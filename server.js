require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mqtt = require('mqtt');
const mysql = require('mysql2/promise');
const { fork } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let busData = {};
let historyData = [];
let dbPool = null;

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000
};

const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_User = process.env.MQTT_USER;
const MQTT_Pass = process.env.MQTT_PASS;
const MQTT_Topic = process.env.MQTT_TOPIC;

async function ensureDbPoolWithRetry(retries = 10, delayMs = 3000) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const baseConnConfig = Object.assign({}, dbConfig);
            delete baseConnConfig.database;
            const tempConn = await mysql.createConnection(baseConnConfig);
            await tempConn.query(`CREATE DATABASE IF NOT EXISTS \\\`${dbConfig.database}\\\`)
            await tempConn.end();

            if (!dbPool) {
                dbPool = mysql.createPool(Object.assign({}, dbConfig, { waitForConnections: true, connectionLimit: 5 }));
            }
            const conn = await dbPool.getConnection();
            await conn.ping();
            conn.release();
            return;
        } catch (err) {
            attempt++;
            console.error(`[DB] Connection attempt ${attempt} failed:`, err.message);
            if (attempt >= retries) throw err;
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
}

async function loadInitialData() {
    console.log("[BOOTSTRAP] Loading data from DB...");
    try {
        await ensureDbPoolWithRetry();

        const createTableSql = `
            CREATE TABLE IF NOT EXISTS location (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bus_id VARCHAR(64),
                latitude DOUBLE,
                longitude DOUBLE,
                gas_level INT,
                speed DOUBLE,
                timestamp DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `;
        await dbPool.execute(createTableSql);

        const [rows] = await dbPool.execute(`
            SELECT t1.bus_id, t1.latitude, t1.longitude, t1.timestamp 
            FROM location t1
            INNER JOIN (
                SELECT bus_id, MAX(id) as max_id
                FROM location
                GROUP BY bus_id
            ) t2 ON t1.bus_id = t2.bus_id AND t1.id = t2.max_id
        `);

        if (rows.length > 0) {
            rows.forEach(row => {
                busData[row.bus_id] = {
                    bus_id: row.bus_id,
                    latitude: parseFloat(row.latitude),
                    longitude: parseFloat(row.longitude),
                    gas_level: 0,
                    speed: 0,
                    timestamp: row.timestamp
                };
            });
            console.log(`[BOOTSTRAP] Loaded ${rows.length} buses.`);
        }
    } catch (error) {
        console.error("[BOOTSTRAP ERROR]", error.message);
    }
}

const client = mqtt.connect(MQTT_BROKER, {
    username: MQTT_User,
    password: MQTT_Pass,
    clientId: 'Web-' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
    console.log(`[MQTT] Connected`);
    client.subscribe(MQTT_Topic);
});

client.on('message', (topic, message) => {
    try {
        const payload = message.toString();
        const data = JSON.parse(payload);

        if (!data.bus_id || !data.latitude || !data.longitude) return;

        const bus_id = data.bus_id;
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        let speed = parseFloat(data.speed) || 0;
        const now = new Date();


        if (speed === 0 && busData[bus_id]) {
            try {
                const prev = busData[bus_id];
                const prevTime = new Date(prev.timestamp);
                const timeDiff = (now - prevTime) / 1000;

                if (timeDiff > 0 && timeDiff < 60) {
                    const dist = calculateDistance(prev.latitude, prev.longitude, lat, lng);

                    if (dist > 3) {
                        speed = (dist / timeDiff) * 3.6;
                        speed = Math.round(speed * 10) / 10;
                    }
                }
            } catch (err) { console.error("Calc speed error:", err); }
        }

        const currentData = {
            bus_id: bus_id,
            latitude: lat,
            longitude: lng,
            gas_level: parseInt(data.gas_level) || 0,
            speed: speed,
            timestamp: now.toISOString()
        };

        busData[bus_id] = currentData;

        historyData.push({
            lat: currentData.latitude,
            lng: currentData.longitude,
            timestamp: currentData.timestamp
        });
        if (historyData.length > 500) historyData.shift();

        console.log(`[LIVE] ${bus_id} updated. Speed: ${speed} km/h`);

        if (dbPool) {
            (async () => {
                try {
                    const ts = new Date(currentData.timestamp).toISOString().slice(0, 19).replace('T', ' ');
                    await dbPool.execute(`INSERT INTO location (bus_id, latitude, longitude, gas_level, speed, timestamp) VALUES (?, ?, ?, ?, ?, ?)`, [currentData.bus_id, currentData.latitude, currentData.longitude, currentData.gas_level, currentData.speed, ts]);
                } catch (err) {
                    console.error('[DB] Failed to insert location (MQTT):', err.message);
                }
            })();
        }

    } catch (e) {
        console.error("[MQTT ERROR]", e.message);
    }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

app.post('/api/track', (req, res) => {
    const { latitude, longitude, gas_level, speed, bus_id } = req.body;
    if (!bus_id) return res.status(400).json({ status: 'error' });

    const currentData = {
        bus_id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        gas_level: parseInt(gas_level),
        speed: parseFloat(speed),
        timestamp: new Date().toISOString()
    };

    busData[bus_id] = currentData;
    console.log(`[API] Received ${bus_id}`);
    if (dbPool) {
        (async () => {
            try {
                const ts = new Date(currentData.timestamp).toISOString().slice(0, 19).replace('T', ' ');
                await dbPool.execute(`INSERT INTO location (bus_id, latitude, longitude, gas_level, speed, timestamp) VALUES (?, ?, ?, ?, ?, ?)`, [currentData.bus_id, currentData.latitude, currentData.longitude, currentData.gas_level, currentData.speed, ts]);
            } catch (err) {
                console.error('[DB] Failed to insert location (API):', err.message);
            }
        })();
    }
    res.status(200).send('OK');
});

app.get('/api/bus/location', (req, res) => {
    res.json({ status: 'success', data: Object.values(busData) });
});

app.get('/api/bus/history', (req, res) => {
    res.json({ status: 'success', data: historyData });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

loadInitialData().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        
        if (process.env.CLOUD_API_URL) {
            const bridgeProcess = fork('./bridge_realtime.js');
            bridgeProcess.on('exit', (code) => {
                console.log(`Bridge exited with code ${code}`);
            });
        } else {
            console.log("[INFO] CLOUD_API_URL not set. Bridge skipped.");
        }
    });
});
