import pool from './db.js';

async function migrate() {
  try {
    console.log('Creating products, variants, and images tables...');
    
    // 1. Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NULL,
        subcategory_id INT NULL,
        brand_id INT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        original_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        promo_price DECIMAL(10,2) NULL,
        promo_start DATETIME NULL,
        promo_end DATETIME NULL,
        thumbnail VARCHAR(255) NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
      )
    `);

    // 2. Create product_variants table (for Sizes, Colors, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        sku VARCHAR(100) UNIQUE NULL,
        color VARCHAR(100) NULL,
        size VARCHAR(100) NULL,
        stock INT NOT NULL DEFAULT 0,
        original_price DECIMAL(10,2) NULL, -- Overrides product price if provided
        promo_price DECIMAL(10,2) NULL,    -- Overrides product promo if provided
        promo_start DATETIME NULL,
        promo_end DATETIME NULL,
        variant_image VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // 3. Create product_images table (for Gallery)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Successfully created all product-related tables!');
  } catch (err) {
    console.error('❌ Could not create tables:', err.message);
  } finally {
    process.exit();
  }
}
migrate();
