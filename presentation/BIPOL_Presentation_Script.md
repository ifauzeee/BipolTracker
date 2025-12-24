# 🎙️ Naskah Presentasi Lengkap BIPOL Tracker

**Instruksi:** 
*   Teks biasa: Baca dengan intonasi wajar.
*   **Teks Tebal**: Tekankan suaranya (Poin Penting).
*   *(Teks Miring)*: Konteks tambahan untuk improvisasi (tidak harus dibaca persis).

---

### **1. Slide Welcome (Pembukaan)**
"Assalamu’alaikum Warahmatullahi Wabarakatuh. Selamat pagi Bapak/Ibu Dosen Penguji.
Pada kesempatan ini, izinkan kami mempresentasikan hasil akhir proyek kami berjudul **BIPOL TRACKER**.
Ini adalah sistem pelacakan bus kampus cerdas yang tidak hanya memantau lokasi, tapi juga aspek keselamatan penumpang berbasis IoT."

### **2. Slide Anggota Kelompok**
"Tim pengembang sistem ini terdiri dari 4 orang dengan pembagian tugas spesifik:
*   (Sebut Nama 1) berfokus pada perakitan Hardware.
*   (Sebut Nama 2) menangani sisi Server dan Backend.
*   (Sebut Nama 3) mengembangkan antarmuka Frontend.
*   Dan (Sebut Nama 4) bertanggung jawab pada integrasi sistem."

### **3. Slide Latar Belakang**
"Proyek ini dilatarbelakangi oleh keresahan nyata di lapangan:
1.  **Ketidakpastian:** Mahasiswa tidak tahu kapan bus datang sebab jadwalnya 'karet' atau acak.
2.  **Inefisiensi:** Banyak waktu terbuang hanya untuk menunggu di halte tanpa kepastian.
3.  **Resiko Keselamatan:** Mengingat umur armada yang tua, sering terjadi kebocoran gas atau asap yang tidak terdeteksi sejak dini."

### **4. Slide Dasar Teori**
"Untuk menyelesaikan masalah tersebut, kami menerapkan dua landasan teori:
1.  **GPS** dengan prinsip **Trilaterasi** satelit untuk mendapatkan koordinat presisi.
2.  **Arsitektur IoT** dengan komunikasi **M2M (Machine-to-Machine)** menggunakan protokol ringan agar data bisa dikirim cepat walau sinyal seluler lemah."

### **5. Slide Tujuan & Manfaat**
"Ada tiga tujuan utama yang ingin kami capai:
1.  **Transparansi:** Memberikan info posisi bus secara *real-time* ke mahasiswa.
2.  **Keselamatan:** Mendeteksi bahaya gas beracun di kabin bus sebelum terjadi kecelakaan.
3.  **Manajemen:** Memberikan data operasional lengkap bagi pengelola kampus untuk evaluasi kinerja supir."

### **6. Slide Metodologi**
"Metodologi pengembangan kami terbagi menjadi 3 Fase Linear:
*   **Fase 1:** Analisis kebutuhan dan Perancangan Desain Sistem (UML/ERD).
*   **Fase 2:** Implementasi pembuatan Hardware (Solder & Rakit) dan Coding Software.
*   **Fase 3:** Pengujian Kualitas Layanan (QoS) untuk memastikan sistem layak pakai."

### **7. Slide Ringkasan Eksekutif**
"Secara garis besar, BIPOL adalah sistem **Full-Stack IoT End-to-End**.
Kami tidak menggunakan platform pihak ketiga siap pakai, tapi membangun sendiri dari Hardware (ESP32), Backend (Node.js Custom), hingga Frontend (PWA).
Keunggulan utamanya ada pada **Latensi Rendah (<1 detik)** berkat optimalisasi protokol UDP."

---

### **8. Slide Alur Data**
"Bagaimana data mengalir? Ada 4 tahapan:
1.  **Akuisisi:** Sensor di bus membaca GPS & Gas setiap detik.
2.  **Transmisi:** Data dikirim lewat jaringan seluler GPRS.
3.  **Pemrosesan:** Server menerima, memvalidasi, dan menyimpan data.
4.  **Visualisasi:** Pengguna melihat bus bergerak di peta HP mereka hampir tanpa jeda."

### **9. Slide Arsitektur Sistem**
"Kami menggunakan **Modular Layered Architecture**.
Strukturnya terbagi jelas: Paling bawah ada **Physical Layer** (Alat), lalu **Network Layer** (GPRS/UDP), naik ke **Platform Layer** (API Server & DB), dan paling atas **Application Layer** (Dashboard Web) yang diakses user."

### **10. Slide Diagram Blok**
"Secara hardware, otak sistemnya adalah Mikrokontroler **ESP32**.
Ia menerima input dari **Modul GPS NEO-6M** dan **Sensor Gas MQ-2**.
Outputnya dikirim ke Cloud Server via internet, dan ditampilkan juga ke **LCD 16x2** di dashboard supir sebagai indikator lokal."

