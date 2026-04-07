import pool from './db.js';

async function migrate() {
  try {
    console.log('Creating orders and order_items tables...');
    
    // 1. Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        address TEXT NOT NULL,
        payment_method VARCHAR(100) NOT NULL,
        phone VARCHAR(50) NULL,
        note TEXT NULL,
        status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 2. Create order_items table (Snapshot of items at purchase)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        variant_id INT NOT NULL,
        quantity INT NOT NULL,
        price_at_purchase DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Successfully created orders and order_items tables!');
  } catch (err) {
    console.error('❌ Could not create tables:', err.message);
  } finally {
    process.exit();
  }
}
migrate();
