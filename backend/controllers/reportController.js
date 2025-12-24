const supabase = require('../config/supabase');
const sanitizeInput = require('../utils/sanitizer');
const validate = require('../utils/validators');

exports.createLostItem = async (req, res) => {
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

        const io = req.app.get('io');
        if (io) io.emit('new_lost_item', data[0]);

        res.json({ success: true, data: data[0] });
    } catch (err) {
        console.error('Create lost item error:', err.message);
        res.status(500).json({ error: 'Failed to submit report' });
    }
};

exports.getLostItems = async (req, res) => {
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
};

exports.updateLostItemStatus = async (req, res) => {
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

        const io = req.app.get('io');
        if (io) io.emit('update_lost_item', data[0]);

        res.json({ success: true, data: data[0] });
    } catch (err) {
        console.error('Update lost item error:', err.message);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

exports.deleteLostItem = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('lost_items')
            .delete()
            .eq('id', id);

        if (error) throw error;

        const io = req.app.get('io');
        if (io) io.emit('update_lost_item');

        res.json({ success: true });
    } catch (err) {
        console.error('Delete lost item error:', err.message);
        res.status(500).json({ error: 'Failed to delete report' });
    }
};

exports.createFeedback = async (req, res) => {
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

        const io = req.app.get('io');
        if (io) io.emit('new_feedback', data[0]);

        res.json({ success: true, data: data[0] });
    } catch (err) {
        console.error('Submit feedback error:', err.message);
        res.status(500).json({ error: 'Gagal mengirim masukan' });
    }
};

exports.getFeedback = async (req, res) => {
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
};

exports.deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('feedback')
            .delete()
            .eq('id', id);

        if (error) throw error;

        const io = req.app.get('io');
        if (io) io.emit('update_feedback');

        res.json({ success: true });
    } catch (err) {
        console.error('Delete feedback error:', err.message);
        res.status(500).json({ error: 'Failed to delete feedback' });
    }
};

exports.getDriverLostItems = async (req, res) => {
    if (!req.session || !req.session.driver) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { data, error } = await supabase
            .from('lost_items')
            .select('*')
            .eq('bus_plate', req.session.driver.bus_plate)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Fetch driver lost items error:', err.message);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
};

exports.resolveDriverLostItem = async (req, res) => {
    try {
        if (!req.session || !req.session.driver) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const driverPlate = req.session.driver.bus_plate;

        const { data: itemData, error: fetchError } = await supabase
            .from('lost_items')
            .select('bus_plate')
            .eq('id', id)
            .single();

        if (fetchError || !itemData) return res.status(404).json({ error: 'Item not found' });
        if (itemData.bus_plate !== driverPlate) return res.status(403).json({ error: 'Not your bus' });

        const { error } = await supabase
            .from('lost_items')
            .update({ status: 'resolved' })
            .eq('id', id);

        if (error) throw error;

        const io = req.app.get('io');
        if (io) io.emit('update_lost_items');

        res.json({ success: true });
    } catch (err) {
        console.error('Resolve item error:', err.message);
        res.status(500).json({ error: 'Failed to resolve item' });
    }
};
