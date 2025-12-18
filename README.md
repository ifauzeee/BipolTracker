# BIPOL Tracker 🚌💨
**Real-Time Bus Tracking & Fleet Management System**

![Project Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-ISC-blue)
![Tech](https://img.shields.io/badge/Stack-Node.js%20%7C%20Supabase%20%7C%20IoT-orange)

## 📖 Overview

**BIPOL Tracker** is a robust, full-stack IoT solution designed to modernize public transportation management. By bridging the gap between hardware sensors and digital interfaces, it provides real-time location updates, safety monitoring, and an intuitive user experience for both commuters and administrators.

This repository contains the **Backend Server/API** and the **Web Frontend**.

---

## 📱 Mobile Application (Android)
The dedicated Android application for this ecosystem is engineered by our partner:
👉 **[garnhoesssss](https://github.com/garnhoesssss)** — *Mobile App Developer*

---

## ✨ Key Features

### For Commuters 👥
*   **Real-Time Tracking**: Watch bus movements live on an interactive map.
*   **Smart ETA**: Get estimated arrival times based on current speed and distance.
*   **Safety First**: Public alerts if potential hazards (like gas leaks) are detected on board.
*   **Lost & Found**: Integrated reporting system for lost items.

### For Administrators 🛠️
*   **Fleet Command Center**: Monitor speed, location, connection status, and sensor data.
*   **Geofencing Automation**: Automatic logging of bus entries and exits at designated stops (Geofence Zones).
*   **Hardware Health**: Monitor gas levels (MQ-2 sensor) and GPS signal integrity.
*   **User Feedback**: Centralized management for user reports and suggestions.

---

## 🏗️ System Architecture

The project follows a high-performance, event-driven architecture:

1.  **Hardware Layer (ESP32)**  
    Collects GPS coordinates (Latitude/Longitude), Speed, and Air Quality (Gas Level) data. This data is transmitted via **UDP** for maximum speed and low latency.
    
2.  **Backend Layer (Node.js + Express)**  
    *   **UDP Server**: Listens for incoming hardware packets.
    *   **Socket.io**: Broadcasts updates to connected web clients in real-time.
    *   **REST API**: Handles authentication, logging, and static data management.

3.  **Data Layer (Supabase)**  
    Uses PostgreSQL to persistently store tracking history, user accounts, and configuration logs.

4.  **Frontend Layer**  
    A clean, responsive web interface built with Vanilla JS, CSS, and Leaflet Maps.

---

## 🚀 Getting Started

Follow these steps to set up the project locally or on a server.

### Prerequisites
*   **Node.js** (v18 or higher)
*   **Docker & Docker Compose** (Recommended for deployment)
*   **Supabase Account** (For the database)

### 1. Installation
Clone the repository to your local machine:
```bash
git clone https://github.com/ifauzeee/BIPOL.git
cd BIPOL
```

### 2. Environment Configuration
The system uses environment variables for security and flexibility.
1.  Copy the example file:
    ```bash
    cp .env.example .env
    ```
2.  Open `.env` and fill in your credentials (Supabase URL, Keys, etc.).

### 3. Running Locally
Install dependencies and start the development server:
```bash
npm install
npm start
# Server will launch at http://localhost:3000
```

### 4. Running with Docker (Production)
Build and run the containerized application:
```bash
docker-compose up -d --build
```

> **🔥 Production Deployment:**  
> For a complete, step-by-step guide on deploying to a VPS (Ubuntu) with Nginx, SSL (HTTPS), and Firewall configuration, please read our [**Comprehensive Deployment Guide (DEPLOY.md)**](./DEPLOY.md).

---

## 📡 Hardware Integration Guide

This backend expects data from the ESP32 firmware located in the `firmware/` directory.

**Data Protocol (UDP)**  
The server listens on `UDP_PORT` (default: 3333). Data must be sent as a comma-separated string:

`BUS_ID,LATITUDE,LONGITUDE,SPEED,GAS_LEVEL`

**Example Payload:**
```
BUS-01,-6.377937,106.816650,25.5,120
```

---

## 📂 Project Structure

```bash
BIPOL/
├── deploy/           # Nginx configs & Deployment scripts
├── firmware/         # C++ Source code for ESP32/Arduino
├── public/           # Web Frontend (HTML, CSS, JS)
├── scripts/          # Utilities (Seeding DB, testing)
├── server.js         # Main Application Entry Point
└── docker-compose.yml
```

---

## 🤝 Contributors

*   **Backend & Web Architecture**: [Ifauzeee](https://github.com/Ifauzeee)
*   **Android Application**: [garnhoesssss](https://github.com/garnhoesssss)

---

&copy; 2025 **BIPOL Team**. Built with ❤️ and Code.
