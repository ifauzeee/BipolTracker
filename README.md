![Bipol Tracker Banner](/frontend/public/images/header.png)

<div align="center">

# 🚌 BIPOL Tracker

**Bus Information Politeknik** — Sistem Pelacakan Armada Bus Kampus Real-Time

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io)](https://socket.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

[Demo](#-demo) • [Fitur](#-fitur) • [Instalasi](#-quick-start) • [Dokumentasi](#-dokumentasi-api) • [Kontribusi](#-contributing)

</div>

---

## 📖 Tentang Project

**BIPOL Tracker** adalah sistem pelacakan armada bus kampus Politeknik Negeri Jakarta yang dibangun dengan teknologi modern. Aplikasi ini memungkinkan mahasiswa, staf, dan pengunjung untuk melacak posisi bus secara real-time melalui web browser.

Sistem ini menggunakan **ESP32 GPS Tracker** yang mengirim data lokasi via protokol **UDP** ke server, kemudian disiarkan ke semua client via **WebSocket** untuk update real-time tanpa perlu refresh halaman.

---

## ✨ Fitur

### 🎯 Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🗺️ **Peta Interaktif** | Peta berbasis MapLibre GL dengan rute bus dan halte |
| 📍 **Real-time Tracking** | Update posisi bus secara instan via WebSocket |
| 🚌 **Multi Bus Support** | Lacak beberapa armada bus sekaligus |
| 📱 **PWA Ready** | Install sebagai aplikasi di smartphone |
| 🔔 **Notifikasi Kedatangan** | Pemberitahuan saat bus mendekati halte |
| ⏱️ **Estimasi Waktu** | Perkiraan waktu tiba di halte terdekat |

### 🛡️ Fitur Keamanan

| Fitur | Deskripsi |
|-------|-----------|
| 🔐 **Session Auth** | Autentikasi berbasis session untuk admin |
| 🛑 **Rate Limiting** | Pembatasan request untuk mencegah abuse |
| 🧹 **XSS Protection** | Sanitasi input untuk mencegah XSS attack |
| 🪖 **Helmet Security** | HTTP security headers terkonfigurasi |
| � **HTTPS Support** | Dukungan untuk koneksi terenkripsi |

### 📊 Fitur Monitoring

| Fitur | Deskripsi |
|-------|-----------|
| ⛽ **Gas Sensor Alert** | Peringatan jika sensor gas tinggi |
| 🌍 **Geofencing** | Notifikasi saat bus masuk/keluar zona |
| � **Admin Dashboard** | Panel kontrol untuk monitoring armada |
| � **Activity Logs** | Riwayat tracking dan event geofence |
| 🧹 **Auto Cleanup** | Pembersihan data lama otomatis |

### 📝 Fitur Tambahan

| Fitur | Deskripsi |
|-------|-----------|
| 📦 **Lost & Found** | Laporan barang hilang/tertinggal |
| 💬 **Feedback System** | Form masukan pengguna |
| 📢 **Pengumuman** | Broadcast informasi ke pengguna |
| 🚗 **Driver Portal** | Dashboard khusus untuk driver |

---

## 🛠️ Tech Stack

### Backend
| Teknologi | Fungsi |
|-----------|--------|
| **Node.js 20+** | JavaScript runtime |
| **Express.js 5** | Web framework |
| **Socket.IO 4** | Real-time WebSocket |
| **UDP Server** | Menerima data GPS tracker |

### Frontend
| Teknologi | Fungsi |
|-----------|--------|
| **Vite 7** | Build tool & dev server |
| **MapLibre GL** | Peta interaktif |
| **Chart.js** | Visualisasi data |
| **SweetAlert2** | Modal & notifikasi |
| **Workbox** | Service worker (PWA) |

### Database & Infrastructure
| Teknologi | Fungsi |
|-----------|--------|
| **Supabase** | PostgreSQL + Real-time |
| **Docker** | Containerization |
| **Nginx** | Reverse proxy (opsional) |

### Security
| Teknologi | Fungsi |
|-----------|--------|
| **Helmet** | HTTP security headers |
| **bcryptjs** | Password hashing |
| **xss** | XSS sanitization |
| **hpp** | HTTP parameter pollution |
| **express-rate-limit** | Rate limiting |

---

## 📁 Struktur Project

```
bipol/
├── 📂 config/
│   └── supabase.js          # Konfigurasi Supabase client
│
├── 📂 controllers/
│   ├── adminController.js   # Logic admin (drivers, logs)
│   ├── authController.js    # Login/logout/session
│   ├── infoController.js    # Pengumuman & config
│   ├── reportController.js  # Lost items & feedback
│   └── trackerController.js # GPS tracking endpoints
│
├── 📂 middleware/
│   ├── auth.js              # Session authentication
│   └── rateLimiter.js       # Request rate limiting
│
├── 📂 routes/
│   ├── admin.js             # Admin API routes
│   ├── auth.js              # Auth routes
│   ├── info.js              # Info & config routes
│   ├── reports.js           # Reports routes
│   └── tracker.js           # Tracker routes
│
├── 📂 services/
│   ├── cleanup.js           # Auto cleanup old data
│   ├── geofenceService.js   # Geofence logic
│   └── udpService.js        # UDP server for GPS
│
├── 📂 utils/
│   ├── cache.js             # In-memory caching
│   ├── sanitizer.js         # XSS sanitization
│   └── validators.js        # Input validation
│
├── 📂 frontend/             # Vite source files
│   ├── 📂 public/           # Static assets
│   │   ├── images/          # App images & icons
│   │   └── manifest.json    # PWA manifest
│   ├── 📂 src/
│   │   ├── css/             # Stylesheets
│   │   └── js/              # JavaScript modules
│   ├── index.html           # Main page
│   ├── login.html           # Login page
│   ├── admin.html           # Admin dashboard
│   ├── driver.html          # Driver dashboard
│   └── sw.js                # Service worker source
│
├── 📂 public/               # Production build output
│   └── assets/              # Bundled JS/CSS
│
├── 📂 firmware/             # ESP32 GPS tracker
│   ├── esp32_tracker_udp.ino
│   └── arduino_secrets.h.example
│
├── 📂 database/
│   └── setup_full.sql       # Database schema
│
├── 📄 server.js             # Application entry point
├── 📄 vite.config.js        # Vite configuration
├── 📄 package.json          # Dependencies
├── 📄 Dockerfile            # Docker image
├── 📄 docker-compose.yml    # Docker orchestration
├── 📄 .env.example          # Environment template
├── 📄 .gitignore            # Git ignore rules
└── 📄 LICENSE               # ISC License
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 20 atau lebih tinggi
- **npm** atau **yarn**
- Akun [Supabase](https://supabase.com) (gratis)
- (Opsional) Docker & Docker Compose

### 1️⃣ Clone Repository

```bash
git clone https://github.com/ifauzeee/BIPOL.git
cd BIPOL
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Setup Database

1. Buat project baru di [Supabase](https://supabase.com)
2. Buka **SQL Editor** di dashboard Supabase
3. Copy-paste isi file `database/setup_full.sql`
4. Jalankan query

### 4️⃣ Konfigurasi Environment

```bash
# Copy template
cp .env.example .env

# Edit dengan editor favorit
nano .env
```

**Minimal configuration:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SESSION_SECRET=your-random-secret-string
```

### 5️⃣ Build Frontend

```bash
npm run build
```

### 6️⃣ Jalankan Server

```bash
npm start
```

🎉 Aplikasi berjalan di `http://localhost:3000`

---

## 🐳 Docker Deployment

### Quick Deploy

```bash
# Build dan jalankan
docker-compose up -d --build

# Lihat logs
docker-compose logs -f bipol-app

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t bipol-tracker .

# Run container
docker run -d \
  --name bipol \
  -p 3000:3000 \
  -p 3333:3333/udp \
  --env-file .env \
  bipol-tracker
```

---

## ⚙️ Environment Variables

### Server Configuration

| Variable | Deskripsi | Default | Required |
|----------|-----------|---------|----------|
| `PORT` | Port web server | `3000` | ❌ |
| `UDP_PORT` | Port GPS tracker | `3333` | ❌ |

### Database

| Variable | Deskripsi | Default | Required |
|----------|-----------|---------|----------|
| `SUPABASE_URL` | URL project Supabase | - | ✅ |
| `SUPABASE_KEY` | Service role key | - | ✅ |

### Security

| Variable | Deskripsi | Default | Required |
|----------|-----------|---------|----------|
| `SESSION_SECRET` | Secret untuk session cookie | - | ✅ |
| `USE_HTTPS` | Enable HTTPS mode | `false` | ❌ |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` | ❌ |

### Rate Limiting

| Variable | Deskripsi | Default | Required |
|----------|-----------|---------|----------|
| `RATE_LIMIT_WINDOW_MS` | Window duration (ms) | `60000` | ❌ |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | ❌ |
| `RATE_LIMIT_LOGIN_MAX` | Max login attempts | `5` | ❌ |

### Application Logic

| Variable | Deskripsi | Default | Required |
|----------|-----------|---------|----------|
| `DATA_RETENTION_HOURS` | Data retention period | `24` | ❌ |
| `GAS_ALERT_THRESHOLD` | Gas sensor alert level | `600` | ❌ |
| `BUS_STOP_TIMEOUT_MINUTES` | Idle timeout for bus | `5` | ❌ |
| `UDP_MIN_SPEED_THRESHOLD` | Min speed threshold | `3.0` | ❌ |
| `CACHE_TTL_MS` | Cache duration (ms) | `5000` | ❌ |

---

## 📡 GPS Tracker (ESP32)

### Hardware Requirements

- ESP32 Development Board
- GPS Module (NEO-6M/NEO-7M/NEO-8M)
- MQ-2/MQ-135 Gas Sensor (opsional)
- Power supply

### Wiring Diagram

```
ESP32          GPS Module
------         ----------
3.3V    -->    VCC
GND     -->    GND
GPIO16  -->    TX
GPIO17  -->    RX

ESP32          Gas Sensor
------         ----------
3.3V    -->    VCC
GND     -->    GND
GPIO34  -->    AO (Analog)
```

### Firmware Setup

1. Copy `firmware/arduino_secrets.h.example` ke `arduino_secrets.h`
2. Edit kredensial WiFi dan server:

```cpp
#define SECRET_SSID "Your_WiFi_SSID"
#define SECRET_PASS "Your_WiFi_Password"
#define SERVER_IP "your-server-ip"
#define SERVER_PORT 3333
#define BUS_ID "B1234ABC"
```

3. Upload `esp32_tracker_udp.ino` ke ESP32

### UDP Data Format

```
BUS_ID,LATITUDE,LONGITUDE,SPEED,GAS_LEVEL
```

**Contoh:**
```
B1234ABC,-6.372123,106.824567,25.5,150
```

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `BUS_ID` | String | ID unik bus/plat nomor |
| `LATITUDE` | Float | Koordinat latitude |
| `LONGITUDE` | Float | Koordinat longitude |
| `SPEED` | Float | Kecepatan (km/h) |
| `GAS_LEVEL` | Integer | Level sensor gas (0-1024) |

---

## � Dokumentasi API

### Public Endpoints

#### Get Bus Locations
```http
GET /api/bus/location
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "bus_id": "B1234ABC",
      "latitude": -6.372123,
      "longitude": 106.824567,
      "speed": 25.5,
      "gas_level": 150,
      "created_at": "2025-12-20T07:00:00Z"
    }
  ]
}
```

#### Get Announcements
```http
GET /api/info
```

#### Get App Config
```http
GET /api/config
```

**Response:**
```json
{
  "gasAlertThreshold": 600,
  "busStopTimeoutMinutes": 5
}
```

#### Get Bus Plates
```http
GET /api/bus-plates
```

### Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "role": "admin",
  "redirect": "/admin"
}
```

