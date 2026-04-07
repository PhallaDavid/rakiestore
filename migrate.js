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
    console.log('✅ Success: "users" table created (or already exists)!');
  } catch (error) {
    console.error('❌ Error creating table:', error);
  } finally {
    process.exit();
  }
}

migrate();
