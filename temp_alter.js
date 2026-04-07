import pool from './db.js';

async function alterDB() {
  try {
    console.log('Creating brands table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        avatar VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Successfully created brands table!');
  } catch (err) {
    console.error('❌ Could not create brands table:', err.message);
  } finally {
    process.exit();
  }
}
alterDB();