### **11. Slide Topologi & OSI**
"Dalam topologi jaringan, data bergerak dari **End Node** (Bus), melewati **Gateway** Operator Seluler, masuk ke **Cloud Server** kami, baru didistribusikan ke **Client** (HP/Laptop).
Secara layer OSI, kami mengimplementasikan protokol dari Layer Fisik hingga Aplikasi (WebSocket)."

### **12. Slide Deep Dive Jaringan (PENTING)**
*(Ini poin teknis penting)*
"Kami melakukan segregasi (pemisahan) Port untuk efisiensi:
*   **Port 3333 (UDP):** Khusus kanal cepat menerima data sensor.
*   **Port 3000 (TCP/HTTP):** Khusus melayani request Web Dashboard.
Payload data yang dikirim kami desain sangat ringkas (CSV), hanya **~30 Bytes per paket**, sehingga sangat hemat kuota data."

### **13. Slide Database**
"Database kami menggunakan **Supabase (PostgreSQL)**.
Strukturnya relasional, memiliki tabel utama `bipol_tracker` untuk menampung jutaan baris data jejak lokasi (*Time-Series Data*), serta tabel pendukung seperti `users`, `geofences`, dan laporan `lost_items`."

---
### **14. Slide Spesifikasi Hardware**
"Spesifikasi alat yang kami rakit:
*   **ESP32 DevKit V1:** Dual-core processor yang tangguh.
*   **SIM808:** Modul '2-in-1' yang menangani GPS sekaligus koneksi internet GPRS.
*   **MQ-2:** Sensor gas yang sensitif terhadap LPG, Propana, dan Asap."

### **15. Slide Firmware**
"Logika Firmware di alat bekerja secara **Looping (Terus-menerus)**.
Setiap 1 detik, firmware akan mengambil data NMEA dari GPS, memvalidasinya, memformat menjadi String CSV, lalu menembakkannya ke server via UDP."

### **16. Slide Backend**
"Di sisi Server, kami membangun service dengan **Node.js**.
Ada modul `udpService.js` yang bertindak sebagai *Listener*. Ia menangkap paket data mentah, mengecek validitas koordinat (agar tidak 0,0), lalu menyuntikkannya ke Database."

### **17. Slide Keamanan (Security) (BARU)**
"Kami sadar keamanan itu krusial. Sistem ini dilengkapi proteksi berlapis:
1.  **Secure Headers (Helmet.js):** Mencegah serangan XSS.
2.  **Anti-Spam (Rate Limiting):** Membatasi jumlah request agar server tidak down diserang.
3.  **Sanitasi Data:** Mencegah hacker memanipulasi database via query URL berbahaya."

### **18. Slide Frontend**
"Untuk antarmuka pengguna, kami memilih teknologi **MapLibre GL** karena rendering peta vektornya jauh lebih ringan daripada Google Maps standar.
Website ini juga sudah **PWA (Progressive Web App)**, artinya bisa diinstal di Home Screen HP, bisa jalan fullscreen, dan punya kemampuan offline."

---
### **19. Slide UI Introduction**
"Berikut adalah demonstrasi tampilan aplikasi yang sudah jadi. Kami membaginya menjadi 3 tampilan: Dashboard Publik, Dashboard Admin, dan Dashboard Supir."

### **20. Slide UI Utama (Live Monitoring)**
"Ini tampilan untuk mahasiswa. Fiturnya:
*   Peta interaktif dengan ikon bus bergerak real-time.
*   Info Rute & Plat Nomor.
*   Indikator status aman/bahaya dari sensor gas."

### **21. Slide UI Alert**
"Ini fitur keselamatan kuncinya.
Jika Sensor Gas mendeteksi angka di atas ambang batas (misal >400), **Pop-up Merah** ini langsung muncul di layar Admin disertai bunyi alarm, agar admin bisa segera menghubungi supir."

### **22. Slide UI Info**
"Halaman Informasi berfungsi sebagai mading digital. Admin bisa mem-broadcast info seperti 'Bus Mogok' atau 'Jalan Macet' langsung ke HP seluruh mahasiswa."

### **23. Slide UI FAQ**
"Halaman Pusat Bantuan Mandiri. Berisi daftar pertanyaan umum tentang rute dan jam operasional, agar mahasiswa tidak perlu ftanya manual ke admin terus-menerus."

### **24. Slide UI Login**
"Halaman Login khusus Administrator. Dilengkapi enkripsi password. Hanya akun terdaftar yang bisa mengakses panel kontrol sistem."

---
### **25. Slide Admin Overview**
"Masuk ke Dashboard Admin. Di sini admin bisa melihat ringkasan:
*   Jumlah Total Armada.
*   Status Bus Aktif/Non-aktif.
*   Serta panel kontrol untuk broadcast pengumuman."

