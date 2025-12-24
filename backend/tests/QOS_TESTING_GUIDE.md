# 📊 Panduan Pengujian Quality of Service (QoS) - BIPOL Tracker

## 📁 Struktur File Test
```
tests/
├── qos_latency_test.js      # Test latensi end-to-end
├── qos_throughput_test.js    # Test throughput UDP
├── qos_concurrent_test.js    # Test koneksi simultan
├── qos_reliability_test.js   # Test reliabilitas & packet loss
└── QOS_TESTING_GUIDE.md      # Panduan ini
```

---

## 🚀 Persiapan

### 1. Install Dependencies
```bash
cd /root/tracker/BIPOL
npm install socket.io-client
```

### 2. Pastikan Server BIPOL Berjalan
```bash
npm run dev
# atau
node server.js
```

---

## 📋 Pengujian yang Tersedia

### 1️⃣ **Latency Test** - Mengukur Waktu Respons

**Apa yang diukur:**
- End-to-end latency (UDP send → WebSocket receive)
- Packet delivery ratio
- Statistik latensi (min, max, avg, median, P95, P99)

**Cara menjalankan:**
```bash
node tests/qos_latency_test.js
```

**Durasi:** 1 menit

**Output contoh:**
```
📊 HASIL PENGUJIAN QoS LATENCY
================================
⏱️  Durasi Test: 60.02 detik
📤 UDP Packets Sent: 60
📥 WS Events Received: 58
📦 Packet Delivery Ratio: 96.67%

📈 STATISTIK LATENSI (End-to-End):
   Minimum:  45 ms
   Maximum:  320 ms
   Average:  125 ms
   Median:   110 ms
   P95:      280 ms
   P99:      310 ms
```

---

### 2️⃣ **Throughput Test** - Mengukur Kapasitas Pengiriman

**Apa yang diukur:**
- Packets per second yang bisa dikirim
- Total throughput dalam KB/s
- Error rate

**Cara menjalankan:**
```bash
node tests/qos_throughput_test.js
```

**Durasi:** 30 detik

**Output contoh:**
```
📊 HASIL PENGUJIAN THROUGHPUT
================================
⏱️  Durasi: 30.00 detik
📤 Total Packets Sent: 300
📦 Total Data Sent: 18.50 KB
🚀 Throughput: 0.62 KB/s
📈 Packets per Second: 10.00 pps
✅ Success Rate: 100%
```

---

### 3️⃣ **Concurrent Connection Test** - Mengukur Skalabilitas

**Apa yang diukur:**
- Kemampuan server menangani banyak koneksi WebSocket
- Connection success rate
- Connection stability selama waktu tertentu

**Cara menjalankan:**
```bash
# Default 50 koneksi
node tests/qos_concurrent_test.js

# Custom jumlah koneksi (contoh: 100)
node tests/qos_concurrent_test.js 100
```

**Durasi:** ~1-2 menit tergantung jumlah koneksi

**Output contoh:**
```
📊 HASIL PENGUJIAN CONCURRENT CONNECTIONS
==========================================
👥 Target Connections: 50
✅ Successfully Connected: 50
❌ Failed to Connect: 0
📉 Disconnected During Test: 0
📊 Active at End: 50
📈 Connection Stability: 100%
```

---

### 4️⃣ **Reliability Test** - Mengukur Keandalan

**Apa yang diukur:**
- Packet delivery ratio jangka panjang
- Packet loss rate
- Frekuensi dan waktu reconnection

**Cara menjalankan:**
```bash
node tests/qos_reliability_test.js
```

**Durasi:** 2 menit

**Output contoh:**
```
📊 HASIL PENGUJIAN RELIABILITAS
================================
📤 Packets Sent: 240
📥 Packets Received: 238
📦 Packet Delivery Ratio: 99.17%
❌ Packet Loss: 0.83% (2 packets)

🔄 RECONNECTION STATS:
   Total Reconnections: 0
```

---

## 🌐 Pengujian dengan Wireshark

### Filter yang Berguna

| Tujuan | Filter Wireshark |
|--------|-----------------|
| Semua traffic UDP BIPOL | `udp.port == 3333` |
| Traffic WebSocket | `websocket` |
| Traffic HTTP/WS ke server | `tcp.port == 3000` |
| Hanya paket dari IP tertentu | `ip.src == 192.168.x.x` |

### Cara Capture

1. **Buka Wireshark**
2. **Pilih network interface** yang digunakan (biasanya `eth0` atau `wlan0`)
3. **Masukkan filter** `udp.port == 3333 or tcp.port == 3000`
4. **Klik Capture → Start**
5. **Jalankan test script**
6. **Stop capture** setelah test selesai

### Metrik yang Bisa Diambil dari Wireshark

1. **Statistics → Protocol Hierarchy**
   - Lihat distribusi protokol (UDP vs TCP)

2. **Statistics → IO Graphs**
   - Visualisasi throughput sepanjang waktu

3. **Statistics → Conversations**
   - Lihat statistik per koneksi

4. **Analyze → Expert Information**
   - Lihat masalah yang terdeteksi (retransmission, dll)

---

## 📊 Kriteria Keberhasilan QoS

| Parameter | Target | Excellent | Acceptable | Poor |
|-----------|--------|-----------|------------|------|
| **Latency (avg)** | < 500ms | < 200ms | 200-500ms | > 500ms |
| **Packet Delivery** | > 95% | > 99% | 95-99% | < 95% |
| **Concurrent Connections** | 50+ | 100+ | 50-100 | < 50 |
| **Connection Stability** | > 95% | > 99% | 95-99% | < 95% |
| **Throughput** | Sesuai kebutuhan | > 10 pps | 5-10 pps | < 5 pps |

---

## 📝 Tips untuk Pengujian Valid

1. **Kondisi Jaringan Konsisten**
   - Jangan jalankan aplikasi lain yang menggunakan bandwidth
   - Gunakan koneksi kabel jika memungkinkan

2. **Multiple Runs**
   - Jalankan setiap test minimal 3x
   - Ambil rata-rata hasilnya

3. **Dokumentasi**
   - Screenshot hasil test
   - Export file JSON report yang dihasilkan

4. **Pengujian Realistis**
   - Test dengan jumlah bus/tracker sesuai deployment nyata
   - Test pada waktu berbeda (pagi, siang, malam)

---

## 🔧 Environment Variables untuk Testing

Anda bisa mengubah target server dengan environment variables:

```bash
# Test ke server production
TEST_HOST=your-server.com node tests/qos_latency_test.js

# Test dengan port berbeda
UDP_PORT=5000 PORT=8080 node tests/qos_latency_test.js
```
