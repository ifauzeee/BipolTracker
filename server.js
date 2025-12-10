require('dotenv').config();
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.post('/api/track', async (req, res) => {
    console.log("[DATA MASUK]", req.body);
    const { bus_id, latitude, longitude, speed, gas_level } = req.body;

    if (!bus_id) return res.status(400).send("Data invalid");

    const { error } = await supabase
        .from('bipol_tracker')
        .insert([{ bus_id, latitude, longitude, speed, gas_level }]);

    if (error) {
        console.error("DB Error:", error.message);
        return res.status(500).send("DB Error");
    }
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

app.listen(PORT, () => {
    console.log(`🚀 Server HIDUP di Port ${PORT}`);
});
