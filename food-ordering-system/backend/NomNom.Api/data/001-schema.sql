CREATE DATABASE IF NOT EXISTS nomnom
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE nomnom;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
    email VARCHAR(100) COLLATE utf8mb4_0900_bin NOT NULL,
    name VARCHAR(50) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    password_hash CHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(300),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_items (
    id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
    display_order BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(500) NOT NULL,
    price DECIMAL(14,2) NOT NULL,
    category VARCHAR(30) NOT NULL,
    image TEXT,
    available BOOLEAN,
    stock INT UNSIGNED,
    last_updated DATETIME(6),
    UNIQUE KEY uq_menu_display_order (display_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
    customer_id VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
    customer_name VARCHAR(50) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address VARCHAR(300) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    total DECIMAL(14,2) NOT NULL,
    status ENUM('Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled') NOT NULL,
    payment_method VARCHAR(32) NOT NULL,
    delivery_notes VARCHAR(300),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
    order_id VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
    line_number INT UNSIGNED NOT NULL,
    menu_id VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(500) NOT NULL,
    price DECIMAL(14,2) NOT NULL,
    category VARCHAR(30) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    PRIMARY KEY (order_id, line_number),
    FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
    id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
    customer_id VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
    menu_id VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(500) NOT NULL,
    price DECIMAL(14,2) NOT NULL,
    category VARCHAR(30) NOT NULL,
    image TEXT NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_cart_customer_menu (customer_id, menu_id),
    FOREIGN KEY (customer_id) REFERENCES users (id),
    FOREIGN KEY (menu_id) REFERENCES menu_items (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
    order_id VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
    customer_id VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
    customer_name VARCHAR(50) NOT NULL,
    food_item_id VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
    food_item_name VARCHAR(80) NOT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(500) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_review_order_item (order_id, food_item_id),
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (customer_id) REFERENCES users (id)
) ENGINE=InnoDB;
