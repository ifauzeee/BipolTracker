const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const validate = require('../utils/validators');
const sanitizeInput = require('../utils/sanitizer');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .ilike('username', sanitizeInput(username))
            .single();

        if (adminData && !adminError) {
            const match = await bcrypt.compare(password.trim(), adminData.password_hash);
            if (match) {
                req.session.admin = { id: adminData.id, username: adminData.username };
                return res.json({ success: true, role: 'admin', redirect: '/admin' });
            }
        }

        let busPlate = username;
        let formattedPlate = busPlate.toUpperCase().replace(/\s/g, '');
        const plateRegex = /^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/;
        const matchPlate = formattedPlate.match(plateRegex);
        if (matchPlate) {
            busPlate = `${matchPlate[1]} ${matchPlate[2]} ${matchPlate[3]}`.trim();
        }

        const { data: driverData, error: driverError } = await supabase
            .from('drivers')
            .select('*')
            .eq('bus_plate', sanitizeInput(busPlate))
            .single();

        if (driverData && !driverError) {
            const match = await bcrypt.compare(password, driverData.password_hash);
            if (match) {
                req.session.driver = { id: driverData.id, bus_plate: driverData.bus_plate, name: driverData.driver_name };
                return res.json({ success: true, role: 'driver', redirect: '/driver/dashboard' });
            }
        }

        console.warn(`[Login] Gagal: '${username}' tidak ditemukan di Admin maupun Driver, atau password salah.`);
        return res.status(401).json({ success: false, message: 'Username/Plat atau Password salah' });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.driverLogin = async (req, res) => {
    try {
        const { bus_plate, password } = req.body;

        if (!bus_plate || !password) return res.status(400).json({ error: 'Missing credentials' });

        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('bus_plate', sanitizeInput(bus_plate))
            .single();

        if (error || !data) return res.status(401).json({ success: false, message: 'Bus not found' });

        const match = await bcrypt.compare(password, data.password_hash);
        if (!match) return res.status(401).json({ success: false, message: 'Invalid password' });

        req.session.driver = { id: data.id, bus_plate: data.bus_plate, name: data.driver_name };
        res.json({ success: true });
    } catch (err) {
        console.error('Driver login error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.changePassword = async (req, res) => {
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
};

exports.status = (req, res) => {
    res.json({ loggedIn: !!(req.session && req.session.admin) });
};

exports.driverStatus = (req, res) => {
    if (req.session && req.session.driver) {
        res.json({ loggedIn: true, driver: req.session.driver });
    } else {
        res.json({ loggedIn: false });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout error:', err);
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
};
