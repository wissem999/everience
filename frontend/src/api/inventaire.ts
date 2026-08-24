import api from './axios';
import type { Inventaire } from '../types';

export async function getInventaire() {
  const { data } = await api.get<Inventaire[]>('/inventaire');
  return data;
}

export async function createInventaire(item: Omit<Inventaire, 'id' | 'created_at' | 'article_nom' | 'num_article' | 'client_nom'>) {
  const { data } = await api.post<Inventaire>('/inventaire', item);
  return data;
}

export async function updateInventaire(id: number, item: Omit<Inventaire, 'id' | 'created_at' | 'article_nom' | 'num_article' | 'client_nom'>) {
  const { data } = await api.put<Inventaire>(`/inventaire/${id}`, item);
  return data;
}

export async function deleteInventaire(id: number) {
  await api.delete(`/inventaire/${id}`);
}
