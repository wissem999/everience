import { useEffect, useMemo, useState } from 'react';
import type { Booking, BookingType, StockSummary, Pack } from '../types';
import { createBooking, deleteBooking, getBookings, getStockSummary, updateBooking } from '../api/bookings';
import { getClients } from '../api/clients';
import { getFournisseurs } from '../api/fournisseurs';
import { getProducts } from '../api/articles';
import { getPacks } from '../api/packs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import type { BookingFilters } from '../types';

interface FormState {
  type: BookingType;
  retour_condition: '' | 'bon' | 'endommage';
  nr_facture: string;
  nr_bon_commande: string;
  fournisseur_id: string;
  client_id: string;
  article_id: string;
  nombre: string;
  date: string;
}

const emptyForm: FormState = {
  type: 'entree',
  retour_condition: '',
  nr_facture: '',
  nr_bon_commande: '',
  fournisseur_id: '',
  client_id: '',
  article_id: '',
  nombre: '',
  date: '',
};

function localDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none';
const errorInputClass =
  'w-full rounded-xl border border-red-500 px-3 py-2 text-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 focus:outline-none';

const fieldClass = (invalid: boolean) => (invalid ? errorInputClass : inputClass);

const TYPE_LABELS: Record<BookingType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  retour: 'Retour',
  corbeille: 'Corbeille',
  recuperation: 'Récupération',
};

