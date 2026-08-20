import { pool } from '../config/db';
import { ApiError } from '../middleware/error';

export interface PackItem {
  id: number;
  pack_id: number;
  article_id: number;
  num_article?: string;
  nom?: string;
  quantite: number;
}

export interface Pack {
  id: number;
  nom: string;
  description?: string;
  items: PackItem[];
}

export interface PackData {
  nom: string;
  description?: string;
  items: { article_id: number; quantite: number }[];
}

export async function findAll(): Promise<Pack[]> {
  const [packs] = await pool.query('SELECT id, nom, description FROM packs ORDER BY nom');
  const result: Pack[] = [];
  for (const p of packs as { id: number; nom: string; description: string | null }[]) {
    const [items] = await pool.query(
      `SELECT pi.id, pi.pack_id, pi.article_id, pi.quantite,
              p.num_article AS num_article, p.nom AS nom
       FROM pack_items pi
       LEFT JOIN products p ON p.id = pi.article_id
       WHERE pi.pack_id = ?
       ORDER BY p.num_article`,
      [p.id]
    );
    result.push({ ...p, description: p.description ?? undefined, items: items as PackItem[] });
  }
  return result;
}

export async function findById(id: number): Promise<Pack | undefined> {
  const [packs] = await pool.query('SELECT id, nom, description FROM packs WHERE id = ?', [id]);
  const p = (packs as { id: number; nom: string; description: string | null }[])[0];
  if (!p) return undefined;
  const [items] = await pool.query(
    `SELECT pi.id, pi.pack_id, pi.article_id, pi.quantite,
            pr.num_article AS num_article, pr.nom AS nom
     FROM pack_items pi
     LEFT JOIN products pr ON pr.id = pi.article_id
     WHERE pi.pack_id = ?
     ORDER BY pr.num_article`,
    [id]
  );
  return { ...p, description: p.description ?? undefined, items: items as PackItem[] };
}

export async function create(data: PackData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query('INSERT INTO packs (nom, description) VALUES (?, ?)', [
      data.nom,
      data.description ?? null,
    ]);
    const packId = (result as { insertId: number }).insertId;
    for (const item of data.items) {
      await conn.query('INSERT INTO pack_items (pack_id, article_id, quantite) VALUES (?, ?, ?)', [
        packId,
        item.article_id,
        item.quantite,
      ]);
    }
    await conn.commit();
    return findById(packId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function update(id: number, data: PackData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT id FROM packs WHERE id = ?', [id]);
    if (!(existing as any[])[0]) throw new ApiError(404, 'Pack introuvable');
    await conn.query('UPDATE packs SET nom = ?, description = ? WHERE id = ?', [
      data.nom,
      data.description ?? null,
      id,
    ]);
    await conn.query('DELETE FROM pack_items WHERE pack_id = ?', [id]);
    for (const item of data.items) {
      await conn.query('INSERT INTO pack_items (pack_id, article_id, quantite) VALUES (?, ?, ?)', [
        id,
        item.article_id,
        item.quantite,
      ]);
    }
    await conn.commit();
    return findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function remove(id: number): Promise<boolean> {
  const [result] = await pool.query('DELETE FROM packs WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}
