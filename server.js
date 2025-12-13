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
const dgram = require('dgram');

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
    pingInterval: 25000
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Config .env belum lengkap!");
    process.exit(1);
}

const memoryCache = {
    busData: new Map(),
    lastUpdate: new Map(),
    geofenceState: new Map(),
    rateLimits: new Map()
};

const CACHE_TTL = 5000;
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const LOGIN_RATE_LIMIT_MAX = 5;

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

function checkRateLimit(ip, limit = RATE_LIMIT_MAX_REQUESTS) {
    const now = Date.now();
    const key = `rate_${ip}`;
    let record = memoryCache.rateLimits.get(key);

    if (!record || (now - record.windowStart) > RATE_LIMIT_WINDOW) {
        record = { count: 1, windowStart: now };
        memoryCache.rateLimits.set(key, record);
        return { allowed: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
        return { allowed: false, remaining: 0, retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - record.windowStart)) / 1000) };
    }

    record.count++;
    return { allowed: true, remaining: limit - record.count };
}

const rateLimitMiddleware = (limit = RATE_LIMIT_MAX_REQUESTS) => (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const result = checkRateLimit(ip, limit);

    res.set('X-RateLimit-Limit', limit);
    res.set('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
            error: 'Too many requests',
            retryAfter: result.retryAfter
        });
    }
    next();
};

const validate = {
    busPlate: (value) => {
        if (!value || typeof value !== 'string') return false;
        return value.length >= 1 && value.length <= 20;
    },
    whatsappNumber: (value) => {
        if (!value || typeof value !== 'string') return false;
        return /^[0-9]{10,15}$/.test(value);
    },
    message: (value) => {
        if (!value || typeof value !== 'string') return false;
        return value.length >= 5 && value.length <= 1000;
    },
    username: (value) => {
        if (!value || typeof value !== 'string') return false;
        return /^[a-zA-Z0-9_]{3,30}$/.test(value);
    },
    password: (value) => {
        if (!value || typeof value !== 'string') return false;
        return value.length >= 4 && value.length <= 100;
    },
    coordinate: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= -180 && num <= 180;
    },
    speed: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 500;
    },
    gasLevel: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0 && num <= 10000;
    }
};

function sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>\"'&]/g, '').trim().substring(0, 1000);
}

const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fetch(url, options);
        } catch (err) {
            if (i === retries - 1) throw err;
            console.warn(`⚠️ Connection failed. Retrying... (${i + 1}/${retries})`);
            await new Promise(res => setTimeout(res, 1000 * (i + 1)));
        }
    }
};

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { fetch: fetchWithRetry }
});

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'bipol_secret_key_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    next();
});

const requireAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
};

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: io.engine.clientsCount
    });
});

app.get('/api/health/ready', async (req, res) => {
    try {
        const { error } = await supabase.from('bipol_tracker').select('id').limit(1);
        if (error) throw error;
        res.json({ status: 'ready', database: 'connected' });
    } catch (err) {
        res.status(503).json({ status: 'not ready', database: 'disconnected', error: err.message });
    }
});

app.post('/auth/login', rateLimitMiddleware(LOGIN_RATE_LIMIT_MAX), async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!validate.username(username)) {
            return res.status(400).json({ success: false, message: 'Username tidak valid' });
        }
        if (!validate.password(password)) {
            return res.status(400).json({ success: false, message: 'Password tidak valid' });
        }

        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', sanitizeInput(username))
            .single();

        if (error || !data) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const match = await bcrypt.compare(password, data.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Password salah' });
        }

        req.session.admin = { id: data.id, username: data.username };
        res.json({ success: true, message: 'Login successful' });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/auth/change-password', requireAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!validate.password(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password minimal 4 karakter' });
        }

        const userId = req.session.admin.id;
        const hash = await bcrypt.hash(newPassword, 12);

        const { error } = await supabase
            .from('admin_users')
            .update({ password_hash: hash })
            .eq('id', userId);

        if (error) throw error;
        res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        console.error('Change password error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/auth/status', (req, res) => {
    res.json({ loggedIn: !!(req.session && req.session.admin) });
});

