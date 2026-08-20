import { pool } from '../config/db';
import { ApiError } from '../middleware/error';

export interface Commande {
  id: number;
  nr_commande: string;
  date: string;
  article_id: number;
  nr_article?: string;
  article_nom?: string;
  nombre: number;
  prix_unitaire?: number | null;
  prix_total?: number | null;
  fournisseur_id: number;
  fournisseur?: string;
  fournisseur_mail?: string;
  controle: boolean;
  statut: 'en_attente' | 'soumis' | 'approuve' | 'refuse';
  created_by?: number;
  created_at?: string;
}

export interface CommandeData {
  nr_commande: string;
  date: string;
  article_id: number;
  nombre: number;
  prix_unitaire?: number | null;
  prix_total?: number | null;
  fournisseur_id: number;
  controle: boolean;
}

const SELECT_FIELDS = `
  c.id, c.nr_commande, DATE_FORMAT(c.date, '%Y-%m-%dT%H:%i:%s') AS date,
  c.article_id, p.num_article AS nr_article, p.nom AS article_nom,
  c.nombre, c.prix_unitaire, c.prix_total, c.fournisseur_id,
  f.nom AS fournisseur, f.mail AS fournisseur_mail,
  c.controle, c.statut, c.created_by,
  DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at`;

function rowToCommande(row: Record<string, unknown>): Commande {
  return {
    ...row,
    controle: Number(row.controle) === 1,
  } as unknown as Commande;
}

export async function findAll() {
  const [rows] = await pool.query(
    `SELECT ${SELECT_FIELDS}
     FROM commandes c
     LEFT JOIN products p ON p.id = c.article_id
     LEFT JOIN fournisseurs f ON f.id = c.fournisseur_id
     ORDER BY c.created_at DESC`
  );
  return (rows as Record<string, unknown>[]).map(rowToCommande);
}

export async function findById(id: number) {
  const [rows] = await pool.query(
    `SELECT ${SELECT_FIELDS}
     FROM commandes c
     LEFT JOIN products p ON p.id = c.article_id
     LEFT JOIN fournisseurs f ON f.id = c.fournisseur_id
     WHERE c.id = ?`,
    [id]
  );
  const row = (rows as Record<string, unknown>[])[0];
  return row ? rowToCommande(row) : undefined;
}

async function nrExists(nr: string, excludeId?: number) {
  const [rows] = await pool.query('SELECT id FROM commandes WHERE nr_commande = ?', [nr]);
  return (rows as { id: number }[]).some((r) => r.id !== excludeId);
}

export async function create(data: CommandeData, createdBy?: number) {
  if (await nrExists(data.nr_commande)) {
    throw new ApiError(409, 'Ce numero de commande existe deja');
  }
  const [result] = await pool.query(
    `INSERT INTO commandes (nr_commande, date, article_id, nombre, prix_unitaire, prix_total, fournisseur_id, controle, statut, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', ?)`,
    [
      data.nr_commande,
      data.date,
      data.article_id,
      data.nombre,
      data.prix_unitaire ?? null,
      data.prix_total ?? null,
      data.fournisseur_id,
      data.controle,
      createdBy ?? null,
    ]
  );
  const id = (result as { insertId: number }).insertId;
  return findById(id);
}

export async function update(id: number, data: CommandeData) {
  if (await nrExists(data.nr_commande, id)) {
    throw new ApiError(409, 'Ce numero de commande existe deja');
  }
  await pool.query(
    `UPDATE commandes
     SET nr_commande = ?, date = ?, article_id = ?, nombre = ?,
         prix_unitaire = ?, prix_total = ?, fournisseur_id = ?, controle = ?
     WHERE id = ?`,
    [
      data.nr_commande,
      data.date,
      data.article_id,
      data.nombre,
      data.prix_unitaire ?? null,
      data.prix_total ?? null,
      data.fournisseur_id,
      data.controle,
      id,
    ]
  );
  return findById(id);
}

export async function setStatut(id: number, statut: Commande['statut']) {
  await pool.query('UPDATE commandes SET statut = ? WHERE id = ?', [statut, id]);
  return findById(id);
}

export async function remove(id: number) {
  const [result] = await pool.query('DELETE FROM commandes WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}
