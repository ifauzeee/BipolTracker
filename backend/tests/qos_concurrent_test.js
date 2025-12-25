const { io } = require('socket.io-client');
const fs = require('fs');

const args = process.argv.slice(2);
const USE_REAL_DATA = args.includes('--real');
const numArg = args.find(a => !isNaN(parseInt(a)));
const NUM_CONNECTIONS = USE_REAL_DATA ? 1 : (parseInt(numArg) || 50);
const HOLD_DURATION = USE_REAL_DATA ? (parseInt(numArg) || 60) : 60;

const SERVER_HOST = process.env.TEST_HOST || 'localhost';
const WS_PORT = process.env.PORT || 3000;

const stats = {
    connectionsAttempted: 0,
    connectionsSuccessful: 0,
    connectionsFailed: 0,
    disconnections: 0,
    eventsReceived: 0,
    activeConnections: 0,
    startTime: null,
    endTime: null,
    realClients: new Set(),
    busData: new Map()
};

const clients = [];

console.log('');
console.log('🧪 BIPOL QoS Concurrent Connections Test');
console.log('═'.repeat(55));
console.log(`📊 Mode: ${USE_REAL_DATA ? '🔴 REAL DATA (Monitor)' : '🔵 DUMMY DATA (Stress Test)'}`);
if (!USE_REAL_DATA) {
    console.log(`🔌 Target Connections: ${NUM_CONNECTIONS}`);
}
console.log(`🔗 WebSocket: http://${SERVER_HOST}:${WS_PORT}`);
console.log(`⏱️  Duration: ${HOLD_DURATION} detik`);
console.log('═'.repeat(55));

if (USE_REAL_DATA) {
    startRealMonitor();
} else {
    startStressTest();
}

function startRealMonitor() {
    console.log('\n📡 Monitoring koneksi aktif...\n');
    stats.startTime = Date.now();

    const socket = io(`http://${SERVER_HOST}:${WS_PORT}`, {
        transports: ['websocket'],
        reconnection: true
    });

    socket.on('connect', () => {
        console.log('✅ Connected to server\n');
        stats.connectionsSuccessful = 1;
        stats.activeConnections = 1;
    });

    socket.on('update_bus', (data) => {
        stats.eventsReceived++;
        if (!stats.busData.has(data.bus_id)) {
            stats.busData.set(data.bus_id, {
                count: 0,
                firstSeen: Date.now(),
                lastSeen: Date.now()
            });
            console.log(`🚌 New bus detected: ${data.bus_id}`);
        }
        stats.busData.get(data.bus_id).count++;
        stats.busData.get(data.bus_id).lastSeen = Date.now();
    });

    socket.on('disconnect', () => {
        stats.disconnections++;
        stats.activeConnections = 0;
    });

    const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        console.log(`📊 [${elapsed.toFixed(0)}s] Events: ${stats.eventsReceived} | Buses: ${stats.busData.size}`);
    }, 10000);

    setTimeout(() => {
        clearInterval(progressInterval);
        socket.disconnect();
        finishTest();
    }, HOLD_DURATION * 1000);
}

function startStressTest() {
    console.log('\n🔌 Creating connections...\n');
    stats.startTime = Date.now();

    for (let i = 0; i < NUM_CONNECTIONS; i++) {
        setTimeout(() => {
            createConnection(i + 1);
        }, i * 50);
    }

    const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        console.log(`📊 [${elapsed.toFixed(0)}s] Active: ${stats.activeConnections}/${NUM_CONNECTIONS} | Events: ${stats.eventsReceived}`);
    }, 10000);

    setTimeout(() => {
        clearInterval(progressInterval);
        finishTest();
    }, HOLD_DURATION * 1000);
}

function createConnection(id) {
    stats.connectionsAttempted++;

    const socket = io(`http://${SERVER_HOST}:${WS_PORT}`, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 10000
    });

    socket.on('connect', () => {
        stats.connectionsSuccessful++;
        stats.activeConnections++;
        if (stats.connectionsSuccessful % 10 === 0 || stats.connectionsSuccessful === NUM_CONNECTIONS) {
            console.log(`✅ Connected: ${stats.connectionsSuccessful}/${NUM_CONNECTIONS}`);
        }
    });

    socket.on('update_bus', () => {
        stats.eventsReceived++;
    });

    socket.on('connect_error', (err) => {
        stats.connectionsFailed++;
        console.log(`❌ Connection ${id} failed: ${err.message}`);
    });

    socket.on('disconnect', () => {
        stats.disconnections++;
        stats.activeConnections--;
    });

    clients.push(socket);
}