app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout error:', err);
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/admin/logs', requireAuth, async (req, res) => {
    try {
        const cached = getFromCache('admin_logs');
        if (cached) return res.json(cached);

        const { data, error } = await supabase
            .from('bipol_tracker')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        setToCache('admin_logs', data);
        res.json(data);
    } catch (err) {
        console.error('Get logs error:', err.message);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

app.get('/api/info', async (req, res) => {
    try {
        const cached = getFromCache('public_info');
        if (cached) return res.json(cached);

        const { data, error } = await supabase
            .from('app_info')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setToCache('public_info', data);
        res.json(data);
    } catch (err) {
        console.error('Get info error:', err.message);
        res.status(500).json({ error: 'Failed to fetch info' });
    }
});

app.get('/api/config', (req, res) => {
    res.json({
        gasAlertThreshold: parseInt(process.env.GAS_ALERT_THRESHOLD) || 600,
        busStopTimeoutMinutes: parseInt(process.env.BUS_STOP_TIMEOUT_MINUTES) || 5
    });
});

app.post('/api/info', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content required' });
        }

        const { data, error } = await supabase
            .from('app_info')
            .insert([{
                title: sanitizeInput(title).substring(0, 100),
                content: sanitizeInput(content).substring(0, 1000)
            }])
            .select();

        if (error) throw error;
        memoryCache.busData.delete('public_info');
        io.emit('update_info');
        res.json({ success: true, data });
    } catch (err) {
        console.error('Create info error:', err.message);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

app.delete('/api/info/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('app_info')
            .delete()
            .match({ id });

        if (error) throw error;
        memoryCache.busData.delete('public_info');
        io.emit('update_info');
        res.json({ success: true });
    } catch (err) {
        console.error('Delete info error:', err.message);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

app.get('/api/admin/info', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('app_info')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get admin info error:', err.message);
        res.status(500).json({ error: 'Failed to fetch info' });
    }
});

