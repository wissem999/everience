import { pool } from '../config/db';

const SELECT_COLUMNS = `
  i.id, i.numero_serie, i.article_id, i.statut, i.client_id, i.employee_name, i.date_affectation, i.created_at,
  p.nom AS article_nom, p.num_article,
  c.nom AS client_nom
`;

export interface Inventaire {
  id: number;
  numero_serie: string;
  article_id: number;
  statut: 'stock' | 'affecte';
  client_id: number | null;
  employee_name: string | null;
  date_affectation?: string | null;
  created_at?: string;
  article_nom?: string;
  num_article?: string;
  client_nom?: string;
}

export async function findAll() {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM inventaire i
     LEFT JOIN products p ON p.id = i.article_id
     LEFT JOIN clients c ON c.id = i.client_id
     ORDER BY i.created_at DESC`
  );
  return rows as Inventaire[];
}

export async function findById(id: number) {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM inventaire i
     LEFT JOIN products p ON p.id = i.article_id
     LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.id = ?`,
    [id]
  );
  return (rows as Inventaire[])[0];
}

export async function findByNumeroSerieAndArticle(numero_serie: string, article_id: number, excludeId?: number) {
  const where = excludeId ? 'AND i.id != ?' : '';
  const params = excludeId ? [numero_serie, article_id, excludeId] : [numero_serie, article_id];
  const [rows] = await pool.query(
    `SELECT i.id FROM inventaire i WHERE i.numero_serie = ? AND i.article_id = ? ${where} LIMIT 1`,
    params
  );
  return (rows as { id: number }[])[0];
}

export async function create(data: { numero_serie: string; article_id: number }) {
  const [result] = await pool.query(
    `INSERT INTO inventaire (numero_serie, article_id) VALUES (?, ?)`,
    [data.numero_serie, data.article_id]
  );
  const id = (result as { insertId: number }).insertId;
  return findById(id);
}

export async function update(id: number, data: {
  numero_serie: string;
  article_id: number;
  statut: 'stock' | 'affecte';
  client_id: number | null;
  employee_name: string | null;
}) {
  const date_affectation = data.statut === 'affecte' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
  await pool.query(
    `UPDATE inventaire
     SET numero_serie = ?, article_id = ?, statut = ?, client_id = ?, employee_name = ?, date_affectation = ?
     WHERE id = ?`,
    [data.numero_serie, data.article_id, data.statut, data.client_id, data.employee_name, date_affectation, id]
  );
  return findById(id);
}

export async function remove(id: number) {
  const [result] = await pool.query('DELETE FROM inventaire WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}
