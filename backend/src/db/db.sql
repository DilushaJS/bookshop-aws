-- Bookshop Database Schema for AWS RDS MySQL
-- This schema supports a full-featured e-commerce bookshop

-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    role ENUM('customer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Authors table
CREATE TABLE authors (
    author_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    biography TEXT,
    birth_date DATE,
    nationality VARCHAR(100),
    website VARCHAR(255),
    photo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Books table
CREATE TABLE books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(13) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author_id INT NOT NULL,
    category_id INT NOT NULL,
    publisher VARCHAR(200),
    publication_date DATE,
    language VARCHAR(50) DEFAULT 'English',
    pages INT,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    stock_quantity INT DEFAULT 0,
    cover_image_url VARCHAR(255),
    format ENUM('Hardcover', 'Paperback', 'eBook', 'Audiobook') DEFAULT 'Paperback',
    weight DECIMAL(6, 2),
    dimensions VARCHAR(50),
    featured BOOLEAN DEFAULT FALSE,
    bestseller BOOLEAN DEFAULT FALSE,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    rating_average DECIMAL(3, 2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    views INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    INDEX idx_isbn (isbn),
    INDEX idx_title (title),
    INDEX idx_author (author_id),
    INDEX idx_category (category_id),
    INDEX idx_price (price),
    INDEX idx_featured (featured),
    INDEX idx_bestseller (bestseller),
    FULLTEXT idx_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews table
CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200),
    comment TEXT,
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_book (book_id),
    INDEX idx_user (user_id),
    INDEX idx_rating (rating),
    UNIQUE KEY unique_user_book_review (user_id, book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart items table
CREATE TABLE cart_items (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_book (book_id),
    UNIQUE KEY unique_user_book (user_id, book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_method ENUM('credit_card', 'debit_card', 'paypal', 'stripe', 'cod') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(255),
    shipping_address_line1 VARCHAR(255) NOT NULL,
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100) NOT NULL,
    shipping_state VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(20) NOT NULL,
    shipping_country VARCHAR(100) NOT NULL,
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_user (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order items table
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE RESTRICT,
    INDEX idx_order (order_id),
    INDEX idx_book (book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data

-- Insert categories
INSERT INTO categories (name, description, slug) VALUES
('Fiction', 'Fiction books including novels and short stories', 'fiction'),
('Non-Fiction', 'Non-fiction books and educational content', 'non-fiction'),
('Science Fiction', 'Science fiction and fantasy novels', 'science-fiction'),
('Mystery & Thriller', 'Mystery, thriller, and crime novels', 'mystery-thriller'),
('Romance', 'Romance novels and love stories', 'romance'),
('Biography', 'Biographies and memoirs', 'biography'),
('History', 'Historical books and documentaries', 'history'),
('Science', 'Science and technology books', 'science'),
('Self-Help', 'Self-help and personal development', 'self-help'),
('Business', 'Business and entrepreneurship books', 'business'),
('Children', 'Children and young adult books', 'children'),
('Cooking', 'Cookbooks and culinary arts', 'cooking');

-- Insert authors
INSERT INTO authors (first_name, last_name, biography, nationality) VALUES
('George', 'Orwell', 'English novelist and essayist, best known for 1984 and Animal Farm', 'British'),
('Jane', 'Austen', 'English novelist known for her works of romantic fiction', 'British'),
('Stephen', 'King', 'American author of horror, supernatural fiction, suspense, crime, and fantasy', 'American'),
('J.K.', 'Rowling', 'British author best known for the Harry Potter series', 'British'),
('Dan', 'Brown', 'American author best known for thriller novels', 'American'),
('Agatha', 'Christie', 'English writer known for detective novels', 'British'),
('Malcolm', 'Gladwell', 'Canadian journalist and author of non-fiction books', 'Canadian'),
('Yuval Noah', 'Harari', 'Israeli historian and author', 'Israeli'),
('Michelle', 'Obama', 'American attorney and former First Lady', 'American'),
('James', 'Clear', 'American author and speaker focused on habits and decision making', 'American');

-- Insert books
INSERT INTO books (isbn, title, author_id, category_id, publisher, publication_date, pages, description, price, cost_price, stock_quantity, format, featured, bestseller, discount_percentage) VALUES
('9780451524935', '1984', 1, 1, 'Signet Classic', '1949-06-08', 328, 'A dystopian social science fiction novel and cautionary tale about the dangers of totalitarianism', 15.99, 8.00, 150, 'Paperback', TRUE, TRUE, 10),
('9780141439518', 'Pride and Prejudice', 2, 1, 'Penguin Classics', '1813-01-28', 432, 'A romantic novel of manners following the character development of Elizabeth Bennet', 12.99, 6.50, 200, 'Paperback', TRUE, TRUE, 0),
('9781501142970', 'The Shining', 3, 4, 'Doubleday', '1977-01-28', 447, 'Horror novel about a family that moves to an isolated hotel for the winter', 18.99, 9.50, 120, 'Hardcover', FALSE, TRUE, 15),
('9780439708180', 'Harry Potter and the Sorcerers Stone', 4, 11, 'Scholastic', '1997-06-26', 309, 'The first novel in the Harry Potter series about a young wizard', 24.99, 12.00, 300, 'Hardcover', TRUE, TRUE, 5),
('9780307474278', 'The Da Vinci Code', 5, 4, 'Doubleday', '2003-03-18', 454, 'A mystery thriller novel following symbologist Robert Langdon', 16.99, 8.50, 180, 'Paperback', FALSE, TRUE, 0),
('9780062073488', 'Murder on the Orient Express', 6, 4, 'William Morrow', '1934-01-01', 256, 'Detective novel featuring Hercule Poirot investigating a murder on a train', 14.99, 7.50, 140, 'Paperback', FALSE, FALSE, 0),
('9780316346627', 'Outliers', 7, 2, 'Little Brown', '2008-11-18', 309, 'Examines the factors that contribute to high levels of success', 17.99, 9.00, 160, 'Hardcover', TRUE, TRUE, 10),
('9780062316110', 'Sapiens', 8, 7, 'Harper', '2011-01-01', 443, 'A brief history of humankind from the Stone Age to modern age', 19.99, 10.00, 220, 'Hardcover', TRUE, TRUE, 20),
('9781524763138', 'Becoming', 9, 6, 'Crown', '2018-11-13', 448, 'Memoir by former First Lady Michelle Obama', 21.99, 11.00, 190, 'Hardcover', TRUE, TRUE, 15),
('9780735211292', 'Atomic Habits', 10, 9, 'Avery', '2018-10-16', 320, 'An easy and proven way to build good habits and break bad ones', 16.99, 8.50, 250, 'Paperback', TRUE, TRUE, 10);

-- Insert sample users (passwords are hashed for 'password123')
INSERT INTO users (email, password_hash, first_name, last_name, phone, address_line1, city, state, postal_code, role) VALUES
('admin@bookshop.com', '$2b$10$rKvHYZ8qF5Q5mKP.5p5gH.3xjQJZqZQ0zNqZQ0zNqZQ0zNqZQ0zNq', 'Admin', 'User', '555-0100', '123 Admin St', 'New York', 'NY', '10001', 'admin'),
('john.doe@email.com', '$2b$10$rKvHYZ8qF5Q5mKP.5p5gH.3xjQJZqZQ0zNqZQ0zNqZQ0zNqZQ0zNq', 'John', 'Doe', '555-0101', '456 Customer Ave', 'Los Angeles', 'CA', '90001', 'customer'),
('jane.smith@email.com', '$2b$10$rKvHYZ8qF5Q5mKP.5p5gH.3xjQJZqZQ0zNqZQ0zNqZQ0zNqZQ0zNq', 'Jane', 'Smith', '555-0102', '789 Reader Blvd', 'Chicago', 'IL', '60601', 'customer');

-- Insert sample reviews
INSERT INTO reviews (book_id, user_id, rating, title, comment, verified_purchase) VALUES
(1, 2, 5, 'A masterpiece!', 'This book is absolutely brilliant. Orwell''s vision is both terrifying and prophetic.', TRUE),
(2, 3, 5, 'Timeless classic', 'Pride and Prejudice remains one of the greatest romance novels ever written.', TRUE),
(4, 2, 5, 'Magical experience', 'The beginning of an incredible journey. Perfect for all ages!', TRUE),
(8, 3, 5, 'Mind-blowing', 'Sapiens changed the way I think about human history. Highly recommended!', TRUE),
(10, 2, 4, 'Very practical', 'Great actionable advice on building better habits. Easy to implement.', TRUE);

-- Insert sample cart items
INSERT INTO cart_items (user_id, book_id, quantity) VALUES
(2, 5, 1),
(2, 7, 2),
(3, 1, 1);

-- Insert sample orders
INSERT INTO orders (user_id, order_number, total_amount, tax_amount, shipping_cost, status, payment_method, payment_status, shipping_address_line1, shipping_city, shipping_state, shipping_postal_code, shipping_country) VALUES
(2, 'ORD-2024-00001', 45.97, 3.68, 5.99, 'delivered', 'credit_card', 'completed', '456 Customer Ave', 'Los Angeles', 'CA', '90001', 'USA'),
(3, 'ORD-2024-00002', 32.98, 2.64, 5.99, 'shipped', 'paypal', 'completed', '789 Reader Blvd', 'Chicago', 'IL', '60601', 'USA');

-- Insert sample order items
INSERT INTO order_items (order_id, book_id, quantity, unit_price, subtotal) VALUES
(1, 1, 1, 15.99, 15.99),
(1, 4, 1, 24.99, 24.99),
(2, 2, 1, 12.99, 12.99),
(2, 10, 1, 16.99, 16.99);

-- Create views for common queries

-- Best selling books view
CREATE VIEW bestselling_books AS
SELECT 
    b.book_id,
    b.isbn,
    b.title,
    CONCAT(a.first_name, ' ', a.last_name) AS author_name,
    c.name AS category,
    b.price,
    b.discount_percentage,
    b.stock_quantity,
    b.rating_average,
    b.rating_count,
    b.sales_count,
    b.cover_image_url
FROM books b
JOIN authors a ON b.author_id = a.author_id
JOIN categories c ON b.category_id = c.category_id
WHERE b.is_active = TRUE
ORDER BY b.sales_count DESC;

-- Featured books view
CREATE VIEW featured_books AS
SELECT 
    b.book_id,
    b.isbn,
    b.title,
    CONCAT(a.first_name, ' ', a.last_name) AS author_name,
    c.name AS category,
    b.price,
    b.discount_percentage,
    b.stock_quantity,
    b.rating_average,
    b.cover_image_url
FROM books b
JOIN authors a ON b.author_id = a.author_id
JOIN categories c ON b.category_id = c.category_id
WHERE b.featured = TRUE AND b.is_active = TRUE;

-- Order summary view
CREATE VIEW order_summary AS
SELECT 
    o.order_id,
    o.order_number,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    o.total_amount,
    o.status,
    o.payment_status,
    o.created_at,
    COUNT(oi.order_item_id) AS item_count
FROM orders o
JOIN users u ON o.user_id = u.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id;

-- User statistics view
CREATE VIEW user_statistics AS
SELECT 
    u.user_id,
    u.email,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_spent,
    COUNT(DISTINCT r.review_id) AS total_reviews,
    u.created_at AS member_since
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
LEFT JOIN reviews r ON u.user_id = r.user_id
GROUP BY u.user_id;