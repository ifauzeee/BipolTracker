const dgram = require('dgram');
const { io } = require('socket.io-client');
const fs = require('fs');

const args = process.argv.slice(2);
const USE_REAL_DATA = args.includes('--real');
const TEST_DURATION = parseInt(process.env.TEST_DURATION) || 30;

const SERVER_HOST = process.env.TEST_HOST || 'localhost';
const UDP_PORT = process.env.UDP_PORT || 3333;
const WS_PORT = process.env.PORT || 3000;
const NUM_BUSES = 10;
const SEND_INTERVAL_MS = 100;

const stats = {
    packetsSent: 0,
    packetsReceived: 0,
    bytesTotal: 0,
    errors: 0,
    startTime: null,
    endTime: null,
    busData: new Map()
};

console.log('\n🧪 BIPOL QoS Throughput Test');
console.log('═'.repeat(55));
console.log(`📊 Mode: ${USE_REAL_DATA ? '🔴 REAL DATA (ESP32)' : '🔵 DUMMY DATA (Stress Test)'}`);

if (!USE_REAL_DATA) {
    console.log(`🚌 Simulated Buses: ${NUM_BUSES}`);
    console.log(`📤 Send Rate: ${1000 / SEND_INTERVAL_MS} packets/sec per bus`);
}

console.log(`📡 Target: ${SERVER_HOST}:${UDP_PORT}`);
console.log(`⏱️  Duration: ${TEST_DURATION} detik`);
console.log('═'.repeat(55));

const udpClient = USE_REAL_DATA ? null : dgram.createSocket('udp4');
const socket = io(`http://${SERVER_HOST}:${WS_PORT}`, {
    transports: ['websocket'],
    reconnection: true
});

socket.on('connect', () => {
    console.log('✅ WebSocket connected\n');
    stats.startTime = Date.now();

    if (USE_REAL_DATA) {
        console.log('📡 Monitoring throughput dari ESP32 asli...\n');
    } else {
        console.log('🚀 Starting stress test...\n');
        startStressTest();
    }

    const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = stats.packetsReceived / elapsed;
        console.log(`📊 [${elapsed.toFixed(0)}s] Packets: ${stats.packetsReceived} | Rate: ${rate.toFixed(2)}/s`);
    }, 5000);

    setTimeout(() => {
        clearInterval(progressInterval);
        finishTest();
    }, TEST_DURATION * 1000);
});

socket.on('update_bus', (data) => {
    stats.packetsReceived++;

    if (!stats.busData.has(data.bus_id)) {
        stats.busData.set(data.bus_id, {
            count: 0,
            firstSeen: Date.now(),
            lastSeen: Date.now()
        });
    }

    const busStats = stats.busData.get(data.bus_id);
    busStats.count++;
    busStats.lastSeen = Date.now();

    const packetStr = `${data.bus_id},${data.latitude},${data.longitude},${data.speed},${data.gas_level || 0}`;
    stats.bytesTotal += packetStr.length;
});

socket.on('connect_error', (err) => {
    console.error('❌ WebSocket error:', err.message);
    stats.errors++;
});

function generateStressPacket(busIndex) {
    const lat = -6.2 + (Math.random() * 0.1);
    const lon = 106.8 + (Math.random() * 0.1);
    const speed = Math.floor(Math.random() * 60);
    const gas = Math.floor(Math.random() * 1000);
    const busId = `STRESS-BUS-${String(busIndex).padStart(2, '0')}`;

    return `${busId},${lat.toFixed(6)},${lon.toFixed(6)},${speed},${gas}`;
}

function startStressTest() {
    const sendInterval = setInterval(() => {
        for (let i = 1; i <= NUM_BUSES; i++) {
            const packet = generateStressPacket(i);
            const message = Buffer.from(packet);
            stats.packetsSent++;
            stats.bytesTotal += message.length;

            udpClient.send(message, UDP_PORT, SERVER_HOST, (err) => {
                if (err) stats.errors++;
            });
        }
    }, SEND_INTERVAL_MS);

    setTimeout(() => clearInterval(sendInterval), (TEST_DURATION * 1000) - 500);
}

function finishTest() {
    stats.endTime = Date.now();
    const duration = (stats.endTime - stats.startTime) / 1000;
    const packetsPerSec = stats.packetsReceived / duration;
    const throughputKBps = (stats.bytesTotal / 1024) / duration;
    const successRate = USE_REAL_DATA ? 100 : (stats.packetsSent > 0 ? (stats.packetsReceived / stats.packetsSent * 100) : 0);

    console.log('\n' + '═'.repeat(55));
    console.log('📊 HASIL PENGUJIAN QoS THROUGHPUT');
    console.log('═'.repeat(55));
    console.log(`\n📊 Mode: ${USE_REAL_DATA ? 'REAL DATA' : 'STRESS TEST'}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)} detik`);

    if (!USE_REAL_DATA) console.log(`📤 Packets Sent: ${stats.packetsSent}`);

    console.log(`📥 Packets Received: ${stats.packetsReceived}`);
    console.log(`📈 Packets/Second: ${packetsPerSec.toFixed(2)}`);
    console.log(`💾 Total Data: ${(stats.bytesTotal / 1024).toFixed(2)} KB`);
    console.log(`📊 Throughput: ${throughputKBps.toFixed(2)} KB/s`);

    if (!USE_REAL_DATA) {
        console.log(`✅ Success Rate: ${successRate.toFixed(2)}%`);
        console.log(`❌ Errors: ${stats.errors}`);
    }

    console.log(`\n🚌 Buses Detected: ${stats.busData.size}`);
    if (stats.busData.size > 0 && stats.busData.size <= 5) {
        stats.busData.forEach((data, busId) => console.log(`   ${busId}: ${data.count} packets`));
    }

    console.log('\n📋 QoS ASSESSMENT:');
    if (USE_REAL_DATA) {
        const isGood = packetsPerSec >= 0.5;
        console.log(`   ${isGood ? '✅' : '⚠️'} Throughput: ${isGood ? 'GOOD' : 'LOW'} (${packetsPerSec.toFixed(2)}/s)`);
    } else {
        console.log(`   ${successRate >= 95 ? '✅' : successRate >= 80 ? '⚠️' : '❌'} Success Rate: ${successRate >= 95 ? 'EXCELLENT' : successRate >= 80 ? 'ACCEPTABLE' : 'POOR'}`);
        console.log(`   ${stats.errors === 0 ? '✅' : '⚠️'} Errors: ${stats.errors === 0 ? 'NONE' : stats.errors}`);
    }

    console.log('\n' + '═'.repeat(55));

    const report = {
        testDate: new Date().toISOString(),
        mode: USE_REAL_DATA ? 'real' : 'dummy',
        durationSeconds: duration,
        results: { ...stats, packetsPerSecond: packetsPerSec, throughputKBps, successRate },
        busDetails: Object.fromEntries(stats.busData)
    };

    const reportPath = `./tests/throughput_${USE_REAL_DATA ? 'real' : 'dummy'}_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`💾 Report: ${reportPath}`);
    socket.disconnect();
    if (udpClient) udpClient.close();
    process.exit(0);
}

process.on('SIGINT', () => {
    console.log('\n⚠️  Test interrupted');
    finishTest();
});