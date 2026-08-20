import api from './axios';

export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await api.get('/settings');
  return data;
}

export async function updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
  const { data } = await api.put('/settings', settings);
  return data;
}
