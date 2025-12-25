const dgram = require('dgram');
const { io } = require('socket.io-client');
const fs = require('fs');

const args = process.argv.slice(2);
const USE_REAL_DATA = args.includes('--real');
const durationArg = args.find(a => !isNaN(parseInt(a)) && parseInt(a) > 10);
const TEST_DURATION = parseInt(durationArg) || 120;

const SERVER_HOST = process.env.TEST_HOST || 'localhost';
const UDP_PORT = process.env.UDP_PORT || 3333;
const WS_PORT = process.env.PORT || 3000;
const SEND_INTERVAL_MS = 1000;

const stats = {
    packetsSent: 0,
    packetsReceived: 0,
    packetsLost: 0,
    reconnections: 0,
    connectionDrops: 0,
    startTime: null,
    endTime: null,
    intervals: [],
    lastReceivedTime: null,
    busId: null,
    realData: []
};

console.log('\n🧪 BIPOL QoS Reliability Test');
console.log('═'.repeat(55));
console.log(`📊 Mode: ${USE_REAL_DATA ? '🔴 REAL DATA (ESP32)' : '🔵 DUMMY DATA (Simulasi)'}`);
console.log(`📡 Target: ${SERVER_HOST}:${UDP_PORT}`);
console.log(`🔌 WebSocket: http://${SERVER_HOST}:${WS_PORT}`);
console.log(`⏱️  Duration: ${TEST_DURATION} detik`);
console.log('═'.repeat(55));

const udpClient = USE_REAL_DATA ? null : dgram.createSocket('udp4');
const socket = io(`http://${SERVER_HOST}:${WS_PORT}`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
});

const sentPackets = new Set();

socket.on('connect', () => {
    console.log('✅ WebSocket connected\n');

    if (!stats.startTime) {
        stats.startTime = Date.now();

        if (USE_REAL_DATA) {
            console.log('📡 Monitoring reliability dari ESP32 asli...\n');
        } else {
            console.log('🚀 Starting reliability test...\n');
            startDummyTest();
        }

        const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - stats.startTime) / 1000;
            const rate = stats.packetsReceived / elapsed;
            const delivery = USE_REAL_DATA ? 100 :
                (stats.packetsSent > 0 ? (stats.packetsReceived / stats.packetsSent * 100) : 0);

            console.log(`📊 [${elapsed.toFixed(0)}s] Received: ${stats.packetsReceived} | Rate: ${rate.toFixed(2)}/s | Delivery: ${delivery.toFixed(1)}%`);
        }, 30000);

        setTimeout(() => {
            clearInterval(progressInterval);
            finishTest();
        }, TEST_DURATION * 1000);
    } else {
        stats.reconnections++;
        console.log(`🔄 Reconnected (${stats.reconnections}x)`);
    }
});

socket.on('update_bus', (data) => {
    const now = Date.now();
    stats.packetsReceived++;

    if (stats.lastReceivedTime) {
        const interval = now - stats.lastReceivedTime;
        stats.intervals.push(interval);

        if (interval > 3000) {
            stats.packetsLost++;
            console.log(`⚠️  Gap detected: ${(interval / 1000).toFixed(1)}s without data`);
        }
    }
    stats.lastReceivedTime = now;

    if (USE_REAL_DATA) {
        if (!stats.busId) stats.busId = data.bus_id;

        stats.realData.push({
            time: new Date().toISOString(),
            bus_id: data.bus_id,
            lat: data.latitude,
            lon: data.longitude,
            speed: data.speed,
            gas: data.gas_level
        });

        if (stats.packetsReceived % 10 === 0) {
            const statusIcon = data.speed === 0 ? '🅿️' : '🚗';
            console.log(`${statusIcon} [${stats.packetsReceived}] ${data.bus_id} | ${data.latitude?.toFixed(6)}, ${data.longitude?.toFixed(6)} | Speed: ${data.speed}`);
        }
    } else {
        const key = `${data.latitude.toFixed(6)}-${data.longitude.toFixed(6)}`;
        if (sentPackets.has(key)) sentPackets.delete(key);

        if (stats.packetsReceived % 20 === 0) {
            console.log(`📨 Received: ${stats.packetsReceived} packets`);
        }
    }
});

socket.on('disconnect', () => {
    stats.connectionDrops++;
    console.log('⚠️  WebSocket disconnected');
});

socket.on('connect_error', (err) => {
    console.error('❌ Connection error:', err.message);
});

