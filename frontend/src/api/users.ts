import api from './axios';
import type { User } from '../types';

export async function getUsers() {
  const { data } = await api.get<User[]>('/users');
  return data;
}

export async function createUser(user: { nom: string; email: string; password: string }) {
  const { data } = await api.post<User>('/users', user);
  return data;
}

export async function updateUser(id: number, user: { nom: string; email: string; password?: string }) {
  const { data } = await api.put<User>(`/users/${id}`, user);
  return data;
}

export async function deleteUser(id: number) {
  await api.delete(`/users/${id}`);
}
