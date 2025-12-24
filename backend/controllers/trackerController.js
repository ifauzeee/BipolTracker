const supabase = require('../config/supabase');
const sanitizeInput = require('../utils/sanitizer');
const validate = require('../utils/validators');
const { setToCache } = require('../utils/cache');
const { checkGeofence } = require('../services/geofenceService');

exports.trackBus = async (req, res) => {
    try {
        const bus_id = sanitizeInput(req.body.bus_id);
        const latitude = parseFloat(req.body.latitude);
        const longitude = parseFloat(req.body.longitude);
        const speed = parseFloat(req.body.speed);
        const gas_level = parseInt(req.body.gas_level);

        if (!bus_id || !validate.coordinate(latitude) || !validate.coordinate(longitude)) {
            return res.status(400).send("Data invalid");
        }

        const insertData = {
            bus_id,
            latitude,
            longitude,
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

        const io = req.app.get('io');
        if (io) io.emit("update_bus", data[0]);

        res.status(200).send("OK");
    } catch (err) {
        console.error(`❌ Track Error:`, err.message);
        res.status(500).send("Error");
    }
};

exports.getLocations = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bipol_tracker')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const latest = {};
        data.forEach(d => {
            if (!latest[d.bus_id]) latest[d.bus_id] = d;
        });

        res.json({ data: Object.values(latest) });
    } catch (err) {
        console.error('Get bus location error:', err.message);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
};

exports.getBusPlates = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('drivers')
            .select('bus_plate')
            .order('bus_plate', { ascending: true });

        if (error) throw error;
        res.json(data.map(d => d.bus_plate));
    } catch (err) {
        console.error('Get bus plates error:', err.message);
        res.status(500).json({ error: 'Failed to fetch bus list' });
    }
};