app.get('/api/admin/geofence-events', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('geofence_events')
            .select(`*, geofences ( name )`)
            .order('timestamp', { ascending: false })
            .limit(50);

        if (error) throw error;

        const formatted = data.map(e => ({
            ...e,
            zone_name: e.geofences ? e.geofences.name : 'Unknown'
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Get geofence events error:', err.message);
        res.status(500).json({ error: 'Failed to fetch geofence events' });
    }
});

app.post('/api/lost-items', rateLimitMiddleware(10), async (req, res) => {
    try {
        const { bus_plate, whatsapp_number, message } = req.body;

        if (!validate.busPlate(bus_plate)) {
            return res.status(400).json({ error: 'Plat bus tidak valid' });
        }
        if (!validate.whatsappNumber(whatsapp_number)) {
            return res.status(400).json({ error: 'Nomor WhatsApp tidak valid (10-15 digit)' });
        }
        if (!validate.message(message)) {
            return res.status(400).json({ error: 'Pesan minimal 5 karakter, maksimal 1000' });
        }

        const { data, error } = await supabase
            .from('lost_items')
            .insert([{
                bus_plate: sanitizeInput(bus_plate),
                whatsapp_number: sanitizeInput(whatsapp_number),
                message: sanitizeInput(message)
            }])
            .select();

        if (error) throw error;

        io.emit('new_lost_item', data[0]);
        res.json({ success: true, data: data[0] });
    } catch (err) {
        console.error('Create lost item error:', err.message);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

app.post('/api/feedback', rateLimitMiddleware(10), async (req, res) => {
    try {
        const { name, message } = req.body;

        if (!validate.message(message)) {
            return res.status(400).json({ error: 'Pesan minimal 5 karakter, maksimal 1000' });
        }

        const cleanName = name ? sanitizeInput(name).substring(0, 50) : 'Anonim';
        const cleanMessage = sanitizeInput(message);

        const { data, error } = await supabase
            .from('feedback')
            .insert([{
                name: cleanName,
                message: cleanMessage,
                status: 'pending'
            }])
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (err) {
        console.error('Submit feedback error:', err.message);
        res.status(500).json({ error: 'Gagal mengirim masukan' });
    }
});

app.get('/api/admin/lost-items', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('lost_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get lost items error:', err.message);
        res.status(500).json({ error: 'Failed to fetch lost items' });
    }
});

app.get('/api/admin/feedback', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Fetch feedback error:', err.message);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

app.patch('/api/admin/lost-items/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'resolved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Status tidak valid' });
        }

        const { data, error } = await supabase
            .from('lost_items')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;
        io.emit('update_lost_item', data[0]);
        res.json({ success: true, data: data[0] });
    } catch (err) {
        console.error('Update lost item error:', err.message);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

app.delete('/api/admin/lost-items/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('lost_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        io.emit('update_lost_item');
        res.json({ success: true });
    } catch (err) {
        console.error('Delete lost item error:', err.message);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

function getLogTime() {
    return new Date().toLocaleString('id-ID', {
        dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Jakarta'
    });
}

async function cleanupOldData() {
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabase
            .from('bipol_tracker')
            .delete()
            .lt('created_at', yesterday);

        if (error) throw error;
        console.log(`🧹 [${getLogTime()}] Auto-Cleanup: Deleted data older than 24h.`);
    } catch (err) {
        console.error(`❌ [${getLogTime()}] Cleanup Failed:`, err.message);
    }
}

setInterval(cleanupOldData, 60 * 60 * 1000);
cleanupOldData();

setInterval(() => {
    memoryCache.rateLimits.forEach((value, key) => {
        if (Date.now() - value.windowStart > RATE_LIMIT_WINDOW * 2) {
            memoryCache.rateLimits.delete(key);
        }
    });
}, 5 * 60 * 1000);

app.post('/api/track', async (req, res) => {
    try {
        const bus_id = sanitizeInput(req.body.bus_id);
        const latitude = parseFloat(req.body.latitude);
        const longitude = parseFloat(req.body.longitude);
        const speed = parseFloat(req.body.speed);
        const gas_level = parseInt(req.body.gas_level);

        if (!bus_id || !validate.coordinate(latitude) || !validate.coordinate(longitude)) {
            return res.status(400).send("Data invalid");
        }

        console.log(`📅 ${getLogTime()} | 🚌 ${bus_id} | 📍 ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | ⛽ ${gas_level} | 🚀 ${speed} km/h`);

        const insertData = {
            bus_id, latitude, longitude,
            speed: validate.speed(speed) ? speed : 0,
            gas_level: validate.gasLevel(gas_level) ? gas_level : 0,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('bipol_tracker')
            .insert([insertData])
            .select();

        if (error) throw error;

        setToCache(`bus_${bus_id}`, data[0]);
        checkGeofence(bus_id, latitude, longitude);

        const occupancy = ['Sepi', 'Sedang', 'Penuh'][Math.floor(Math.random() * 3)];
        io.emit("update_bus", { ...data[0], occupancy });

        res.status(200).send("OK");
    } catch (err) {
        console.error(`❌ [${getLogTime()}] Track Error:`, err.message);
        res.status(500).send("Error");
    }
});

app.get('/api/bus/location', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bipol_tracker')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const latest = {};
        data.forEach(d => { if (!latest[d.bus_id]) latest[d.bus_id] = d; });

        res.json({ data: Object.values(latest) });
    } catch (err) {
        console.error('Get bus location error:', err.message);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

let geofenceZones = [];

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
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
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

async function logGeofenceEvent(bus_id, zone_id, event_type) {
    try {
        const { error } = await supabase
            .from('geofence_events')
            .insert([{ bus_id, geofence_id: zone_id, event_type }]);

        if (error) throw error;

        const zoneName = geofenceZones.find(z => z.id === zone_id)?.name || 'Unknown Zone';
        io.emit('geofence_event', { bus_id, zoneName, event_type, time: new Date() });
    } catch (err) {
        console.error("❌ Geofence Log Error:", err.message);
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const udpServer = dgram.createSocket('udp4');
const UDP_PORT = 3333;

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

        const insertData = {
            bus_id, latitude, longitude,
            speed: validate.speed(speed) ? speed : 0,
            gas_level: validate.gasLevel(gas_level) ? gas_level : 0,
            created_at: new Date().toISOString()
        };

        supabase.from('bipol_tracker').insert([insertData]).select().then(({ data, error }) => {
            if (error) console.error("❌ DB fail:", error.message);
        });

        checkGeofence(bus_id, latitude, longitude);

        insertData.id = Date.now();

        insertData.occupancy = ['Sepi', 'Sedang', 'Penuh'][Math.floor(Math.random() * 3)];

        io.emit("update_bus", insertData);
    } catch (err) {
        console.error('UDP message error:', err.message);
    }
});

udpServer.bind(UDP_PORT, () => {
    console.log(`⚡ UDP Server Listening on Port ${UDP_PORT}`);
});

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
        console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    });
});

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        udpServer.close();
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, () => {
    console.log(`🚀 Server Socket.io HIDUP di Port ${PORT}`);
    console.log(`🧹 Auto-Cleanup scheduler aktif (24 Jam retensi)`);
    console.log(`🔒 Security features enabled`);
    console.log(`📊 Health check: /api/health`);
});
