import { pool } from '../config/db';

export interface User {
  id: number;
  nom: string;
  email: string;
  password_hash?: string;
  role: 'admin' | 'user';
}

export async function findAll() {
  const [rows] = await pool.query(
    'SELECT id, nom, email, role, created_at FROM users ORDER BY nom'
  );
  return rows as User[];
}

export async function findById(id: number) {
  const [rows] = await pool.query(
    'SELECT id, nom, email, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return (rows as User[])[0];
}

export async function findByEmail(email: string) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return (rows as User[])[0];
}

export async function create(data: { nom: string; email: string; password_hash: string; role: string }) {
  const [result] = await pool.query(
    'INSERT INTO users (nom, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [data.nom, data.email, data.password_hash, data.role]
  );
  const id = (result as { insertId: number }).insertId;
  return findById(id);
}

export async function update(id: number, data: { nom: string; email: string; role: string }) {
  await pool.query('UPDATE users SET nom = ?, email = ?, role = ? WHERE id = ?', [
    data.nom,
    data.email,
    data.role,
    id,
  ]);
  return findById(id);
}

export async function updatePassword(id: number, password_hash: string) {
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
}

export async function remove(id: number) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}
