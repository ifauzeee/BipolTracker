DROP TABLE IF EXISTS "geofence_events" CASCADE;
DROP TABLE IF EXISTS "geofences" CASCADE;
DROP TABLE IF EXISTS "bus_status" CASCADE;
DROP TABLE IF EXISTS "drivers" CASCADE;
DROP TABLE IF EXISTS "admin_users" CASCADE;
DROP TABLE IF EXISTS "bipol_tracker" CASCADE;
DROP TABLE IF EXISTS "app_info" CASCADE;
DROP TABLE IF EXISTS "lost_items" CASCADE;
DROP TABLE IF EXISTS "feedback" CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE "admin_users" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "username" VARCHAR(50) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE "drivers" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "bus_plate" VARCHAR(20) UNIQUE NOT NULL,
    "driver_name" VARCHAR(100),
    "password_hash" VARCHAR(255) NOT NULL,
    "current_status" VARCHAR(50) DEFAULT 'Off Duty',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE "bipol_tracker" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "bus_id" VARCHAR(20) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION DEFAULT 0,
    "gas_level" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE "app_info" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "title" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE "geofences" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_meters" INTEGER DEFAULT 100,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE "geofence_events" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "bus_id" VARCHAR(20) NOT NULL,
    "geofence_id" UUID REFERENCES "geofences"("id") ON DELETE SET NULL,
    "event_type" VARCHAR(20) NOT NULL,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE "lost_items" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "bus_plate" VARCHAR(20) NOT NULL,
    "whatsapp_number" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE "feedback" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "name" VARCHAR(100),
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
-- Default admin: username=admin, password=admin123 (GANTI SEGERA setelah deploy!)
INSERT INTO "admin_users" ("username", "password_hash")
VALUES ('admin', '$2b$12$Myv.qmlJ6oxhaqRiTYTCYOKScrBTvqdpYMWtviUad3jSS2/uAWnzW'); 
ALTER TABLE "bipol_tracker" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON "bipol_tracker" FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON "bipol_tracker" FOR INSERT WITH CHECK (true);
ALTER TABLE "app_info" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON "app_info" FOR SELECT USING (true);
