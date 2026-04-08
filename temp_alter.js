import pool from './db.js';

async function alterTables() {
  try {
    // 1. Alter cart_items
    console.log('Altering cart_items...');
    await pool.query('ALTER TABLE cart_items MODIFY variant_id INT NULL');
    // Check if product_id exists first
    const [cartCols] = await pool.query("SHOW COLUMNS FROM cart_items LIKE 'product_id'");
    if (cartCols.length === 0) {
      await pool.query('ALTER TABLE cart_items ADD COLUMN product_id INT NOT NULL AFTER user_id');
      await pool.query('ALTER TABLE cart_items ADD CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
    }

    // 2. Alter order_items
    console.log('Altering order_items...');
    await pool.query('ALTER TABLE order_items MODIFY variant_id INT NULL');
    const [orderCols] = await pool.query("SHOW COLUMNS FROM order_items LIKE 'product_id'");
    if (orderCols.length === 0) {
      await pool.query('ALTER TABLE order_items ADD COLUMN product_id INT NOT NULL AFTER order_id');
      await pool.query('ALTER TABLE order_items ADD CONSTRAINT fk_order_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
    }

    console.log('✅ Success: Tables altered successfully!');
  } catch (err) {
    console.error('❌ Error altering tables:', err.message);
  } finally {
    process.exit();
  }
}

alterTables();
