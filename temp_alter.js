import pool from './db.js';

async function alterDB() {
  try {
    console.log('Adding new columns to table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN name VARCHAR(255) NULL, 
      ADD COLUMN avatar TEXT NULL, 
      ADD COLUMN gender VARCHAR(50) NULL, 
      ADD COLUMN address TEXT NULL, 
      ADD COLUMN age INT NULL
    `);
    console.log('✅ Successfully added profile columns!');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Columns already exist.');
    } else {
      console.error('❌ Could not alter table:', err.message);
    }
  } finally {
    process.exit();
  }
}
alterDB();