#### Check Status
```http
GET /auth/status
```

#### Logout
```http
POST /auth/logout
```

### Admin Endpoints (Protected)

> ⚠️ Memerlukan session admin via login

#### Get Logs
```http
GET /api/admin/logs
```

#### Manage Drivers
```http
GET    /api/admin/drivers          # List
POST   /api/admin/drivers          # Create
PUT    /api/admin/drivers/:id      # Update
DELETE /api/admin/drivers/:id      # Delete
PATCH  /api/admin/drivers/:id/reset-password
```

#### Manage Announcements
```http
GET    /api/admin/info             # List
POST   /api/info                   # Create
DELETE /api/info/:id               # Delete
```

#### Get Geofence Events
```http
GET /api/admin/geofence-events
```

### Reports

#### Submit Lost Item
```http
POST /lost-items
Content-Type: application/json

{
  "bus_plate": "B1234ABC",
  "whatsapp_number": "081234567890",
  "message": "Dompet warna hitam tertinggal"
}
```

#### Submit Feedback
```http
POST /feedback
Content-Type: application/json

{
  "name": "John Doe",
  "message": "Aplikasi sangat membantu!"
}
```

### WebSocket Events

Koneksi Socket.IO ke server:
```javascript
const socket = io();

// Listen for bus updates
socket.on('update_bus', (bus) => {
  console.log('Bus update:', bus);
});

// Listen for geofence events
socket.on('geofence_event', (event) => {
  console.log('Geofence:', event);
});

// Listen for new announcements
socket.on('update_info', () => {
  // Refresh announcements
});
```