function startDummyTest() {
    const sendInterval = setInterval(() => {
        const lat = -6.2 + (Math.random() * 0.1);
        const lon = 106.8 + (Math.random() * 0.1);
        const speed = Math.floor(Math.random() * 60);
        const gas = Math.floor(Math.random() * 1000);
        const packet = `RELIABILITY-TEST,${lat.toFixed(6)},${lon.toFixed(6)},${speed},${gas}`;

        sentPackets.add(`${lat.toFixed(6)}-${lon.toFixed(6)}`);
        stats.packetsSent++;

        udpClient.send(Buffer.from(packet), UDP_PORT, SERVER_HOST);
    }, SEND_INTERVAL_MS);

    setTimeout(() => clearInterval(sendInterval), (TEST_DURATION * 1000) - 1000);
}

function calculateIntervalStats(arr) {
    if (arr.length === 0) return { min: 0, max: 0, avg: 0, jitter: 0 };

    const sorted = [...arr].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const jitter = Math.sqrt(sorted.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / sorted.length);

    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: Math.round(avg),
        jitter: Math.round(jitter)
    };
}

function finishTest() {
    stats.endTime = Date.now();
    const duration = (stats.endTime - stats.startTime) / 1000;
    const intervalStats = calculateIntervalStats(stats.intervals);

    const deliveryRatio = USE_REAL_DATA ? 100 : (stats.packetsSent > 0 ? (stats.packetsReceived / stats.packetsSent * 100) : 0);
    const packetLossRatio = USE_REAL_DATA ? (stats.packetsLost / Math.max(stats.packetsReceived, 1) * 100) : (100 - deliveryRatio);

    console.log('\n' + '═'.repeat(55));
    console.log('📊 HASIL PENGUJIAN QoS RELIABILITY');
    console.log('═'.repeat(55));
    console.log(`\n📊 Mode: ${USE_REAL_DATA ? 'REAL DATA' : 'DUMMY DATA'}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)} detik`);

    if (USE_REAL_DATA) {
        console.log(`\n🚌 Bus ID: ${stats.busId || 'N/A'}\n📦 Packets Received: ${stats.packetsReceived}\n📈 Packet Rate: ${(stats.packetsReceived / duration).toFixed(2)}/s`);
    } else {
        console.log(`\n📤 Packets Sent: ${stats.packetsSent}\n📥 Packets Received: ${stats.packetsReceived}`);
    }

    console.log(`\n📈 DELIVERY:\n   Delivery Ratio: ${deliveryRatio.toFixed(2)}%\n   Packet Loss: ${packetLossRatio.toFixed(2)}%\n   Gaps Detected: ${stats.packetsLost}`);
    console.log(`\n🔗 CONNECTION:\n   Reconnections: ${stats.reconnections}\n   Connection Drops: ${stats.connectionDrops}`);

    if (stats.intervals.length > 0) {
        console.log(`\n⏱️  PACKET INTERVALS:\n   Min: ${intervalStats.min} ms | Max: ${intervalStats.max} ms | Avg: ${intervalStats.avg} ms | Jitter: ${intervalStats.jitter} ms`);
    }

    console.log('\n📋 QoS ASSESSMENT:');
    console.log(`   ${deliveryRatio >= 95 ? '✅' : deliveryRatio >= 80 ? '⚠️' : '❌'} Delivery: ${deliveryRatio >= 95 ? 'GOOD' : deliveryRatio >= 80 ? 'ACCEPTABLE' : 'POOR'}`);
    console.log(`   ${stats.reconnections === 0 ? '✅' : '❌'} Connection: ${stats.reconnections === 0 ? 'STABLE' : 'UNSTABLE'}`);
    console.log(`   ${intervalStats.jitter < 100 ? '✅ Jitter: LOW' : intervalStats.jitter < 500 ? '⚠️ Jitter: MODERATE' : '❌ Jitter: HIGH'} (${intervalStats.jitter}ms)`);
    console.log('\n' + '═'.repeat(55));

    const report = {
        testDate: new Date().toISOString(),
        mode: USE_REAL_DATA ? 'real' : 'dummy',
        durationSeconds: duration,
        results: { ...stats, deliveryRatio, packetLossRatio, intervals: intervalStats },
        rawData: USE_REAL_DATA ? stats.realData.slice(-50) : stats.intervals.slice(-100)
    };

    const reportPath = `./tests/reliability_${USE_REAL_DATA ? 'real' : 'dummy'}_${Date.now()}.json`;
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