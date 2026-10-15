CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20)
);

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    vehicle_name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    manufacture_year INTEGER,
    status VARCHAR(50) DEFAULT 'Sẵn sàng'
);

CREATE TABLE maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    maintenance_date DATE NOT NULL,
    description TEXT NOT NULL,
    cost NUMERIC(12,2) DEFAULT 0,

    CONSTRAINT fk_maintenance_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE CASCADE
);

CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    route VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,

    CONSTRAINT fk_schedule_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_schedule_driver
        FOREIGN KEY (driver_id)
        REFERENCES drivers(id)
        ON DELETE CASCADE
);

INSERT INTO drivers (full_name, license_number, phone)
VALUES
('Nguyễn Văn An', 'GPLX001', '0987654321'),
('Trần Văn Bình', 'GPLX002', '0976543210');

INSERT INTO vehicles (
    license_plate,
    vehicle_name,
    brand,
    manufacture_year,
    status
)
VALUES
('20A-12345', 'Xe tải 01', 'Hyundai', 2022, 'Sẵn sàng'),
('20A-67890', 'Xe tải 02', 'Isuzu', 2023, 'Sẵn sàng');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
