import api from './axios';

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
  controle: boolean;
  statut: 'en_attente' | 'soumis' | 'approuve' | 'refuse';
  created_by?: number;
  created_at?: string;
}

export interface CommandeInput {
  nr_commande: string;
  date: string;
  article_id: number;
  nombre: number;
  prix_unitaire?: number | null;
  fournisseur_id: number;
  controle: boolean;
}

export async function getCommandes() {
  const { data } = await api.get<Commande[]>('/commandes');
  return data;
}

export async function createCommande(payload: CommandeInput) {
  const { data } = await api.post<Commande>('/commandes', payload);
  return data;
}

export async function updateCommande(id: number, payload: CommandeInput) {
  const { data } = await api.put<Commande>(`/commandes/${id}`, payload);
  return data;
}

export async function deleteCommande(id: number) {
  await api.delete(`/commandes/${id}`);
}

export async function relancerDevis(id: number) {
  const { data } = await api.post<{ message: string }>(`/commandes/${id}/relancer-devis`);
  return data;
}

export async function envoyerAdmin(id: number) {
  const { data } = await api.post<{ message: string; commande: Commande }>(
    `/commandes/${id}/envoyer-admin`
  );
  return data;
}

export async function approuverCommande(id: number) {
  const { data } = await api.post<{ message: string; commande: Commande }>(`/commandes/${id}/approuver`);
  return data;
}

export async function refuserCommande(id: number) {
  const { data } = await api.post<{ message: string; commande: Commande }>(`/commandes/${id}/refuser`);
  return data;
}