function finishTest() {
    stats.endTime = Date.now();
    const duration = (stats.endTime - stats.startTime) / 1000;
    const stabilityRate = stats.connectionsSuccessful > 0 ?
        ((stats.connectionsSuccessful - stats.disconnections) / stats.connectionsSuccessful * 100) : 0;

    console.log('\n' + '═'.repeat(55));
    console.log('📊 HASIL PENGUJIAN QoS CONCURRENT');
    console.log('═'.repeat(55));
    console.log(`\n📊 Mode: ${USE_REAL_DATA ? 'REAL MONITOR' : 'STRESS TEST'}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)} detik`);

    if (USE_REAL_DATA) {
        console.log(`\n🚌 Unique Buses: ${stats.busData.size}`);
        console.log(`📨 Events Received: ${stats.eventsReceived}`);
        console.log(`📈 Events/Second: ${(stats.eventsReceived / duration).toFixed(2)}`);
        if (stats.busData.size > 0) {
            console.log('\n🚌 Bus Details:');
            stats.busData.forEach((data, busId) => {
                console.log(`   ${busId}: ${data.count} events`);
            });
        }
    } else {
        console.log(`\n🔌 Connections Attempted: ${stats.connectionsAttempted}`);
        console.log(`✅ Connections Successful: ${stats.connectionsSuccessful}`);
        console.log(`❌ Connections Failed: ${stats.connectionsFailed}`);
        console.log(`⚡ Disconnections: ${stats.disconnections}`);
        console.log(`📊 Active at End: ${stats.activeConnections}`);
        console.log(`📈 Stability Rate: ${stabilityRate.toFixed(2)}%`);
        console.log(`📨 Total Events: ${stats.eventsReceived}`);
    }

    console.log('\n📋 QoS ASSESSMENT:');
    if (USE_REAL_DATA) {
        if (stats.eventsReceived > 0) {
            console.log('   ✅ Connection: STABLE');
            console.log(`   ✅ Data Flow: ACTIVE (${stats.eventsReceived} events)`);
        } else {
            console.log('   ⚠️  No events received');
        }
    } else {
        if (stats.connectionsSuccessful === NUM_CONNECTIONS) {
            console.log('   ✅ Connections: ALL SUCCESSFUL');
        } else {
            console.log(`   ⚠️  Connections: ${stats.connectionsSuccessful}/${NUM_CONNECTIONS}`);
        }

        if (stabilityRate >= 95) {
            console.log('   ✅ Stability: EXCELLENT (≥95%)');
        } else if (stabilityRate >= 80) {
            console.log('   ⚠️  Stability: ACCEPTABLE (80-95%)');
        } else {
            console.log('   ❌ Stability: POOR (<80%)');
        }
    }

    console.log('\n' + '═'.repeat(55));

    const report = {
        testDate: new Date().toISOString(),
        mode: USE_REAL_DATA ? 'real' : 'dummy',
        durationSeconds: duration,
        config: {
            serverHost: SERVER_HOST,
            wsPort: WS_PORT,
            targetConnections: USE_REAL_DATA ? 1 : NUM_CONNECTIONS
        },
        results: USE_REAL_DATA ? {
            uniqueBuses: stats.busData.size,
            eventsReceived: stats.eventsReceived,
            eventsPerSecond: stats.eventsReceived / duration
        } : {
            connectionsAttempted: stats.connectionsAttempted,
            connectionsSuccessful: stats.connectionsSuccessful,
            connectionsFailed: stats.connectionsFailed,
            disconnections: stats.disconnections,
            activeAtEnd: stats.activeConnections,
            stabilityRate: stabilityRate,
            eventsReceived: stats.eventsReceived
        }
    };

    const modeStr = USE_REAL_DATA ? 'real' : 'dummy';
    const reportPath = `./tests/concurrent_${modeStr}_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 Report: ${reportPath}`);

    clients.forEach(c => c.disconnect());
    process.exit(0);
}

process.on('SIGINT', () => {
    console.log('\n⚠️  Test interrupted');
    finishTest();
});
