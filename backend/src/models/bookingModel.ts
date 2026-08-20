import { pool } from '../config/db';
import { ApiError } from '../middleware/error';
import { checkStockAlert } from '../services/emailService';

export type BookingType = 'entree' | 'sortie' | 'retour' | 'corbeille' | 'recuperation';
export type RetourCondition = 'bon' | 'endommage';

export interface Booking {
  id: number;
  type: BookingType;
  retour_condition?: RetourCondition | null;
  nr_facture?: string;
  nr_bon_commande?: string;
  fournisseur_id?: number;
  client_id?: number;
  article_id: number;
  nr_article?: string;
  article_nom?: string;
  fournisseur?: string;
  client?: string;
  nombre: number;
  date: string;
}

export interface BookingData {
  type: BookingType;
  retour_condition?: RetourCondition | null;
  nr_facture?: string;
  nr_bon_commande?: string;
  fournisseur_id?: number;
  client_id?: number;
  article_id: number;
  nombre: number;
  date: string;
}

export interface BookingFilters {
  type?: string;
  date_from?: string;
  date_to?: string;
  client_id?: number;
  fournisseur_id?: number;
  article_id?: number;
}

const SELECT_FIELDS = `b.id, b.type, b.retour_condition, b.nr_facture, b.nr_bon_commande,
  b.fournisseur_id, b.client_id, b.article_id, b.nombre,
  DATE_FORMAT(b.date, '%Y-%m-%dT%H:%i:%s') AS date,
  p.num_article AS nr_article, p.nom AS article_nom,
  f.nom AS fournisseur, c.nom AS client`;

function computeDelta(type: BookingType, nombre: number, retourCondition?: RetourCondition | null): number {
  switch (type) {
    case 'entree':
      return nombre;
    case 'sortie':
      return -nombre;
    case 'retour':
      return retourCondition === 'endommage' ? 0 : nombre;
    case 'corbeille':
      return -nombre;
    case 'recuperation':
      return nombre;
    default:
      return 0;
  }
}

export async function findAll(filters?: BookingFilters) {
  let where = '1=1';
  const params: unknown[] = [];

  if (filters?.type && filters.type !== 'all') {
    where += ' AND b.type = ?';
    params.push(filters.type);
  }
  if (filters?.date_from) {
    where += ' AND b.date >= ?';
    params.push(filters.date_from);
  }
  if (filters?.date_to) {
    where += ' AND b.date <= ?';
    params.push(filters.date_to);
  }
  if (filters?.client_id) {
    where += ' AND b.client_id = ?';
    params.push(filters.client_id);
  }
  if (filters?.fournisseur_id) {
    where += ' AND b.fournisseur_id = ?';
    params.push(filters.fournisseur_id);
  }
  if (filters?.article_id) {
    where += ' AND b.article_id = ?';
    params.push(filters.article_id);
  }

  const [rows] = await pool.query(
    `SELECT ${SELECT_FIELDS}
     FROM bookings b
     LEFT JOIN fournisseurs f ON f.id = b.fournisseur_id
     LEFT JOIN clients c ON c.id = b.client_id
     LEFT JOIN products p ON p.id = b.article_id
     WHERE ${where}
     ORDER BY b.date DESC`,
    params
  );
  return rows as Booking[];
}

export async function findById(id: number) {
  const [rows] = await pool.query(
    `SELECT ${SELECT_FIELDS}
     FROM bookings b
     LEFT JOIN fournisseurs f ON f.id = b.fournisseur_id
     LEFT JOIN clients c ON c.id = b.client_id
     LEFT JOIN products p ON p.id = b.article_id
     WHERE b.id = ?`,
    [id]
  );
  return (rows as Booking[])[0];
}

async function lockArticle(conn: any, articleId: number) {
  const [rows] = await conn.query(
    'SELECT id, num_article, nom, stock, stock_min FROM products WHERE id = ? FOR UPDATE',
    [articleId]
  );
  return (rows as { id: number; num_article: string; nom: string; stock: number; stock_min: number }[])[0];
}

function checkStock(article: { num_article: string; stock: number }, type: BookingType, nombre: number) {
  if (type === 'sortie' && nombre > article.stock) {
    throw new ApiError(400, `Stock insuffisant pour l'article ${article.num_article}. Choisissez un nombre <= ${article.stock}`);
  }
  if (type === 'corbeille' && nombre > article.stock) {
    throw new ApiError(400, `Stock insuffisant pour envoyer en corbeille. Choisissez un nombre <= ${article.stock}`);
  }
}