---

## 🔐 Default Login

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |

> ⚠️ **PENTING:** Segera ganti password default setelah deployment!

Untuk mengganti password admin:
1. Login ke admin dashboard
2. Klik menu Settings/Profile
3. Gunakan fitur Change Password

---

## 🔧 Development

### Development Server

```bash
# Terminal 1: Vite dev server
cd frontend
npx vite --host

# Terminal 2: Node.js server
npm start
```

### Build Production

```bash
npm run build
```

### Project Scripts

```json
{
  "start": "node server.js",
  "build": "vite build",
  "dev": "vite"
}
```

---

## 🧪 Testing

### Manual Testing

1. Buka aplikasi di browser
2. Buka halaman admin `/admin`
3. Simulasi data GPS menggunakan dummy buses (otomatis berjalan)

### UDP Test

Kirim data test via netcat:
```bash
echo "TEST-BUS,-6.372,106.824,30,100" | nc -u localhost 3333
```

### Health Check

```bash
# Basic health
curl http://localhost:3000/api/health

# Database ready check
curl http://localhost:3000/api/health/ready
```

---

## 📈 Performance Tips

1. **Enable caching** - Sesuaikan `CACHE_TTL_MS` sesuai kebutuhan
2. **Optimize retention** - Kurangi `DATA_RETENTION_HOURS` jika storage terbatas
3. **Use reverse proxy** - Deploy di belakang Nginx untuk SSL termination
4. **Enable compression** - Aktifkan gzip di reverse proxy
5. **Monitor memory** - Gunakan `pm2` untuk production dengan auto-restart

