-- CREATE DATABASE
CREATE DATABASE IF NOT EXISTS db_viet_tour
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE db_viet_tour;

-- 1. USERS
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    fullname VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    address VARCHAR(255),

    role ENUM('customer','admin','tour-staff','booking-staff') NOT NULL DEFAULT 'customer',
    status TINYINT(1) NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    is_verified TINYINT(1) NOT NULL DEFAULT 0 CHECK (is_verified IN (0,1)),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. TOURS
CREATE TABLE tours (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,

    location VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,

    price_default DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    price_child DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    cover_image VARCHAR(255) DEFAULT NULL, -- default là null

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tours_region (region),
    INDEX idx_tours_price_default (price_default)
);

-- 3. TOUR IMAGES
CREATE TABLE tour_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tour_id INT NOT NULL,
    image VARCHAR(255) DEFAULT NULL, -- default là null

    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
);

-- 4. TOUR ITINERARIES
CREATE TABLE tour_itineraries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tour_id INT NOT NULL,
    day_number INT NOT NULL CHECK (day_number > 0),
    description TEXT,

    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tour_day (tour_id, day_number)
);

-- 5. TOUR DEPARTURES
CREATE TABLE tour_departures (
    id INT AUTO_INCREMENT PRIMARY KEY,

    tour_id INT NOT NULL,
    departure_location VARCHAR(100) NOT NULL,
    departure_date DATE NOT NULL,

    price_moving DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    price_moving_child DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    seats_total INT NOT NULL DEFAULT 1,
    seats_available INT NOT NULL DEFAULT 1,

    status ENUM('open','closed','full') DEFAULT 'open',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tour_date (tour_id, departure_date)
);

-- 6. SERVICES
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    icon VARCHAR(100),

    status TINYINT(1) DEFAULT 1 CHECK (status IN (0,1)),

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. TOUR - SERVICES (MANY TO MANY)
CREATE TABLE tour_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tour_id INT NOT NULL,
    service_id INT NOT NULL,

    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,

    UNIQUE KEY uk_tour_service (tour_id, service_id)
);

-- 8. BOOKINGS
CREATE TABLE bookings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id INT NULL,
    departure_id INT NOT NULL,

    adults INT NOT NULL DEFAULT 1 CHECK (adults > 0),
    children INT NOT NULL DEFAULT 0 CHECK (children >= 0),

    total_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Snapshot tiền cọc tại thời điểm đặt (đổi % sau này không ảnh hưởng đơn cũ)
    deposit_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_due_at DATETIME DEFAULT NULL,

    payment_status ENUM('unpaid','deposit_paid','paid','refunded') NOT NULL DEFAULT 'unpaid',
    status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',

    cancel_reason ENUM('deposit_expired','balance_expired','user','admin') DEFAULT NULL,
    cancelled_at DATETIME DEFAULT NULL,

    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    note TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (departure_id) REFERENCES tour_departures(id) ON DELETE RESTRICT
);

-- 8.1 BOOKING PAYMENTS (lịch sử từng lần thanh toán: cọc / phần còn lại / toàn bộ)
CREATE TABLE booking_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNSIGNED NOT NULL,

    type ENUM('deposit','balance','full') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,

    status ENUM('pending','paid','failed','expired','cancelled') NOT NULL DEFAULT 'pending',

    txn_ref VARCHAR(80) NOT NULL,
    provider_txn_no VARCHAR(80) DEFAULT NULL,
    provider_response TEXT DEFAULT NULL,

    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    refunded_at DATETIME DEFAULT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Dữ liệu tiền: không xóa lịch sử giao dịch khi xóa booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_booking_payments_txn_ref (txn_ref),
    INDEX idx_booking_payments_booking (booking_id, type, status),
    INDEX idx_booking_payments_expires (expires_at)
);

-- 9. REVIEWS
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,
    tour_id INT NOT NULL,

    rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,

    UNIQUE KEY uk_user_tour_review (user_id, tour_id)
);

-- 10. WISHLIST
CREATE TABLE wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,
    tour_id INT NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,

    UNIQUE KEY uk_wishlist (user_id, tour_id)
);

-- 11. PASSENGERS
CREATE TABLE passengers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNSIGNED NOT NULL,

    fullname VARCHAR(255) NOT NULL,
    gender ENUM('Nam','Nữ','Khác') NOT NULL DEFAULT 'Khác',
    dob DATE,
    passenger_type ENUM('adult','child') NOT NULL DEFAULT 'adult',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