const TYPE_COLORS: Record<BookingType, string> = {
  entree: 'bg-green-100 text-green-700',
  sortie: 'bg-red-100 text-red-700',
  retour: 'bg-blue-100 text-blue-700',
  corbeille: 'bg-yellow-100 text-yellow-700',
  recuperation: 'bg-purple-100 text-purple-700',
};

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<{ id: number; nom: string }[]>([]);
  const [fournisseurs, setFournisseurs] = useState<{ id: number; nom: string }[]>([]);
  const [articles, setArticles] = useState<{ id: number; num_article: string; nom: string; stock: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);

  const [filters, setFilters] = useState<BookingFilters>({ type: 'all' });
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [showStockSummary, setShowStockSummary] = useState(false);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  const [packs, setPacks] = useState<Pack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [packMultiplier, setPackMultiplier] = useState<number>(1);
  const [packItems, setPackItems] = useState<{ article_id: number; num_article: string; nom: string; quantite: number; stock: number }[]>([]);

  const touch = (field: keyof FormState) => {
    setFormError('');
    setInvalidFields((prev) => prev.filter((f) => f !== field));
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const b = await getBookings(filters);
      setBookings(b);
    } catch {
      setError('Impossible de charger les bookings');
    } finally {
      setLoading(false);
    }
  };

  const loadBase = async () => {
    const [c, f, a, pk] = await Promise.all([getClients(), getFournisseurs(), getProducts(), getPacks()]);
    setClients(c.map((x) => ({ id: x.id, nom: x.nom })));
    setFournisseurs(f.map((x) => ({ id: x.id, nom: x.nom })));
    setArticles(a.map((x) => ({ id: x.id, num_article: x.num_article, nom: x.nom, stock: x.stock })));
    setPacks(pk);
  };

  const loadStockSummary = async () => {
    try {
      const s = await getStockSummary();
      setStockSummary(s);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filters]);

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (showStockSummary) loadStockSummary();
  }, [showStockSummary]);

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setInvalidFields([]);
    setOriginal(null);
    setForm({ ...emptyForm, date: localDateTime(new Date()) });
    setSelectedPackId('');
    setPackMultiplier(1);
    setPackItems([]);
    setShowModal(true);
  };

  const openEdit = (b: Booking) => {
    const snapshot: FormState = {
      type: b.type,
      retour_condition: b.retour_condition ?? '',
      nr_facture: b.nr_facture ?? '',
      nr_bon_commande: b.nr_bon_commande ?? '',
      fournisseur_id: b.fournisseur_id ? String(b.fournisseur_id) : '',
      client_id: b.client_id ? String(b.client_id) : '',
      article_id: b.article_id ? String(b.article_id) : '',
      nombre: String(b.nombre),
      date: b.date.slice(0, 16),
    };
    setEditing(b);
    setFormError('');
    setInvalidFields([]);
    setOriginal(snapshot);
    setForm(snapshot);
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError('');
    setInvalidFields([]);
    const nombre = Number(form.nombre);
    const errs: Array<[string, string]> = [];
    if ((form.type === 'entree' || form.type === 'recuperation') && !form.fournisseur_id && form.type === 'entree') {
      errs.push(['fournisseur_id', 'Selectionnez un fournisseur']);
    }
    if ((form.type === 'sortie' || form.type === 'retour') && !form.client_id) {
      errs.push(['client_id', 'Selectionnez un client']);
    }
    if (form.type === 'retour' && !form.retour_condition) {
      errs.push(['retour_condition', "Selectionnez l'etat du retour"]);
    }
    if (!form.article_id) {
      errs.push(['article_id', 'Selectionnez un article']);
    }
    const selectedArticle = articles.find((a) => a.id === Number(form.article_id));
    if (form.type === 'sortie' && selectedArticle && nombre > selectedArticle.stock) {
      errs.push([
        'nombre',
        `Stock insuffisant pour l'article ${selectedArticle.num_article}. Choisissez un nombre <= ${selectedArticle.stock}`,
      ]);
    }
    if (form.type === 'corbeille' && selectedArticle && nombre > selectedArticle.stock) {
      errs.push([
        'nombre',
        `Stock insuffisant pour envoyer en corbeille. Choisissez un nombre <= ${selectedArticle.stock}`,
      ]);
    }
    if (!Number.isInteger(nombre) || nombre <= 0) {
      errs.push(['nombre', 'Le nombre doit etre un entier positif']);
    }
    if (!form.date) errs.push(['date', 'La date est requise']);
    if (errs.length) {
      setInvalidFields(errs.map(([f]) => f));
      setFormError(errs[0][1]);
      return;
    }

    if (editing && original && JSON.stringify(form) === JSON.stringify(original)) {
      setFormError('Vous devez modifier au moins un champ');
      return;
    }

    try {
      const payload = {
        type: form.type,
        retour_condition: form.type === 'retour' ? form.retour_condition || null : null,
        nr_facture: form.nr_facture.trim() || undefined,
        nr_bon_commande: form.nr_bon_commande.trim() || undefined,
        fournisseur_id: form.type === 'entree' && form.fournisseur_id ? Number(form.fournisseur_id) : undefined,
        client_id: (form.type === 'sortie' || form.type === 'retour') && form.client_id ? Number(form.client_id) : undefined,
        article_id: Number(form.article_id),
        nombre,
        date: form.date.replace('T', ' '),
      };
      if (editing) {
        await updateBooking(editing.id, payload);
      } else {
        await createBooking(payload);
      }
      setShowModal(false);
      await loadBookings();
      if (showStockSummary) await loadStockSummary();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (b: Booking) => {
    setDeleteTarget(b);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBooking(deleteTarget.id);
      await loadBookings();
      if (showStockSummary) await loadStockSummary();
    } catch {
      alert('Impossible de supprimer ce booking');
    } finally {
      setDeleteTarget(null);
    }
  };

  const totals = useMemo(() => {
    const t = { entree: 0, sortie: 0, retour: 0, corbeille: 0, recuperation: 0 };
    for (const b of bookings) t[b.type] += b.nombre;
    return t;
  }, [bookings]);

  const applyFilters = () => {};

  const handlePackSelect = (packId: string) => {
    setSelectedPackId(packId);
    setPackMultiplier(1);
    if (!packId) { setPackItems([]); return; }
    const pack = packs.find((p) => p.id === Number(packId));
    if (!pack) return;
    setPackItems(
      pack.items.map((i) => ({
        article_id: i.article_id,
        num_article: i.num_article ?? '',
        nom: i.nom ?? '',
        quantite: i.quantite,
        stock: articles.find((a) => a.id === i.article_id)?.stock ?? 0,
      }))
    );
  };

  const updatePackItemQty = (idx: number, qty: number) => {
    const items = [...packItems];
    items[idx] = { ...items[idx], quantite: Math.max(1, qty) };
    setPackItems(items);
  };

  const removePackItem = (idx: number) => {
    setPackItems(packItems.filter((_, i) => i !== idx));
  };

  const handleSavePack = async () => {
    setFormError('');
    if (!form.client_id) { setFormError('Selectionnez un client'); return; }
    if (!form.date) { setFormError('La date est requise'); return; }
    if (packItems.length === 0) { setFormError('Le pack doit contenir au moins un article'); return; }
    for (const item of packItems) {
      const finalQty = item.quantite * packMultiplier;
      if (finalQty > item.stock) {
        setFormError(`Stock insuffisant pour ${item.num_article}. Disponible: ${item.stock}, besoin: ${finalQty}`);
        return;
      }
    }
    try {
      for (const item of packItems) {
        const finalQty = item.quantite * packMultiplier;
        await createBooking({
          type: 'sortie',
          client_id: Number(form.client_id),
          article_id: item.article_id,
          nombre: finalQty,
          date: form.date.replace('T', ' '),
        });
      }
      setShowModal(false);
      await loadBookings();
      if (showStockSummary) await loadStockSummary();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? "Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="animate-fade-in-up rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Booking</h1>
                <p className="text-blue-100">Gestion des entrées, sorties, retours et corbeille</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowStockSummary(!showStockSummary)}
              className="rounded-xl border-2 border-white/30 px-4 py-2 text-sm font-medium text-white transition-all hover:border-white/50 hover:bg-white/10"
            >
              {showStockSummary ? 'Masquer stock' : 'Résumé stock'}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-lg transition-all hover:shadow-xl hover:bg-blue-50"
            >
              + Nouveau booking
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="animate-fade-in rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-100 p-2">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="animate-fade-in-up rounded-2xl bg-gradient-to-br from-green-50 to-green-100 p-4 shadow-sm" style={{ animationDelay: '0.1s' }}>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-green-200 p-2">
              <svg className="h-4 w-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-xs font-medium text-green-700">Entrées</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{totals.entree}</p>
        </div>

        <div className="animate-fade-in-up rounded-2xl bg-gradient-to-br from-red-50 to-red-100 p-4 shadow-sm" style={{ animationDelay: '0.2s' }}>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-red-200 p-2">
              <svg className="h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
            <p className="text-xs font-medium text-red-700">Sorties</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{totals.sortie}</p>
        </div>

        <div className="animate-fade-in-up rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 shadow-sm" style={{ animationDelay: '0.3s' }}>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-blue-200 p-2">
              <svg className="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <p className="text-xs font-medium text-blue-700">Retours</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{totals.retour}</p>
        </div>

        <div className="animate-fade-in-up rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 shadow-sm" style={{ animationDelay: '0.4s' }}>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-yellow-200 p-2">
              <svg className="h-4 w-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p className="text-xs font-medium text-yellow-700">Corbeille</p>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{totals.corbeille}</p>
        </div>

        <div className="animate-fade-in-up rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 shadow-sm" style={{ animationDelay: '0.5s' }}>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-purple-200 p-2">
              <svg className="h-4 w-4 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-xs font-medium text-purple-700">Récupérations</p>
          </div>
          <p className="text-2xl font-bold text-purple-700">{totals.recuperation}</p>
        </div>
      </div>

      {/* Stock Summary Panel */}
      {showStockSummary && (
        <div className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-800">Résumé du stock par article</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-xs uppercase text-gray-500">
                <tr>
                  <th className="rounded-tl-xl px-4 py-3">Article</th>
                  <th className="px-4 py-3 text-right">Stock DSI (entrepôt)</th>
                  <th className="px-4 py-3 text-right">Corbeille (endommagés)</th>
                  <th className="px-4 py-3 text-right">Total chez clients</th>
                  <th className="rounded-tr-xl px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {stockSummary.map((s) => {
                  const totalClient = s.stock_clients.reduce((sum, c) => sum + Number(c.qty), 0);
                  const expanded = expandedArticle === s.article_id;
                  return (
                    <>
                      <tr key={s.article_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className="font-medium">{s.num_article}</span> - {s.nom}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{s.stock_dsi}</td>
                        <td className="px-4 py-3 text-right font-semibold text-yellow-600">{s.stock_corbeille}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">{totalClient}</td>
                        <td className="px-4 py-3 text-right">
                          {s.stock_clients.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedArticle(expanded ? null : s.article_id)}
                              className="rounded-xl px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                              {expanded ? 'Masquer' : 'Détails'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded && s.stock_clients.map((c) => (
                        <tr key={`${s.article_id}-${c.client_id}`} className="bg-blue-50/50">
                          <td className="px-4 py-2 pl-10 text-xs text-gray-600">↳ {c.client}</td>
                          <td colSpan={2}></td>
                          <td className="px-4 py-2 text-right text-xs font-medium text-blue-700">{Number(c.qty)}</td>
                          <td></td>
                        </tr>
                      ))}
                    </>
                  );
                })}
                {stockSummary.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">Aucun article</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
            <select
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-4 focus:ring-blue-100 focus:outline-none"
              value={filters.type ?? 'all'}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="all">Tous</option>
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
              <option value="retour">Retour</option>
              <option value="corbeille">Corbeille</option>
              <option value="recuperation">Récupération</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Date début</label>
            <input
              type="date"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-4 focus:ring-blue-100 focus:outline-none"
              value={filters.date_from ?? ''}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Date fin</label>
            <input
              type="date"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-4 focus:ring-blue-100 focus:outline-none"
              value={filters.date_to ?? ''}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Client</label>
            <select
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-4 focus:ring-blue-100 focus:outline-none"
              value={filters.client_id ?? ''}
              onChange={(e) => setFilters({ ...filters, client_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Tous</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Fournisseur</label>
            <select
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-4 focus:ring-blue-100 focus:outline-none"
              value={filters.fournisseur_id ?? ''}
              onChange={(e) => setFilters({ ...filters, fournisseur_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Tous</option>
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Article</label>
            <select
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-4 focus:ring-blue-100 focus:outline-none"
              value={filters.article_id ?? ''}
              onChange={(e) => setFilters({ ...filters, article_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Tous</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>{a.num_article} - {a.nom}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setFilters({ type: 'all' })}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="animate-fade-in-up overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm" style={{ animationDelay: '0.2s' }}>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/80 text-xs uppercase text-gray-500">
            <tr>
              <th className="rounded-tl-2xl px-4 py-3">Type</th>
              <th className="px-4 py-3">Nr facture</th>
              <th className="px-4 py-3">Nr bon de commande</th>
              <th className="px-4 py-3">Fournisseur</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Article</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Date</th>
              <th className="rounded-tr-2xl px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium">Chargement...</span>
                  </div>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full bg-gray-100 p-4">
                      <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Aucun booking pour le moment</span>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium shadow-sm ${TYPE_COLORS[b.type]}`}>
                      {TYPE_LABELS[b.type]}
                      {b.type === 'retour' && b.retour_condition ? ` (${b.retour_condition === 'bon' ? 'Bon état' : 'Endommagé'})` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">{b.nr_facture ?? '-'}</td>
                  <td className="px-4 py-3">{b.nr_bon_commande ?? '-'}</td>
                  <td className="px-4 py-3">{b.fournisseur ?? '-'}</td>
                  <td className="px-4 py-3">{b.client ?? '-'}</td>
                  <td className="px-4 py-3">{b.nr_article ?? '-'}{b.article_nom ? ` - ${b.article_nom}` : ''}</td>
                  <td className="px-4 py-3 font-medium">{b.nombre}</td>
                  <td className="px-4 py-3">{b.date.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition-all hover:bg-blue-50 hover:shadow-sm"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50 hover:shadow-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifier le booking' : 'Nouveau booking'}
      >
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select
              className={fieldClass(invalidFields.includes('type'))}
              value={form.type}
              onChange={(e) => {
                const newType = e.target.value as BookingType;
                setForm({
                  ...form,
                  type: newType,
                  retour_condition: newType === 'retour' ? form.retour_condition : '',
                });
                touch('type');
              }}
            >
              <option value="entree">Entrée (Fournisseur → DSI)</option>
              <option value="sortie">Sortie (DSI → Client)</option>
              <option value="retour">Retour (Client → DSI/Corbeille)</option>
              <option value="corbeille">Corbeille (DSI → Corbeille)</option>
              <option value="recuperation">Récupération (Corbeille → DSI)</option>
            </select>
          </div>

          {form.type === 'retour' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">État du retour</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`cursor-pointer rounded-xl border p-3 transition-all ${
                    form.retour_condition === 'bon'
                      ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="retour_condition"
                    value="bon"
                    checked={form.retour_condition === 'bon'}
                    onChange={(e) => { setForm({ ...form, retour_condition: 'bon' }); touch('retour_condition'); }}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${form.retour_condition === 'bon' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Bon état</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Retourne au stock DSI</p>
                </label>
                <label
                  className={`cursor-pointer rounded-xl border p-3 transition-all ${
                    form.retour_condition === 'endommage'
                      ? 'border-red-500 bg-red-50 ring-4 ring-red-100'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="retour_condition"
                    value="endommage"
                    checked={form.retour_condition === 'endommage'}
                    onChange={(e) => { setForm({ ...form, retour_condition: 'endommage' }); touch('retour_condition'); }}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${form.retour_condition === 'endommage' ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Endommagé</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Va en corbeille</p>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nr facture</label>
              <input
                className={fieldClass(invalidFields.includes('nr_facture'))}
                value={form.nr_facture}
                onChange={(e) => { touch('nr_facture'); setForm({ ...form, nr_facture: e.target.value }); }}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nr bon de commande</label>
              <input
                className={fieldClass(invalidFields.includes('nr_bon_commande'))}
                value={form.nr_bon_commande}
                onChange={(e) => { touch('nr_bon_commande'); setForm({ ...form, nr_bon_commande: e.target.value }); }}
              />
            </div>
          </div>

          {form.type === 'entree' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fournisseur</label>
              <select
                className={fieldClass(invalidFields.includes('fournisseur_id'))}
                value={form.fournisseur_id}
                onChange={(e) => { touch('fournisseur_id'); setForm({ ...form, fournisseur_id: e.target.value }); }}
              >
                <option value="">-- Selectionner un fournisseur --</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
          )}

          {(form.type === 'sortie' || form.type === 'retour') && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Client</label>
              <select
                className={fieldClass(invalidFields.includes('client_id'))}
                value={form.client_id}
                onChange={(e) => { touch('client_id'); setForm({ ...form, client_id: e.target.value }); }}
              >
                <option value="">-- Selectionner un client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          )}

          {form.type === 'sortie' && !editing && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Pack (optionnel)</label>
              <select
                className={inputClass}
                value={selectedPackId}
                onChange={(e) => handlePackSelect(e.target.value)}
              >
                <option value="">-- Selectionner un pack --</option>
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
          )}

          {form.type === 'sortie' && !editing && packItems.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <p className="text-sm font-medium text-blue-800">Articles du pack</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Quantite du pack :</span>
                  <input
                    type="number"
                    min={1}
                    className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    value={packMultiplier}
                    onChange={(e) => setPackMultiplier(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {packItems.map((item, idx) => {
                  const finalQty = item.quantite * packMultiplier;
                  return (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white p-2">
                      <span className="flex-1 text-sm font-medium">{item.num_article} - {item.nom}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">stock: {item.stock}</span>
                      <input
                        type="number"
                        min={1}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        value={item.quantite}
                        onChange={(e) => updatePackItemQty(idx, Math.max(1, Number(e.target.value) || 1))}
                      />
                      {packMultiplier > 1 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">× {packMultiplier} = {finalQty}</span>
                      )}
                      <button type="button" onClick={() => removePackItem(idx)} className="rounded-lg p-1 text-red-500 hover:bg-red-50 hover:text-red-700">&times;</button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <select
                  id="add-pack-article"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  defaultValue=""
                >
                  <option value="">-- Ajouter un article --</option>
                  {articles
                    .filter((a) => !packItems.some((p) => p.article_id === a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.num_article} - {a.nom} (stock: {a.stock})</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const sel = document.getElementById('add-pack-article') as HTMLSelectElement;
                    if (!sel.value) return;
                    const art = articles.find((a) => a.id === Number(sel.value));
                    if (art) {
                      setPackItems([...packItems, { article_id: art.id, num_article: art.num_article, nom: art.nom, quantite: 1, stock: art.stock }]);
                      sel.value = '';
                    }
                  }}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  + Ajouter
                </button>
              </div>
            </div>
          )}

          {(form.type !== 'sortie' || editing || packItems.length === 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Article</label>
                <select
                  className={fieldClass(invalidFields.includes('article_id'))}
                  value={form.article_id}
                  onChange={(e) => { touch('article_id'); setForm({ ...form, article_id: e.target.value }); }}
                >
                  <option value="">-- Selectionner un article --</option>
                  {articles.map((a) => (
                    <option key={a.id} value={a.id}>{a.num_article} - {a.nom}</option>
                  ))}
                </select>
                {(form.type === 'sortie' || form.type === 'corbeille') && (
                  <p className="mt-1 text-xs text-gray-500">
                    Stock disponible :{' '}
                    <span className="font-semibold text-blue-600">
                      {articles.find((a) => a.id === Number(form.article_id))?.stock ?? 0}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="number"
                  min={1}
                  className={fieldClass(invalidFields.includes('nombre'))}
                  value={form.nombre}
                  onChange={(e) => { touch('nombre'); setForm({ ...form, nombre: e.target.value }); }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input
              type="datetime-local"
              className={fieldClass(invalidFields.includes('date'))}
              value={form.date}
              onChange={(e) => { touch('date'); setForm({ ...form, date: e.target.value }); }}
            />
          </div>

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-600">{formError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={packItems.length > 0 && !editing ? handleSavePack : handleSave}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:from-blue-700 hover:to-indigo-700"
            >
              {packItems.length > 0 && !editing ? `Enregistrer (${packItems.reduce((s, i) => s + i.quantite * packMultiplier, 0)} articles)` : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer le booking"
          message={`Voulez-vous vraiment supprimer ce booking du ${deleteTarget.nr_article ?? 'article'} ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}