async function getClientArticleStock(clientId: number, articleId: number): Promise<number> {
  const [rows] = await pool.query(
    `SELECT COALESCE(
       SUM(CASE WHEN type = 'sortie' THEN nombre ELSE 0 END) -
       SUM(CASE WHEN type = 'retour' AND (retour_condition IS NULL OR retour_condition = 'bon') THEN nombre ELSE 0 END),
       0
     ) AS qty
     FROM bookings
     WHERE client_id = ? AND article_id = ?`,
    [clientId, articleId]
  );
  return (rows as { qty: number }[])[0].qty;
}

async function getCorbeilleStock(articleId: number): Promise<number> {
  const [rows] = await pool.query(
    `SELECT COALESCE(
       SUM(CASE WHEN type = 'corbeille' THEN nombre ELSE 0 END) +
       SUM(CASE WHEN type = 'retour' AND retour_condition = 'endommage' THEN nombre ELSE 0 END) -
       SUM(CASE WHEN type = 'recuperation' THEN nombre ELSE 0 END),
       0
     ) AS qty
     FROM bookings
     WHERE article_id = ?`,
    [articleId]
  );
  return (rows as { qty: number }[])[0].qty;
}

export async function create(data: BookingData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const article = await lockArticle(conn, data.article_id);
    if (!article) throw new ApiError(404, 'Article introuvable');
    checkStock(article, data.type, data.nombre);

    if (data.type === 'retour' && data.client_id) {
      const clientQty = await getClientArticleStock(data.client_id, data.article_id);
      if (data.nombre > clientQty) {
        throw new ApiError(400, `Le client n'a que ${clientQty} unite(s) de cet article`);
      }
    }
    if (data.type === 'recuperation') {
      const corbeilleQty = await getCorbeilleStock(data.article_id);
      if (data.nombre > corbeilleQty) {
        throw new ApiError(400, `Corbeille ne contient que ${corbeilleQty} unite(s) de cet article`);
      }
    }

    const [result] = await conn.query(
      `INSERT INTO bookings (type, retour_condition, nr_facture, nr_bon_commande, fournisseur_id, client_id, article_id, nombre, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.type,
        data.retour_condition ?? null,
        data.nr_facture ?? null,
        data.nr_bon_commande ?? null,
        data.fournisseur_id ?? null,
        data.client_id ?? null,
        data.article_id,
        data.nombre,
        data.date,
      ]
    );
    const delta = computeDelta(data.type, data.nombre, data.retour_condition);
    const after = article.stock + delta;
    if (delta !== 0) {
      await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [delta, data.article_id]);
    }
    await conn.commit();
    void checkStockAlert(data.article_id, article.stock, after);

    const id = (result as { insertId: number }).insertId;
    return findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function update(id: number, data: BookingData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [oldRows] = await conn.query(
      'SELECT type, retour_condition, nombre, article_id FROM bookings WHERE id = ? FOR UPDATE',
      [id]
    );
    const old = (oldRows as { type: BookingType; retour_condition: RetourCondition | null; nombre: number; article_id: number }[])[0];
    if (!old) throw new ApiError(404, 'Booking introuvable');

    const reverseDelta = -computeDelta(old.type, old.nombre, old.retour_condition);
    if (reverseDelta !== 0) {
      await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [reverseDelta, old.article_id]);
    }

    const article = await lockArticle(conn, data.article_id);
    if (!article) throw new ApiError(404, 'Article introuvable');
    checkStock(article, data.type, data.nombre);

    if (data.type === 'retour' && data.client_id) {
      const clientQty = await getClientArticleStock(data.client_id, data.article_id);
      const adjusted = data.nombre > clientQty ? clientQty : data.nombre;
      if (data.nombre > clientQty) {
        throw new ApiError(400, `Le client n'a que ${clientQty} unite(s) de cet article`);
      }
    }
    if (data.type === 'recuperation') {
      const corbeilleQty = await getCorbeilleStock(data.article_id);
      if (data.nombre > corbeilleQty) {
        throw new ApiError(400, `Corbeille ne contient que ${corbeilleQty} unite(s) de cet article`);
      }
    }

    await conn.query(
      `UPDATE bookings
       SET type = ?, retour_condition = ?, nr_facture = ?, nr_bon_commande = ?, fournisseur_id = ?, client_id = ?, article_id = ?, nombre = ?, date = ?
       WHERE id = ?`,
      [
        data.type,
        data.retour_condition ?? null,
        data.nr_facture ?? null,
        data.nr_bon_commande ?? null,
        data.fournisseur_id ?? null,
        data.client_id ?? null,
        data.article_id,
        data.nombre,
        data.date,
        id,
      ]
    );
    const delta = computeDelta(data.type, data.nombre, data.retour_condition);
    const after = article.stock + delta;
    if (delta !== 0) {
      await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [delta, data.article_id]);
    }
    await conn.commit();
    void checkStockAlert(data.article_id, article.stock, after);

    return findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function remove(id: number) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT type, retour_condition, nombre, article_id FROM bookings WHERE id = ?', [id]);
    const b = (rows as { type: BookingType; retour_condition: RetourCondition | null; nombre: number; article_id: number }[])[0];
    if (!b) {
      await conn.rollback();
      return false;
    }
    const [articleRows] = await conn.query(
      'SELECT id, stock, stock_min FROM products WHERE id = ? FOR UPDATE',
      [b.article_id]
    );
    const p = (articleRows as { id: number; stock: number; stock_min: number }[])[0];
    if (!p) {
      await conn.rollback();
      return false;
    }
    const delta = -computeDelta(b.type, b.nombre, b.retour_condition);
    const after = p.stock + delta;
    if (delta !== 0) {
      await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [delta, b.article_id]);
    }
    await conn.query('DELETE FROM bookings WHERE id = ?', [id]);
    await conn.commit();
    void checkStockAlert(b.article_id, p.stock, after);
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export interface ClientStockEntry {
  client_id: number;
  client: string;
  qty: number;
}

