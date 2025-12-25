const dgram = require('dgram');
const { io } = require('socket.io-client');
const fs = require('fs');

const args = process.argv.slice(2);
const USE_REAL_DATA = args.includes('--real');
const TEST_DURATION = parseInt(process.env.TEST_DURATION) || 60;

const SERVER_HOST = process.env.TEST_HOST || 'localhost';
const UDP_PORT = process.env.UDP_PORT || 3333;
const WS_PORT = process.env.PORT || 3000;
const TEST_DURATION_MS = TEST_DURATION * 1000;
const SEND_INTERVAL_MS = 1000;

const stats = {
    packetsSent: 0,
    packetsReceived: 0,
    wsEventsReceived: 0,
    latencies: [],
    startTime: null,
    endTime: null,
    busId: USE_REAL_DATA ? null : 'QOS-TEST-01',
    realDataReceived: []
};

console.log('\n🧪 BIPOL QoS Latency Test');
console.log('═'.repeat(55));
console.log(`📊 Mode: ${USE_REAL_DATA ? '🔴 REAL DATA (ESP32)' : '🔵 DUMMY DATA (Simulasi)'}`);
console.log(`📡 UDP Target: ${SERVER_HOST}:${UDP_PORT}`);
console.log(`🔌 WebSocket: http://${SERVER_HOST}:${WS_PORT}`);
console.log(`⏱️  Duration: ${TEST_DURATION} detik`);
console.log('═'.repeat(55));

const udpClient = USE_REAL_DATA ? null : dgram.createSocket('udp4');
const socket = io(`http://${SERVER_HOST}:${WS_PORT}`, {
    transports: ['websocket'],
    reconnection: true
});

const sentPackets = new Map();
let lastRealDataTime = null;

socket.on('connect', () => {
    console.log('✅ WebSocket connected\n');
    stats.startTime = Date.now();

    if (USE_REAL_DATA) {
        console.log('📡 Menunggu data dari ESP32 asli...\n');
    } else {
        console.log('🚀 Mengirim data simulasi...\n');
        startDummyTest();
    }

    setTimeout(() => {
        finishTest();
    }, TEST_DURATION_MS);
});

socket.on('update_bus', (data) => {
    const receiveTime = Date.now();
    stats.wsEventsReceived++;

    if (USE_REAL_DATA) {
        if (lastRealDataTime) {
            const interval = receiveTime - lastRealDataTime;
            stats.latencies.push(interval);
        }
        lastRealDataTime = receiveTime;
        stats.packetsReceived++;

        stats.realDataReceived.push({
            time: new Date().toISOString(),
            bus_id: data.bus_id,
            lat: data.latitude,
            lon: data.longitude,
            speed: data.speed,
            gas: data.gas_level
        });

        if (!stats.busId) stats.busId = data.bus_id;

        const speedStr = data.speed !== undefined ? `${data.speed} km/h` : 'N/A';
        const statusIcon = data.speed === 0 ? '🅿️' : '🚗';

        console.log(`${statusIcon} [${new Date().toLocaleTimeString('id-ID')}] ${data.bus_id}`);
        console.log(`   📍 ${data.latitude?.toFixed(6)}, ${data.longitude?.toFixed(6)}`);
        console.log(`   🚀 ${speedStr} | 💨 Gas: ${data.gas_level || 'N/A'}\n`);

    } else {
        const key = `${data.bus_id}-${data.latitude.toFixed(6)}-${data.longitude.toFixed(6)}`;

        if (sentPackets.has(key)) {
            const sendTime = sentPackets.get(key);
            const latency = receiveTime - sendTime;
            stats.latencies.push(latency);
            sentPackets.delete(key);
            stats.packetsReceived++;

            console.log(`📨 Latency: ${latency}ms | Bus: ${data.bus_id} | Speed: ${data.speed}`);
        }
    }
});

socket.on('connect_error', (err) => {
    console.error('❌ WebSocket error:', err.message);
});

function generateDummyPacket() {
    const lat = -6.2 + (Math.random() * 0.1);
    const lon = 106.8 + (Math.random() * 0.1);
    const speed = Math.floor(Math.random() * 60);
    const gas = Math.floor(Math.random() * 1000);
    const busId = 'QOS-TEST-01';

    return {
        csv: `${busId},${lat.toFixed(6)},${lon.toFixed(6)},${speed},${gas}`,
        key: `${busId}-${lat.toFixed(6)}-${lon.toFixed(6)}`
    };
}

function sendDummyPacket() {
    const packet = generateDummyPacket();
    const sendTime = Date.now();
    const message = Buffer.from(packet.csv);

    sentPackets.set(packet.key, sendTime);
    stats.packetsSent++;

    udpClient.send(message, UDP_PORT, SERVER_HOST, (err) => {
        if (err) {
            console.error('❌ UDP send error:', err.message);
            sentPackets.delete(packet.key);
        }
    });
}

function startDummyTest() {
    const sendInterval = setInterval(() => {
        sendDummyPacket();
    }, SEND_INTERVAL_MS);

    setTimeout(() => {
        clearInterval(sendInterval);
    }, TEST_DURATION_MS - 1000);
}

