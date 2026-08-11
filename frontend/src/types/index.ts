export interface AuthUser {
  id: number;
  nom: string;
  email: string;
  role: 'admin' | 'user';
}

export interface Product {
  id: number;
  num_article: string;
  nom: string;
  description?: string;
  prix: number | string;
  stock: number;
  stock_min: number;
  valeur_stock?: number | string;
  status?: string;
}

export interface Fournisseur {
  id: number;
  nom: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  mail?: string;
  groupe: 'privilegie' | 'non';
}

export interface Client {
  id: number;
  nom: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  mail?: string;
}

export interface User {
  id: number;
  nom: string;
  email: string;
  role: 'admin' | 'user';
}
