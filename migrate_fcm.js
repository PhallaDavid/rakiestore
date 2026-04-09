import pool from './db.js';

async function migrateFCM() {
  try {
    const createFCMTokensTableQuery = `
      CREATE TABLE IF NOT EXISTS user_fcm_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        fcm_token VARCHAR(500) NOT NULL,
        device_type VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY user_token (user_id, fcm_token),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await pool.query(createFCMTokensTableQuery);
    console.log('✅ Success: FCM Tokens table created successfully!');
  } catch (error) {
    console.error('❌ Error creating FCM tokens table:', error);
  } finally {
    process.exit();
  }
}

migrateFCM();
