import { pool } from '../config/db';
import { checkStockAlert } from '../services/emailService';

const SELECT_COLUMNS = `
  id, num_article, nom, description, type, prix, stock, stock_min, created_at,
  (prix * stock) AS valeur_stock,
  IF(stock <= stock_min, 'Besoin Actif', 'Actif') AS status
`;

export interface Product {
  id: number;
  num_article: string;
  nom: string;
  description?: string;
  type?: string;
  prix: number;
  stock: number;
  stock_min: number;
  valeur_stock?: number;
  status?: string;
}

export async function findAll() {
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM products ORDER BY nom`);
  return rows as Product[];
}

export async function findById(id: number) {
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM products WHERE id = ?`, [id]);
  return (rows as Product[])[0];
}

export async function create(data: Omit<Product, 'id'>) {
  const [result] = await pool.query(
    `INSERT INTO products (num_article, nom, description, type, prix, stock, stock_min)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.num_article, data.nom, data.description ?? null, data.type ?? null, data.prix, data.stock, data.stock_min]
  );
  const id = (result as { insertId: number }).insertId;
  return findById(id);
}

export async function update(id: number, data: Omit<Product, 'id'>) {
  const [oldRows] = await pool.query('SELECT stock FROM products WHERE id = ?', [id]);
  const old = (oldRows as { stock: number }[])[0];
  await pool.query(
    `UPDATE products
     SET num_article = ?, nom = ?, description = ?, type = ?, prix = ?, stock = ?, stock_min = ?
     WHERE id = ?`,
    [data.num_article, data.nom, data.description ?? null, data.type ?? null, data.prix, data.stock, data.stock_min, id]
  );
  if (old && data.stock < old.stock) {
    void checkStockAlert(id, old.stock, data.stock);
  }
  return findById(id);
}

export async function remove(id: number) {
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}
