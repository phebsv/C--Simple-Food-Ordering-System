USE nomnom;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'is_deleted'),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'cart_items' AND column_name = 'deleted_at'),
    'SELECT 1',
    'ALTER TABLE cart_items ADD COLUMN deleted_at DATETIME(6) NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'deleted_at'),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN deleted_at DATETIME(6) NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'cart_items' AND index_name = 'ix_cart_items_deleted_at'),
    'SELECT 1',
    'CREATE INDEX ix_cart_items_deleted_at ON cart_items (deleted_at)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'menu_items' AND column_name = 'is_deleted'),
    'SELECT 1',
    'ALTER TABLE menu_items ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'menu_items' AND column_name = 'deleted_at'),
    'SELECT 1',
    'ALTER TABLE menu_items ADD COLUMN deleted_at DATETIME(6) NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'menu_items' AND column_name = 'deleted_available'),
    'SELECT 1',
    'ALTER TABLE menu_items ADD COLUMN deleted_available BOOLEAN NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'is_deleted'),
    'SELECT 1',
    'ALTER TABLE orders ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'deleted_at'),
    'SELECT 1',
    'ALTER TABLE orders ADD COLUMN deleted_at DATETIME(6) NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'deleted_at'),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN deleted_at DATETIME(6) NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'ix_users_is_deleted'),
    'SELECT 1',
    'CREATE INDEX ix_users_is_deleted ON users (is_deleted)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'menu_items' AND index_name = 'ix_menu_items_is_deleted'),
    'SELECT 1',
    'CREATE INDEX ix_menu_items_is_deleted ON menu_items (is_deleted)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'ix_orders_is_deleted'),
    'SELECT 1',
    'CREATE INDEX ix_orders_is_deleted ON orders (is_deleted)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'reviews' AND index_name = 'ix_reviews_deleted_at'),
    'SELECT 1',
    'CREATE INDEX ix_reviews_deleted_at ON reviews (deleted_at)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
