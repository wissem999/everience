import { pool } from '../config/db';

export interface Fournisseur {
  id: number;
  nom: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  mail?: string;
  groupe: 'privilegie' | 'non';
}

export async function findAll() {
  const [rows] = await pool.query('SELECT * FROM fournisseurs ORDER BY nom');
  return rows as Fournisseur[];
}

export async function findById(id: number) {
  const [rows] = await pool.query('SELECT * FROM fournisseurs WHERE id = ?', [id]);
  return (rows as Fournisseur[])[0];
}

export async function create(data: Omit<Fournisseur, 'id'>) {
  const [result] = await pool.query(
    `INSERT INTO fournisseurs (nom, adresse, ville, pays, telephone, mail, groupe)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.nom, data.adresse ?? null, data.ville ?? null, data.pays ?? null, data.telephone ?? null, data.mail ?? null, data.groupe]
  );
  const id = (result as { insertId: number }).insertId;
  return findById(id);
}

export async function update(id: number, data: Omit<Fournisseur, 'id'>) {
  await pool.query(
    `UPDATE fournisseurs
     SET nom = ?, adresse = ?, ville = ?, pays = ?, telephone = ?, mail = ?, groupe = ?
     WHERE id = ?`,
    [data.nom, data.adresse ?? null, data.ville ?? null, data.pays ?? null, data.telephone ?? null, data.mail ?? null, data.groupe, id]
  );
  return findById(id);
}

export async function remove(id: number) {
  const [result] = await pool.query('DELETE FROM fournisseurs WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}
