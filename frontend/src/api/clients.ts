import api from './axios';
import type { Client } from '../types';

export async function getClients() {
  const { data } = await api.get<Client[]>('/clients');
  return data;
}

export async function createClient(client: Omit<Client, 'id'>) {
  const { data } = await api.post<Client>('/clients', client);
  return data;
}

export async function updateClient(id: number, client: Omit<Client, 'id'>) {
  const { data } = await api.put<Client>(`/clients/${id}`, client);
  return data;
}

export async function deleteClient(id: number) {
  await api.delete(`/clients/${id}`);
}
