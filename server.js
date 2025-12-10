require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // Proteksi DDoS

const app = express();
const PORT = process.env.PORT || 3000;

//Koneksi Supabase 
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERROR: Supabase URL atau Key belum diset di file .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Konfigurasi Keamanan Rate Limiter
// Membatasi IP agar tidak bisa spamming (Max 100 hit / 15 menit)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // Limit setiap IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: "Terlalu banyak request, server sedang melindungi diri. Coba lagi nanti."
    }
});

// 4. Middleware Global
app.use(cors());     // Mengizinkan akses dari domain lain/mobile app
app.use(limiter);    // Mengaktifkan perlindungan DDoS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 5. Konfigurasi Frontend (Static Files)
const frontendPath = path.join(__dirname, '../bipol-frontend');
app.use('/static', express.static(frontendPath));
app.use('/manifest.json', express.static(path.join(frontendPath, 'manifest.json')));
app.use('/sw.js', express.static(path.join(frontendPath, 'sw.js')));

// --- ROUTES ---

// Route Utama (Frontend)
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// API: Ambil Lokasi Terkini (Untuk Mobile App & Dashboard)
app.get('/api/bus/location', async (req, res) => {
    const { data, error } = await supabase
        .from('bipol_tracker')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    // Handle jika data kosong
    if (!data || data.length === 0) return res.json({ data: [] });

    const formattedData = data.map(item => ({
        bus_id: item.bus_id,
        latitude: item.latitude,
        longitude: item.longitude,
        speed: item.speed,
        gas_level: item.gas_level,
        timestamp: Math.floor(new Date(item.created_at).getTime() / 1000)
    }));

    res.json({ data: formattedData });
});

// API: Ambil Riwayat Perjalanan (Untuk Analisis)
app.get('/api/bus/history', async (req, res) => {
    const { data, error } = await supabase
        .from('bipol_tracker')
        .select('latitude, longitude, speed, gas_level, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return res.status(500).json({ error: error.message });

    const historyData = data.reverse().map(item => ({
        lat: item.latitude,
        lng: item.longitude,
        speed: item.speed,
        gas: item.gas_level,
        time: new Date(item.created_at).toLocaleTimeString('id-ID')
    }));

    res.json({ data: historyData });
});

// API: Menerima Data dari ESP32 (IoT)
app.post('/api/track', async (req, res) => {
    // Log data masuk untuk debugging
    console.log("\n[INCOMING IOT DATA]", req.body);
    
    const { bus_id, latitude, longitude, speed, gas_level } = req.body;

    // Validasi data sederhana
    if (!bus_id || latitude === undefined || longitude === undefined) {
        console.warn("⚠️ Data tidak lengkap ditolak");
        return res.status(400).send("Data Incomplete");
    }

    // Insert ke Database
    const { error } = await supabase
        .from('bipol_tracker')
        .insert([{ bus_id, latitude, longitude, speed, gas_level }]);

    if (error) {
        console.error("❌ DB Error:", error.message);
        res.status(500).send("Database Error");
    } else {
        console.log(`✅ Saved: ${bus_id} | Gas: ${gas_level} | Spd: ${speed}`);
        res.status(200).send("OK");
    }
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`🚀 Bipol Tracker Server running on port ${PORT}`);
    console.log(`🛡️  DDoS Protection (Rate Limit) Active`);
});
