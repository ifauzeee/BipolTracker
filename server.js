require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dns = require('node:dns');
const http = require('http');
const { Server } = require("socket.io");

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Config .env belum lengkap!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function getLogTime() {
    return new Date().toLocaleString('id-ID', {
        dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Jakarta'
    });
}

async function cleanupOldData() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
        .from('bipol_tracker')
        .delete()
        .lt('created_at', yesterday);

    if (error) {
        console.error(`❌ [${getLogTime()}] Cleanup Failed:`, error.message);
    } else {
        console.log(`🧹 [${getLogTime()}] Auto-Cleanup: Deleted data older than 24h.`);
    }
}

setInterval(cleanupOldData, 60 * 60 * 1000);
cleanupOldData();

app.post('/api/track', async (req, res) => {
    const bus_id = req.body.bus_id;
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    const speed = parseFloat(req.body.speed);
    const gas_level = parseInt(req.body.gas_level);

    if (!bus_id) return res.status(400).send("Data invalid");

    console.log(`\n==================================================`);
    console.log(`📅 ${getLogTime()}`);
    console.log(`🚌 ${bus_id}  |  📍 ${latitude}, ${longitude}`);
    console.log(`⛽ Gas: ${gas_level}  |  🚀 Speed: ${speed} km/h`);
    console.log(`==================================================`);

    const insertData = {
        bus_id, latitude, longitude, speed, gas_level,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('bipol_tracker')
        .insert([insertData])
        .select();

    if (error) {
        console.error(`❌ [${getLogTime()}] DB Insert ERROR:`, error.message);
        if (error.cause) console.error("Cause:", error.cause);
        return res.status(500).send("DB Error");
    }

    console.log(`✅ [${getLogTime()}] Saved to DB (ID: ${data[0].id})`);

    io.emit("update_bus", data[0]);

    res.status(200).send("OK");
});

app.get('/api/bus/location', async (req, res) => {
    const { data, error } = await supabase
        .from('bipol_tracker')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) return res.status(500).json({ error: error.message });

    const latest = {};
    data.forEach(d => { if (!latest[d.bus_id]) latest[d.bus_id] = d; });

    res.json({ data: Object.values(latest) });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const dgram = require('dgram');
const udpServer = dgram.createSocket('udp4');
const UDP_PORT = 3333;

udpServer.on('error', (err) => {
    console.error(`❌ UDP Error:\n${err.stack}`);
    udpServer.close();
});

udpServer.on('message', async (msg, rinfo) => {
    const raw = msg.toString().trim();
    const parts = raw.split(',');
    if (parts.length < 5) return;

    const bus_id = parts[0];
    const latitude = parseFloat(parts[1]);
    const longitude = parseFloat(parts[2]);
    const speed = parseFloat(parts[3]);
    const gas_level = parseInt(parts[4]);

    if (!bus_id) return;

    console.log(`📡 [UDP] ${bus_id} | 📍 ${latitude},${longitude} | 🚀 ${speed} | ⛽ ${gas_level}`);

    const insertData = {
        bus_id, latitude, longitude, speed, gas_level,
        created_at: new Date().toISOString()
    };

    supabase.from('bipol_tracker').insert([insertData]).select().then(({ data, error }) => {
        if (error) console.error("❌ DB fail:", error.message);
    });

    insertData.id = Date.now();
    io.emit("update_bus", insertData);
});

udpServer.bind(UDP_PORT, () => {
    console.log(`⚡ UDP Server Listening on Port ${UDP_PORT}`);
});

server.listen(PORT, () => {
    console.log(`🚀 Server Socket.io HIDUP di Port ${PORT}`);
    console.log(`🧹 Auto-Cleanup scheduler aktif (24 Jam retensi)`);
});