function calculateStats(arr) {
    if (arr.length === 0) return { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0 };

    const sorted = [...arr].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: Math.round(sum / sorted.length),
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
        p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]
    };
}

function finishTest() {
    stats.endTime = Date.now();
    const duration = (stats.endTime - stats.startTime) / 1000;
    const latencyStats = calculateStats(stats.latencies);

    const totalPackets = USE_REAL_DATA ? stats.packetsReceived : stats.packetsSent;
    const deliveryRatio = totalPackets > 0 ?
        (USE_REAL_DATA ? 100 : (stats.packetsReceived / stats.packetsSent * 100)) : 0;

    console.log('\n' + '═'.repeat(55));
    console.log('📊 HASIL PENGUJIAN QoS LATENCY');
    console.log('═'.repeat(55));
    console.log(`\n📊 Mode: ${USE_REAL_DATA ? 'REAL DATA (ESP32)' : 'DUMMY DATA (Simulasi)'}`);
    console.log(`⏱️  Durasi: ${duration.toFixed(2)} detik`);

    if (USE_REAL_DATA) {
        console.log(`\n🚌 Bus ID: ${stats.busId || 'N/A'}`);
        console.log(`📦 Packets Received: ${stats.packetsReceived}`);
        console.log(`📈 Packet Rate: ${(stats.packetsReceived / duration).toFixed(2)}/sec`);

        if (stats.realDataReceived.length > 0) {
            const lastData = stats.realDataReceived[stats.realDataReceived.length - 1];
            console.log(`\n📍 Last Position: ${lastData.lat?.toFixed(6)}, ${lastData.lon?.toFixed(6)}`);
            console.log(`🚀 Last Speed: ${lastData.speed} km/h`);
            console.log(`💨 Last Gas: ${lastData.gas}`);
        }
    } else {
        console.log(`\n📤 UDP Packets Sent: ${stats.packetsSent}`);
        console.log(`📥 WS Events Received: ${stats.wsEventsReceived}`);
        console.log(`📦 Packet Delivery: ${deliveryRatio.toFixed(2)}%`);
    }

    if (stats.latencies.length > 0) {
        const metricLabel = USE_REAL_DATA ? 'INTERVAL PAKET' : 'LATENSI END-TO-END';
        console.log(`\n📈 ${metricLabel}:`);
        console.log(`   Minimum:  ${latencyStats.min} ms`);
        console.log(`   Maximum:  ${latencyStats.max} ms`);
        console.log(`   Average:  ${latencyStats.avg} ms`);
        console.log(`   Median:   ${latencyStats.median} ms`);
        console.log(`   P95:      ${latencyStats.p95} ms`);
        console.log(`   P99:      ${latencyStats.p99} ms`);
    }

    console.log('\n📋 QoS ASSESSMENT:');
    if (USE_REAL_DATA) {
        if (stats.packetsReceived > 0) {
            console.log('   ✅ ESP32 Data: RECEIVED');
            const rate = stats.packetsReceived / duration;
            console.log(`   ${rate >= 0.5 ? '✅' : '⚠️'}  Packet Rate: ${rate >= 0.5 ? 'GOOD' : 'LOW'} (${rate.toFixed(2)}/s)`);
        } else {
            console.log('   ❌ ESP32 Data: NOT RECEIVED');
        }
    } else {
        if (latencyStats.avg < 500) console.log('   ✅ Latency: EXCELLENT (< 500ms)');
        else if (latencyStats.avg < 1000) console.log('   ⚠️  Latency: ACCEPTABLE (500-1000ms)');
        else console.log('   ❌ Latency: POOR (> 1000ms)');

        if (deliveryRatio > 95) console.log('   ✅ Packet Delivery: EXCELLENT (> 95%)');
        else if (deliveryRatio > 80) console.log('   ⚠️  Packet Delivery: ACCEPTABLE (80-95%)');
        else console.log('   ❌ Packet Delivery: POOR (< 80%)');
    }

    console.log('\n' + '═'.repeat(55));

    const report = {
        testDate: new Date().toISOString(),
        mode: USE_REAL_DATA ? 'real' : 'dummy',
        durationSeconds: duration,
        config: { SERVER_HOST, UDP_PORT, WS_PORT },
        results: USE_REAL_DATA ? {
            busId: stats.busId,
            packetsReceived: stats.packetsReceived,
            packetRate: stats.packetsReceived / duration,
            interval: latencyStats,
            lastPosition: stats.realDataReceived[stats.realDataReceived.length - 1] || null
        } : {
            packetsSent: stats.packetsSent,
            packetsReceived: stats.packetsReceived,
            deliveryRatio,
            latency: latencyStats
        },
        rawData: USE_REAL_DATA ? stats.realDataReceived : stats.latencies
    };

    const modeStr = USE_REAL_DATA ? 'real' : 'dummy';
    const reportPath = `./tests/qos_latency_${modeStr}_${Date.now()}.json`;

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