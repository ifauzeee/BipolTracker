const supabase = require('../config/supabase');

function getLogTime() {
    return new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Jakarta'
    });
}

async function cleanupOldData() {
    try {
        const retentionHours = parseInt(process.env.DATA_RETENTION_HOURS) || 24;
        const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();

        const { error } = await supabase
            .from('bipol_tracker')
            .delete()
            .lt('created_at', cutoffDate);

        if (error) throw error;
        console.log(`🧹 [${getLogTime()}] Auto-Cleanup: Deleted data older than ${retentionHours}h.`);
    } catch (err) {
        console.error(`❌ [${getLogTime()}] Cleanup Failed:`, err.message);
    }
}

function startCleanupJobs() {
    setInterval(cleanupOldData, 60 * 60 * 1000);
    cleanupOldData();
}

module.exports = { startCleanupJobs };