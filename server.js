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

async function loadInitialData() {
    console.log("[BOOTSTRAP] Loading data from DB...");
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(`
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
    } finally {
        if (connection) await connection.end();
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
        const currentData = {
            bus_id: bus_id,
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            gas_level: parseInt(data.gas_level) || 0,
            speed: parseFloat(data.speed) || 0,
            timestamp: new Date().toISOString()
        };

        busData[bus_id] = currentData;

        historyData.push({
            lat: currentData.latitude,
            lng: currentData.longitude,
            timestamp: currentData.timestamp
        });
        if (historyData.length > 500) historyData.shift();

        console.log(`[LIVE] ${bus_id} updated.`);

    } catch (e) {
        console.error("[MQTT ERROR]", e.message);
    }
});




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
        const bridgeProcess = fork('./bridge_realtime.js');
        bridgeProcess.on('exit', (code) => {
            console.log(`Bridge exited with code ${code}`);
        });
    });
});