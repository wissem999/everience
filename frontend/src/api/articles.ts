import api from './axios';
import type { Product } from '../types';

export async function getProducts() {
  const { data } = await api.get<Product[]>('/articles');
  return data;
}

export async function createProduct(product: Omit<Product, 'id'>) {
  const { data } = await api.post<Product>('/articles', product);
  return data;
}

export async function updateProduct(id: number, product: Omit<Product, 'id'>) {
  const { data } = await api.put<Product>(`/articles/${id}`, product);
  return data;
}

export async function deleteProduct(id: number) {
  await api.delete(`/articles/${id}`);
}
