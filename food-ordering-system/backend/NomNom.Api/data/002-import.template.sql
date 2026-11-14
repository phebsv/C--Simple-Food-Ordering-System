-- Generate the executable script with New-MySqlImport.ps1.
USE nomnom;
SET @nomnom_source = CONVERT(UNHEX('__NOMNOM_SOURCE_HEX__') USING utf8mb4);

DROP PROCEDURE IF EXISTS nomnom_import_legacy_json;
DELIMITER $$
CREATE PROCEDURE nomnom_import_legacy_json(IN source_json JSON)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    IF source_json IS NULL OR JSON_TYPE(source_json) <> 'OBJECT' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Generate the import script from db.json before running it.';
    END IF;

    START TRANSACTION;

    INSERT INTO users (id, email, name, role, password_hash, phone, address)
    SELECT src.id, LOWER(REGEXP_REPLACE(src.email, '^[[:space:]]+|[[:space:]]+$', '')),
           src.name, LOWER(src.role), src.password_hash, src.phone, src.address
    FROM JSON_TABLE(source_json, '$.users[*]' COLUMNS (
        id VARCHAR(64) PATH '$.id' ERROR ON EMPTY ERROR ON ERROR,
        email VARCHAR(100) PATH '$.email' ERROR ON EMPTY ERROR ON ERROR,
        name VARCHAR(50) PATH '$.name' ERROR ON EMPTY ERROR ON ERROR,
        role VARCHAR(10) PATH '$.role' ERROR ON EMPTY ERROR ON ERROR,
        password_hash CHAR(60) PATH '$.passwordHash' ERROR ON EMPTY ERROR ON ERROR,
        phone VARCHAR(20) PATH '$.phone' ERROR ON ERROR,
        address VARCHAR(300) PATH '$.address' ERROR ON ERROR
    )) AS src
    LEFT JOIN users AS existing ON existing.id = CONVERT(src.id USING utf8mb4) COLLATE utf8mb4_0900_bin
    WHERE existing.id IS NULL;

    INSERT INTO menu_items (id, name, description, price, category, image, available, stock, last_updated)
    SELECT src.id, src.name, src.description, src.price, src.category, src.image,
           CASE src.available WHEN 'true' THEN TRUE WHEN 'false' THEN FALSE ELSE NULL END,
           src.stock, REPLACE(REPLACE(src.last_updated, 'T', ' '), 'Z', '')
    FROM JSON_TABLE(source_json, '$.menu[*]' COLUMNS (
        source_position FOR ORDINALITY,
        id VARCHAR(64) PATH '$.id' ERROR ON EMPTY ERROR ON ERROR,
        name VARCHAR(80) PATH '$.name' ERROR ON EMPTY ERROR ON ERROR,
        description VARCHAR(500) PATH '$.description' ERROR ON EMPTY ERROR ON ERROR,
        price DECIMAL(14,2) PATH '$.price' ERROR ON EMPTY ERROR ON ERROR,
        category VARCHAR(30) PATH '$.category' ERROR ON EMPTY ERROR ON ERROR,
        image TEXT PATH '$.image' ERROR ON ERROR,
        available VARCHAR(5) PATH '$.available' ERROR ON ERROR,
        stock INT PATH '$.stock' ERROR ON ERROR,
        last_updated VARCHAR(32) PATH '$.lastUpdated' ERROR ON ERROR
    )) AS src
    LEFT JOIN menu_items AS existing ON existing.id = CONVERT(src.id USING utf8mb4) COLLATE utf8mb4_0900_bin
    WHERE existing.id IS NULL
    ORDER BY src.source_position;

    INSERT INTO orders (id, customer_id, customer_name, customer_email, customer_phone,
                        customer_address, subtotal, total, status, payment_method,
                        delivery_notes, created_at, updated_at)
    SELECT src.id, src.customer_id, src.customer_name, src.customer_email, src.customer_phone,
           src.customer_address, src.subtotal, src.total, src.status, src.payment_method,
           src.delivery_notes, REPLACE(REPLACE(src.created_at, 'T', ' '), 'Z', ''),
           REPLACE(REPLACE(src.updated_at, 'T', ' '), 'Z', '')
    FROM JSON_TABLE(source_json, '$.orders[*]' COLUMNS (
        id VARCHAR(64) PATH '$.id' ERROR ON EMPTY ERROR ON ERROR,
        customer_id VARCHAR(64) PATH '$.customerId' ERROR ON EMPTY ERROR ON ERROR,
        customer_name VARCHAR(50) PATH '$.customerName' ERROR ON EMPTY ERROR ON ERROR,
        customer_email VARCHAR(100) PATH '$.customerEmail' ERROR ON EMPTY ERROR ON ERROR,
        customer_phone VARCHAR(20) PATH '$.customerPhone' ERROR ON EMPTY ERROR ON ERROR,
        customer_address VARCHAR(300) PATH '$.customerAddress' ERROR ON EMPTY ERROR ON ERROR,
        subtotal DECIMAL(14,2) PATH '$.subtotal' ERROR ON EMPTY ERROR ON ERROR,
        total DECIMAL(14,2) PATH '$.total' ERROR ON EMPTY ERROR ON ERROR,
        status VARCHAR(20) PATH '$.status' ERROR ON EMPTY ERROR ON ERROR,
        payment_method VARCHAR(32) PATH '$.paymentMethod' ERROR ON EMPTY ERROR ON ERROR,
        delivery_notes VARCHAR(300) PATH '$.deliveryNotes' ERROR ON ERROR,
        created_at VARCHAR(32) PATH '$.createdAt' ERROR ON EMPTY ERROR ON ERROR,
        updated_at VARCHAR(32) PATH '$.updatedAt' ERROR ON EMPTY ERROR ON ERROR
    )) AS src
    LEFT JOIN orders AS existing ON existing.id = CONVERT(src.id USING utf8mb4) COLLATE utf8mb4_0900_bin
    WHERE existing.id IS NULL;

    INSERT INTO order_items (order_id, line_number, menu_id, name, description, price, category, quantity)
    SELECT src.order_id, src.line_number, src.menu_id, src.name, src.description, src.price, src.category, src.quantity
    FROM JSON_TABLE(source_json, '$.orders[*]' COLUMNS (
        order_id VARCHAR(64) PATH '$.id' ERROR ON EMPTY ERROR ON ERROR,
        NESTED PATH '$.items[*]' COLUMNS (
            line_number FOR ORDINALITY,
            menu_id VARCHAR(64) PATH '$.id' ERROR ON EMPTY ERROR ON ERROR,
            name VARCHAR(80) PATH '$.name' ERROR ON EMPTY ERROR ON ERROR,
            description VARCHAR(500) PATH '$.description' ERROR ON EMPTY ERROR ON ERROR,
            price DECIMAL(14,2) PATH '$.price' ERROR ON EMPTY ERROR ON ERROR,
            category VARCHAR(30) PATH '$.category' ERROR ON EMPTY ERROR ON ERROR,
            quantity INT PATH '$.quantity' ERROR ON EMPTY ERROR ON ERROR
        )
    )) AS src
    LEFT JOIN order_items AS existing
      ON existing.order_id = CONVERT(src.order_id USING utf8mb4) COLLATE utf8mb4_0900_bin
     AND existing.line_number = src.line_number
    WHERE src.line_number IS NOT NULL AND existing.order_id IS NULL;

    INSERT INTO cart_items (id, customer_id, menu_id, name, description, price, category, image, quantity)
    SELECT src.id, src.customer_id, src.menu_id, src.name, src.description, src.price, src.category, src.image, src.quantity
    FROM JSON_TABLE(source_json, '$.cart_items[*]' COLUMNS (
        id VARCHAR(64) PATH '$.id' ERROR ON EMPTY ERROR ON ERROR,
        customer_id VARCHAR(64) PATH '$.customerId' ERROR ON EMPTY ERROR ON ERROR,
        menu_id VARCHAR(64) PATH '$.menuId' ERROR ON EMPTY ERROR ON ERROR,
        name VARCHAR(80) PATH '$.name' ERROR ON EMPTY ERROR ON ERROR,
        description VARCHAR(500) PATH '$.description' ERROR ON EMPTY ERROR ON ERROR,
        price DECIMAL(14,2) PATH '$.price' ERROR ON EMPTY ERROR ON ERROR,
        category VARCHAR(30) PATH '$.category' ERROR ON EMPTY ERROR ON ERROR,
        image TEXT PATH '$.image' ERROR ON EMPTY ERROR ON ERROR,
        quantity INT PATH '$.quantity' ERROR ON EMPTY ERROR ON ERROR
    )) AS src
    LEFT JOIN cart_items AS existing ON existing.id = CONVERT(src.id USING utf8mb4) COLLATE utf8mb4_0900_bin
    WHERE existing.id IS NULL;

    INSERT INTO reviews (id, order_id, customer_id, customer_name, food_item_id, food_item_name,
                         rating, comment, created_at, hidden)
    SELECT src.id, src.order_id, src.customer_id, src.customer_name, src.food_item_id, src.food_item_name,
           src.rating, src.comment, REPLACE(REPLACE(src.created_at, 'T', ' '), 'Z', ''), src.hidden = 'true'
    FROM JSON_TABLE(source_json, '$.reviews[*]' COLUMNS (
        id VARCHAR(64) PATH '$.id' ERROR ON EMPTY ERROR ON ERROR,
        order_id VARCHAR(64) PATH '$.orderId' ERROR ON EMPTY ERROR ON ERROR,
        customer_id VARCHAR(64) PATH '$.customerId' ERROR ON EMPTY ERROR ON ERROR,
        customer_name VARCHAR(50) PATH '$.customerName' ERROR ON EMPTY ERROR ON ERROR,
        food_item_id VARCHAR(64) PATH '$.foodItemId' ERROR ON EMPTY ERROR ON ERROR,
        food_item_name VARCHAR(80) PATH '$.foodItemName' ERROR ON EMPTY ERROR ON ERROR,
        rating INT PATH '$.rating' ERROR ON EMPTY ERROR ON ERROR,
        comment VARCHAR(500) PATH '$.comment' ERROR ON EMPTY ERROR ON ERROR,
        created_at VARCHAR(32) PATH '$.createdAt' ERROR ON EMPTY ERROR ON ERROR,
        hidden VARCHAR(5) PATH '$.hidden' ERROR ON EMPTY ERROR ON ERROR
    )) AS src
    LEFT JOIN reviews AS existing ON existing.id = CONVERT(src.id USING utf8mb4) COLLATE utf8mb4_0900_bin
    WHERE existing.id IS NULL;

    COMMIT;
END$$
DELIMITER ;

CALL nomnom_import_legacy_json(@nomnom_source);
DROP PROCEDURE nomnom_import_legacy_json;
SET @nomnom_source = NULL;

SELECT 'users' AS collection, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'menu_items', COUNT(*) FROM menu_items
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews;
