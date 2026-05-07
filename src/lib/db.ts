import { sql } from '@vercel/postgres';

export function getSql() {
  return sql;
}

export async function ensureTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        external_code VARCHAR(100),
        sender_name VARCHAR(100) NOT NULL,
        sender_phone VARCHAR(20) NOT NULL,
        sender_address TEXT NOT NULL,
        receiver_name VARCHAR(100) NOT NULL,
        receiver_phone VARCHAR(20) NOT NULL,
        receiver_address TEXT NOT NULL,
        weight DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        temp_zone VARCHAR(10) NOT NULL,
        remark TEXT,
        batch_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    return true;
  } catch {
    return false;
  }
}
