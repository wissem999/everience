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

export type BookingType = 'entree' | 'sortie' | 'retour' | 'corbeille' | 'recuperation';
export type RetourCondition = 'bon' | 'endommage';

export interface Booking {
  id: number;
  type: BookingType;
  retour_condition?: RetourCondition | null;
  nr_facture?: string;
  nr_bon_commande?: string;
  fournisseur_id?: number;
  client_id?: number;
  article_id?: number;
  fournisseur?: string;
  client?: string;
  nr_article?: string;
  nombre: number;
  date: string;
}

export interface ClientStockEntry {
  client_id: number;
  client: string;
  qty: number;
}

export interface StockSummary {
  article_id: number;
  num_article: string;
  nom: string;
  stock_dsi: number;
  stock_clients: ClientStockEntry[];
  stock_corbeille: number;
}

export interface BookingFilters {
  type?: string;
  date_from?: string;
  date_to?: string;
  client_id?: number;
  fournisseur_id?: number;
  article_id?: number;
}

export interface PackItem {
  id: number;
  pack_id: number;
  article_id: number;
  num_article?: string;
  nom?: string;
  quantite: number;
}

export interface Pack {
  id: number;
  nom: string;
  description?: string;
  items: PackItem[];
}
