-- Adds a short order number (shown as #0-01, #0-02, ...) to an existing nomnom database.
-- Run this once in MySQL Workbench with your admin (root) connection.
-- New databases created from 001-schema.sql already have this column.
USE nomnom;

-- 1. Add the column, empty for now.
ALTER TABLE orders ADD COLUMN order_number BIGINT UNSIGNED NULL AFTER id;

-- 2. Number the existing orders oldest-first: 1, 2, 3, ...
--    (Workbench's "safe update mode" blocks an UPDATE without a WHERE, so pause it briefly.)
SET @old_safe_updates = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;
UPDATE orders AS o
JOIN (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS n
    FROM orders
) AS numbered ON numbered.id = o.id
SET o.order_number = numbered.n;
SET SQL_SAFE_UPDATES = @old_safe_updates;

-- 3. Make it required, unique, and automatic for every new order.
ALTER TABLE orders
    MODIFY order_number BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ADD UNIQUE KEY uq_orders_order_number (order_number);

-- Check: every order now has a number.
SELECT order_number, id, customer_name, created_at FROM orders ORDER BY order_number;
