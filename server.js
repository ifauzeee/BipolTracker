require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dns = require('node:dns');
const http = require('http');
const { Server } = require("socket.io");
const bcrypt = require('bcryptjs');

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
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
app.use(session({
    secret: process.env.SESSION_SECRET || 'bipol_secret_key_change_me',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const requireAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
};

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !data) {
        return res.status(401).json({ success: false, message: 'User not found' });
    }

    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    req.session.admin = { id: data.id, username: data.username };
    res.json({ success: true, message: 'Login successful' });
});

app.post('/auth/change-password', requireAuth, async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.session.admin.id;

    const hash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase
        .from('admin_users')
        .update({ password_hash: hash })
        .eq('id', userId);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Password updated' });
});

app.get('/auth/status', (req, res) => {
    res.json({ loggedIn: !!(req.session && req.session.admin) });
});

app.post('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/admin/logs', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('bipol_tracker')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/info', async (req, res) => {
    const { data, error } = await supabase
        .from('app_info')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/info', requireAuth, async (req, res) => {
    const { title, content } = req.body;
    const { data, error } = await supabase
        .from('app_info')
        .insert([{ title, content }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    io.emit('update_info');
    res.json({ success: true, data });
});

app.delete('/api/info/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('app_info')
        .delete()
        .match({ id });

    if (error) return res.status(500).json({ error: error.message });
    io.emit('update_info');
    res.json({ success: true });
});

app.get('/api/admin/info', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('app_info')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/admin/geofence-events', requireAuth, async (req, res) => {

    const { data, error } = await supabase
        .from('geofence_events')
        .select(`
            *,
            geofences ( name )
        `)
        .order('timestamp', { ascending: false })
        .limit(50);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(e => ({
        ...e,
        zone_name: e.geofences ? e.geofences.name : 'Unknown'
    }));

    res.json(formatted);
});

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


    checkGeofence(bus_id, latitude, longitude);

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

let geofenceZones = [];
let busGeofenceState = {};

async function loadGeofences() {
    const { data, error } = await supabase.from('geofences').select('*');
    if (error) console.error('❌ Failed to load geofences:', error.message);
    else {
        geofenceZones = data;
        console.log(`🌍 Loaded ${data.length} Geofence Zones.`);
    }
}

loadGeofences();

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d * 1000;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
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

    const previousZoneId = busGeofenceState[bus_id] || null;

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

        busGeofenceState[bus_id] = currentlyInsideZoneId;
    }
}

async function logGeofenceEvent(bus_id, zone_id, event_type) {
    const { error } = await supabase
        .from('geofence_events')
        .insert([{ bus_id, geofence_id: zone_id, event_type }]);

    if (error) console.error("❌ Geofence Log Error:", error.message);

    const zoneName = geofenceZones.find(z => z.id === zone_id)?.name || 'Unknown Zone';
    io.emit('geofence_event', { bus_id, zoneName, event_type, time: new Date() });
}

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

    checkGeofence(bus_id, latitude, longitude);

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
