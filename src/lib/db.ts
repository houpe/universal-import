import { sql } from '@vercel/postgres';

export function getSql() {
  return sql;
}

export async function ensureTemplateTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS template_mappings (
        id SERIAL PRIMARY KEY,
        fingerprint VARCHAR(64) UNIQUE NOT NULL,
        headers JSONB NOT NULL,
        column_mappings JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_template_fingerprint ON template_mappings(fingerprint)`;
    return true;
  } catch {
    return false;
  }
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
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_external_code ON orders(external_code)`;
    await ensureTemplateTable();
    return true;
  } catch {
    return false;
  }
}
