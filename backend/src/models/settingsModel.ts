import { pool } from '../config/db';

export interface Setting {
  setting_key: string;
  setting_value: string;
}

export async function findAll(): Promise<Setting[]> {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
  return rows as Setting[];
}

export async function findByKey(key: string): Promise<string | null> {
  const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
  const arr = rows as { setting_value: string }[];
  return arr.length ? arr[0].setting_value : null;
}

export async function getMany(keys: string[]): Promise<Record<string, string>> {
  if (!keys.length) return {};
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT setting_key, setting_value FROM settings WHERE setting_key IN (${placeholders})`,
    keys
  );
  const map: Record<string, string> = {};
  for (const r of rows as Setting[]) {
    map[r.setting_key] = r.setting_value;
  }
  return map;
}

export async function upsertMany(entries: { key: string; value: string }[]): Promise<void> {
  if (!entries.length) return;
  for (const e of entries) {
    await pool.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      [e.key, e.value]
    );
  }
}
