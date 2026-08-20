import api from './axios';
import type { Pack } from '../types';

export async function getPacks() {
  const { data } = await api.get<Pack[]>('/packs');
  return data;
}

export async function getPack(id: number) {
  const { data } = await api.get<Pack>(`/packs/${id}`);
  return data;
}

export async function createPack(pack: Omit<Pack, 'id'>) {
  const { data } = await api.post<Pack>('/packs', pack);
  return data;
}

export async function updatePack(id: number, pack: Omit<Pack, 'id'>) {
  const { data } = await api.put<Pack>(`/packs/${id}`, pack);
  return data;
}

export async function deletePack(id: number) {
  await api.delete(`/packs/${id}`);
}
