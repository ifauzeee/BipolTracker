require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fix() {
    console.log("Updating Halte PNJ location to match BUS-01...");


    const { data, error } = await supabase
        .from('geofences')
        .update({ latitude: -6.377937, longitude: 106.81665 })
        .eq('id', 1)
        .select();

    if (error) console.error("Error:", error);
    else console.log("Updated:", data);
}

fix();
