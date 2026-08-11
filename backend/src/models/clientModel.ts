import { pool } from '../config/db';

export interface Client {
  id: number;
  nom: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  mail?: string;
}

export async function findAll() {
  const [rows] = await pool.query('SELECT * FROM clients ORDER BY nom');
  return rows as Client[];
}

export async function findById(id: number) {
  const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [id]);
  return (rows as Client[])[0];
}

export async function create(data: Omit<Client, 'id'>) {
  const [result] = await pool.query(
    `INSERT INTO clients (nom, adresse, ville, pays, telephone, mail)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.nom, data.adresse ?? null, data.ville ?? null, data.pays ?? null, data.telephone ?? null, data.mail ?? null]
  );
  const id = (result as { insertId: number }).insertId;
  return findById(id);
}

export async function update(id: number, data: Omit<Client, 'id'>) {
  await pool.query(
    `UPDATE clients
     SET nom = ?, adresse = ?, ville = ?, pays = ?, telephone = ?, mail = ?
     WHERE id = ?`,
    [data.nom, data.adresse ?? null, data.ville ?? null, data.pays ?? null, data.telephone ?? null, data.mail ?? null, id]
  );
  return findById(id);
}

export async function remove(id: number) {
  const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}
