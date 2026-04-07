import pool from './db.js';

async function migrate() {
  try {
    console.log('Adding slug column to products table...');
    await pool.query('ALTER TABLE products ADD COLUMN slug VARCHAR(255) UNIQUE AFTER name');
    console.log('✅ Successfully added slug column!');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('✅ Slug column already exists.');
    } else {
      console.error('❌ Error updating database:', err.message);
    }
  } finally {
    process.exit();
  }
}
migrate();
