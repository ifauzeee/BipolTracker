require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
    console.log("Seeding Admin User...");

    const username = process.env.ADMIN_DEFAULT_USER || 'admin';
    const password = process.env.ADMIN_DEFAULT_PASS || 'admin123';
    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from('admin_users')
        .upsert([{ username, password_hash: hash }], { onConflict: 'username' })
        .select();

    if (error) console.error("Error:", error);
    else console.log("Admin created! User:", username, "Pass:", password);
}

seed();
