import pool from './db.js';

async function migrate() {
  try {
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NULL,
        avatar TEXT NULL,
        gender VARCHAR(50) NULL,
        address TEXT NULL,
        age INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createUsersTableQuery);

    const createBrandsTableQuery = `
      CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        avatar VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createBrandsTableQuery);

    const createCategoriesTableQuery = `
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        avatar VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createCategoriesTableQuery);

    const createSubcategoriesTableQuery = `
      CREATE TABLE IF NOT EXISTS subcategories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        avatar VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `;
    await pool.query(createSubcategoriesTableQuery);

    const createProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NULL,
        subcategory_id INT NULL,
        brand_id INT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NULL,
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
    `;
    await pool.query(createProductsTableQuery);

    const createProductVariantsTableQuery = `
      CREATE TABLE IF NOT EXISTS product_variants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        sku VARCHAR(100) UNIQUE NULL,
        color VARCHAR(100) NULL,
        size VARCHAR(100) NULL,
        stock INT NOT NULL DEFAULT 0,
        original_price DECIMAL(10,2) NULL,
        promo_price DECIMAL(10,2) NULL,
        promo_start DATETIME NULL,
        promo_end DATETIME NULL,
        variant_image VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;
    await pool.query(createProductVariantsTableQuery);

    const createProductImagesTableQuery = `
      CREATE TABLE IF NOT EXISTS product_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;
    await pool.query(createProductImagesTableQuery);
    
    console.log('✅ Success: All tables migrated successfully!');
  } catch (error) {
    console.error('❌ Error creating table:', error);
  } finally {
    process.exit();
  }
}

migrate();
