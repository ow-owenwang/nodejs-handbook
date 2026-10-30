CREATE DATABASE IF NOT EXISTS node_backend_bundler
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE node_backend_bundler;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_products_name (name)
) ENGINE=InnoDB;

INSERT INTO products (name, price, stock) VALUES
  ('机械键盘', 299.00, 25),
  ('无线鼠标', 89.90, 40),
  ('USB-C 扩展坞', 159.00, 12)
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  stock = VALUES(stock);
