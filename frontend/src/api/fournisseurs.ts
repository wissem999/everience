import api from './axios';
import type { Fournisseur } from '../types';

export async function getFournisseurs() {
  const { data } = await api.get<Fournisseur[]>('/fournisseurs');
  return data;
}

export async function createFournisseur(fournisseur: Omit<Fournisseur, 'id'>) {
  const { data } = await api.post<Fournisseur>('/fournisseurs', fournisseur);
  return data;
}

export async function updateFournisseur(id: number, fournisseur: Omit<Fournisseur, 'id'>) {
  const { data } = await api.put<Fournisseur>(`/fournisseurs/${id}`, fournisseur);
  return data;
}

export async function deleteFournisseur(id: number) {
  await api.delete(`/fournisseurs/${id}`);
}