export interface StockSummary {
  article_id: number;
  num_article: string;
  nom: string;
  stock_dsi: number;
  stock_clients: ClientStockEntry[];
  stock_corbeille: number;
}

export async function getStockSummary(): Promise<StockSummary[]> {
  const [products] = await pool.query(
    'SELECT id, num_article, nom, stock FROM products ORDER BY num_article'
  );

  const [clientStock] = await pool.query(
    `SELECT b.article_id, b.client_id, c.nom AS client,
       SUM(CASE WHEN b.type = 'sortie' THEN b.nombre ELSE 0 END) -
       SUM(CASE WHEN b.type = 'retour' THEN b.nombre ELSE 0 END) AS qty
     FROM bookings b
     LEFT JOIN clients c ON c.id = b.client_id
     WHERE b.client_id IS NOT NULL
     GROUP BY b.article_id, b.client_id, c.nom
     HAVING qty > 0`
  );

  const [corbeilleStock] = await pool.query(
    `SELECT article_id,
       SUM(CASE WHEN type = 'corbeille' THEN nombre ELSE 0 END) +
       SUM(CASE WHEN type = 'retour' AND retour_condition = 'endommage' THEN nombre ELSE 0 END) -
       SUM(CASE WHEN type = 'recuperation' THEN nombre ELSE 0 END) AS qty
     FROM bookings
     GROUP BY article_id
     HAVING qty > 0`
  );

  const clientMap = new Map<number, ClientStockEntry[]>();
  for (const row of clientStock as { article_id: number; client_id: number; client: string; qty: number }[]) {
    if (!clientMap.has(row.article_id)) clientMap.set(row.article_id, []);
    clientMap.get(row.article_id)!.push({ client_id: row.client_id, client: row.client, qty: row.qty });
  }

  const corbeilleMap = new Map<number, number>();
  for (const row of corbeilleStock as { article_id: number; qty: number }[]) {
    corbeilleMap.set(row.article_id, row.qty);
  }

  return (products as { id: number; num_article: string; nom: string; stock: number }[]).map((p) => ({
    article_id: p.id,
    num_article: p.num_article,
    nom: p.nom,
    stock_dsi: p.stock,
    stock_clients: clientMap.get(p.id) || [],
    stock_corbeille: corbeilleMap.get(p.id) || 0,
  }));
}
