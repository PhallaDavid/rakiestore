import pool from './db.js';

async function alterDB() {
  try {
    console.log('Altering table...');
    await pool.query('ALTER TABLE users CHANGE username phone VARCHAR(100) UNIQUE NOT NULL');
    console.log('✅ Successfully renamed username column to phone!');
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      console.log('✅ Column is already named phone.');
    } else {
      console.error('❌ Could not alter table:', err.message);
    }
  } finally {
    process.exit();
  }
}
alterDB();