### **26. Slide Admin Analytics**
"Halaman Analitik Data. Admin bisa melihat grafik performa armada secara visual.
Contoh: Kita bisa lihat **Peak Gas Level** hari ini mencapai angka **962**, yang perlu diwaspadai."

### **27. Slide Admin Logs**
"Ini adalah fitur **Audit Trail**. Setiap detik data yang dikirim bus terekam di sini.
Admin bisa memfilter berdasarkan ID Bus atau Tanggal untuk menelusuri insiden masa lalu."

### **28. Slide Admin Geofence**
"Fitur Geofencing. Admin bisa menggambar area virtual (misal: Area Bengkel atau Halte Utama).
Sistem akan mencatat otomatis kapan bus Masuk dan Keluar dari area tersebut."

### **29. Slide Admin Lost Items**
"Manajemen Barang Hilang. Laporan dari mahasiswa masuk ke sini. Admin bisa mengubah status laporan menjadi 'Ditemukan' atau 'Sudah Diambil' setelah barang dikembalikan."

### **30. Slide Admin Feedback**
"Halaman Kotak Saran. Admin bisa membaca masukan dan kritik dari pengguna untuk meningkatkan kualitas layanan transportasi kampus."

### **31. Slide Admin Settings**
"Pusat Konfigurasi Sistem. Admin bisa mengatur parameter teknis seperti: Interval Update GPS, Nilai Ambang Batas Gas, dll, tanpa perlu bongkar kodingan."

### **32. Slide Admin Drivers**
"Database Pengemudi. Berisi data nama, kontak, dan nomor induk supir. Berguna untuk manajemen shift dan kontak darurat."

---
### **33. Slide QoS Overview**
"Masuk ke bab Pengujian. Kami melakukan validasi performa sistem menggunakan parameter standar industri **QoS (Quality of Service)**: Latency, Throughput, Concurrency, & Reliability."

### **34. Slide Metode Testing**
"Kami tidak menguji manual. Kami membangun **Automated Test Script** berbasis Node.js yang mensimulasikan trafik data dan mengukur hasilnya secara presisi milidetik."

### **35. Slide Latency Test**
"Hasil Uji Latensi (Jeda Waktu).
Rata-rata pengiriman data dari alat sampai ke server hanya memakan waktu **~1000 milidetik (1 detik)**. Ini masuk kategori sangat responsif untuk tracking kendaraan."

### **36. Slide Throughput Test**
"Hasil Uji Throughput (Kapasitas Data).
Terlihat grafik throughput stabil. Ukuran paket per detik konsisten, menandakan efisiensi protokol UDP bekerja dengan baik, tidak membebani jaringan."

### **37. Slide Concurrent Test**
"Hasil Uji Beban (Concurrency).
Kami mensimulasikan **50 bus mengirim data bersamaan**.
Grafik menunjukkan server tetap stabil menangani ratusan event per detik tanpa ada kendala antrian (bottleneck)."

### **38. Slide Reliability Test**
"Hasil Uji Keandalan.
Dari 1 menit pengujian, Packet Delivery Ratio mencapai **100%**. Artinya **NOL** paket yang hilang (Zero Packet Loss). Koneksi sangat reliabel."

### **39. Slide Server Efficiency**
"Monitoring Kesehatan Server.
Saat beban puncak pun, CPU Usage hanya **~6%** dan RAM hanya terpakai **32MB**.
Ini membuktikan aplikasi backend kami sangat ringan (Lightweight) dan hemat biaya sewa server."

### **40. Slide QoS Summary**
"Kesimpulan Pengujian:
Sistem BIPOL terbukti **Cepat (Low Latency)**, **Tangguh (Reliable)**, dan **Efisien (Low Resource)**. Siap untuk dideploy skala besar."

---
### **41. Slide Wireshark Overview**
"Untuk validasi terakhir, kami menggunakan **Network Analysis Tool: Wireshark & Tcpdump**.
Tujuannya untuk membuktikan bahwa data yang lewat di jaringan adalah data asli, bukan simulasi."

### **42. Slide Wireshark Results**
"Berikut bukti capture paket data asli (Real Traffic).
Bapak/Ibu bisa lihat Protokol UDP membawa payload berisi koordinat Latitude/Longitude asli dan nilai sensor Gas (**962**). Ini membuktikan integritas data kami."

### **43. Slide Tantangan (Challenges)**
"Tantangan terbesar selama pengembangan adalah sinyal GPRS yang kadang hilang di area 'blank spot'.
Kami mengatasinya dengan algoritma *Store & Forward* di firmware."

### **44. Slide Penutup**
"Demikian presentasi dari kelompok kami.
BIPOL Tracker hadir sebagai solusi modern untuk transportasi kampus yang lebih transparan, aman, dan terukur.
**Terima Kasih atas perhatiannya. Kami membuka sesi tanya jawab.**"
