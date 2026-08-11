import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'everience',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export async function testDbConnection() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
  console.log('[db] Connected to MySQL database:', process.env.DB_NAME);
}
