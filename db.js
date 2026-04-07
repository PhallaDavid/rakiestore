import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DB_HOST || !process.env.DB_PORT) {
  console.error("🚨 CRITICAL ERROR: DB_HOST or DB_PORT is missing from the Environment Variables!");
  console.error("🚨 DID YOU FORGET TO ADD THEM IN THE RENDER DASHBOARD?");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false // Aiven requires SSL
  }
});

export default pool;