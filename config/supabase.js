require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Config .env belum lengkap!");
    process.exit(1);
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

module.exports = supabase;
