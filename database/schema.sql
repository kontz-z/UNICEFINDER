CREATE DATABASE IF NOT EXISTS achados_perdidos;
USE achados_perdidos;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'employee') DEFAULT 'user',
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category_id INT,
    location_found VARCHAR(200) NOT NULL,
    photo_url VARCHAR(255),
    qr_code_data VARCHAR(255),
    status ENUM('pending_approval','approved','claimed','collected','archived') DEFAULT 'pending_approval',
    found_by_user_id INT NOT NULL,
    approved_by_user_id INT,
    found_at DATETIME NOT NULL,
    approved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (found_by_user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    claimed_by_user_id INT NOT NULL,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    approved_by_user_id INT,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (claimed_by_user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    claim_id INT NOT NULL,
    collected_by_user_id INT NOT NULL,
    confirmed_by_user_id INT NOT NULL,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (claim_id) REFERENCES claims(id),
    FOREIGN KEY (collected_by_user_id) REFERENCES users(id),
    FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id)
);

INSERT INTO categories (name, icon)
SELECT 'Documentos', '📄' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Documentos');
INSERT INTO categories (name, icon)
SELECT 'Eletrônicos', '💻' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Eletrônicos');
INSERT INTO categories (name, icon)
SELECT 'Acessórios', '👜' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Acessórios');
INSERT INTO categories (name, icon)
SELECT 'Outros', '📦' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Outros');

-- Create default employee account (admin@unicefinder.com / admin123)
-- Real bcryptjs hash for 'admin123'
INSERT INTO users (name, email, password_hash, role, department)
SELECT 'Administrador', 'admin@unicefinder.com', '$2a$10$tZ26QJ0.Jk5Yh2K4k8y8n.nQG9hMv7bW8Pq3B1iZ7a2R8qE8sQYv6', 'employee', 'Administração'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@unicefinder.com');
