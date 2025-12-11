require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    console.log("Testing connection...");
    try {
        const { data, error } = await supabase.from('geofences').select('*');
        if (error) {
            console.error("Supabase API Error:", error);
        } else {
            console.log("Success! Data:", data);
        }
    } catch (e) {
        console.error("Fetch/Network Error:", e);
        if (e.cause) console.error("Cause:", e.cause);
    }
}

test();
