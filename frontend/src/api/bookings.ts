import api from './axios';
import type { Booking, BookingFilters, StockSummary } from '../types';

function buildParams(filters?: BookingFilters) {
  if (!filters) return {};
  const params: Record<string, string | number> = {};
  if (filters.type && filters.type !== 'all') params.type = filters.type;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.client_id) params.client_id = filters.client_id;
  if (filters.fournisseur_id) params.fournisseur_id = filters.fournisseur_id;
  if (filters.article_id) params.article_id = filters.article_id;
  return params;
}

export async function getBookings(filters?: BookingFilters) {
  const { data } = await api.get<Booking[]>('/bookings', { params: buildParams(filters) });
  return data;
}

export async function createBooking(booking: Omit<Booking, 'id'>) {
  const { data } = await api.post<Booking>('/bookings', booking);
  return data;
}

export async function updateBooking(id: number, booking: Omit<Booking, 'id'>) {
  const { data } = await api.put<Booking>(`/bookings/${id}`, booking);
  return data;
}

export async function deleteBooking(id: number) {
  await api.delete(`/bookings/${id}`);
}

export async function getStockSummary() {
  const { data } = await api.get<StockSummary[]>('/bookings/stock-summary');
  return data;
}