---

## 🐛 Troubleshooting

### Bus tidak muncul di peta

1. Cek koneksi ESP32 ke WiFi
2. Pastikan UDP port tidak diblokir firewall
3. Verifikasi format data UDP benar
4. Cek log server: `docker-compose logs -f`

### Login gagal

1. Pastikan session secret sudah dikonfigurasi
2. Cek koneksi ke Supabase
3. Verifikasi kredensial admin di database

### Build error

```bash
# Clear cache dan rebuild
rm -rf node_modules public/assets
npm install
npm run build
```

### WebSocket tidak connect

1. Pastikan `ALLOWED_ORIGINS` mencakup domain Anda
2. Cek apakah reverse proxy mendukung WebSocket
3. Untuk Nginx, tambahkan config upgrade:
```nginx
location / {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 🤝 Contributing

Kontribusi sangat diterima! Berikut langkah-langkahnya:

1. **Fork** repository ini
2. **Create branch** fitur baru
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** perubahan
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
4. **Push** ke branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. Buat **Pull Request**

### Commit Convention

Gunakan [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Fitur baru
- `fix:` - Bug fix
- `docs:` - Dokumentasi
- `style:` - Formatting
- `refactor:` - Refactoring
- `test:` - Testing
- `chore:` - Maintenance

---

## 📄 License

Didistribusikan di bawah **ISC License**. Lihat file [LICENSE](LICENSE) untuk informasi lebih lanjut.

```
ISC License

Copyright (c) 2025, BIPOL Team (Ifauzeee)

Permission to use, copy, modify, and/or distribute this software...
```

---

## 👥 Tim & Kredit

**BIPOL Team** — Politeknik Negeri Jakarta

### Libraries & Tools

- [MapLibre GL JS](https://maplibre.org/) - Peta interaktif
- [Socket.IO](https://socket.io/) - Real-time communication
- [Supabase](https://supabase.com/) - Backend as a Service
- [Vite](https://vitejs.dev/) - Frontend build tool
- [Font Awesome](https://fontawesome.com/) - Icons
- [SweetAlert2](https://sweetalert2.github.io/) - Beautiful alerts

---

## 📞 Support

- 📧 Email: support@bipoltracker.cloud
- 🐛 Issues: [GitHub Issues](https://github.com/ifauzeee/BIPOL/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/ifauzeee/BIPOL/discussions)

---

<div align="center">

**⭐ Star this repo if you find it useful! ⭐**

Made with ❤️ for PNJ Campus

[⬆ Back to Top](#-bipol-tracker)

</div>
