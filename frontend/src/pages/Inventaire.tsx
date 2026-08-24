import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { TextInput } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination, usePagination } from '../components/Pagination';
import { getInventaire, createInventaire, updateInventaire, deleteInventaire } from '../api/inventaire';
import { getProducts } from '../api/articles';
import { getClients } from '../api/clients';
import type { Inventaire } from '../types';
import { cn } from '../lib/utils';
import { Plus, Package, Search, Pencil, Trash2, PackageOpen, User, UserCheck, X, AlertTriangle } from 'lucide-react';

interface FormState {
  numero_serie: string;
  article_id: string;
  statut: 'stock' | 'affecte';
  client_id: string;
  employee_name: string;
}

const emptyForm: FormState = {
  numero_serie: '',
  article_id: '',
  statut: 'stock',
  client_id: '',
  employee_name: '',
};

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none';
const errorInputClass =
  'w-full rounded-xl border border-red-500 px-3 py-2 text-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 focus:outline-none';
const fieldClass = (invalid: boolean) => (invalid ? errorInputClass : inputClass);

export function Inventaire() {
  const [items, setItems] = useState<Inventaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inventaire | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Inventaire | null>(null);
  const [search, setSearch] = useState('');
  const [articles, setArticles] = useState<{ id: number; num_article: string; nom: string }[]>([]);
  const [clients, setClients] = useState<{ id: number; nom: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getInventaire());
    } catch {
      setError('Impossible de charger l\'inventaire');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([getProducts(), getClients()]).then(([a, c]) => {
      setArticles(a.map((x) => ({ id: x.id, num_article: x.num_article, nom: x.nom })));
      setClients(c.map((x) => ({ id: x.id, nom: x.nom })));
    });
  }, []);

  const q = search.toLowerCase();
  const filtered = items.filter((i) => {
    if (q && !i.numero_serie.toLowerCase().includes(q) && !(i.article_nom ?? '').toLowerCase().includes(q) && !(i.client_nom ?? '').toLowerCase().includes(q)) return false;
    return true;
  });

  const { page, pageSize, totalPages, paged, setPage, setPageSize, total } = usePagination(filtered);

  const totalStock = items.filter((i) => i.statut === 'stock').length;
  const totalAffecte = items.filter((i) => i.statut === 'affecte').length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOriginal(null);
    setInvalidFields([]);
    setModalError('');
    setModalOpen(true);
  };

  const openEdit = (item: Inventaire) => {
    const snapshot: FormState = {
      numero_serie: item.numero_serie,
      article_id: String(item.article_id),
      statut: item.statut,
      client_id: item.client_id ? String(item.client_id) : '',
      employee_name: item.employee_name ?? '',
    };
    setEditing(item);
    setForm(snapshot);
    setOriginal(snapshot);
    setInvalidFields([]);
    setModalError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError('');
    setInvalidFields([]);

    const errs: Array<[string, string]> = [];
    if (!form.numero_serie.trim()) errs.push(['numero_serie', 'Le numero de serie est requis']);
    if (!form.article_id) errs.push(['article_id', 'Selectionnez un article']);
    if (form.statut === 'affecte' && !form.client_id) errs.push(['client_id', 'Selectionnez un client']);
    if (form.statut === 'affecte' && !form.employee_name.trim()) errs.push(['employee_name', "Le nom de l'employe est requis"]);

    if (errs.length) {
      setInvalidFields(errs.map(([f]) => f));
      setModalError(errs[0][1]);
      return;
    }

    if (editing && original && JSON.stringify(form) === JSON.stringify(original)) {
      setModalError('Vous devez modifier au moins un champ');
      return;
    }

    const payload = {
      numero_serie: form.numero_serie.trim(),
      article_id: Number(form.article_id),
      statut: form.statut,
      client_id: form.statut === 'affecte' ? Number(form.client_id) : null as unknown as number,
      employee_name: form.statut === 'affecte' ? form.employee_name.trim() : null as unknown as string,
    };

    try {
      if (editing) {
        await updateInventaire(editing.id, payload);
      } else {
        await createInventaire(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setModalError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInventaire(deleteTarget.id);
      await load();
    } catch {
      alert('Impossible de supprimer cet element');
    } finally {
      setDeleteTarget(null);
    }
  };

  const set = (field: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setModalError('');
    setInvalidFields((prev) => prev.filter((f) => f !== field));
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Inventaire</h1>
          <p className="text-sm text-gray-500">Suivi des numeros de serie par article</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-[0.98] transition-all duration-200 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouvel element
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 min-w-0 break-words">{error}</p>
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-up delay-75">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-5 shadow-lg shadow-blue-600/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-blue-100">Total</p>
                <p className="text-2xl font-bold text-white">{items.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-5 shadow-lg shadow-emerald-600/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-100">En stock</p>
                <p className="text-2xl font-bold text-white">{totalStock}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 sm:p-5 shadow-lg shadow-orange-600/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-orange-100">Affecte</p>
                <p className="text-2xl font-bold text-white">{totalAffecte}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (serie, article, client...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Chargement...
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block table-wrap">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-5 py-3.5">Numero de serie</th>
                  <th className="px-5 py-3.5">Article</th>
                  <th className="px-5 py-3.5">Statut</th>
                  <th className="px-5 py-3.5">Employe</th>
                  <th className="px-5 py-3.5">Client</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((item, i) => (
                  <tr key={item.id} className={cn('hover:bg-gray-50/80 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                    <td className="px-5 py-3.5 font-mono text-gray-800">{item.numero_serie}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-800">{item.num_article}</span>
                      <span className="text-gray-400 mx-1">-</span>
                      <span className="text-gray-600 cell-wrap">{item.article_nom}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        item.statut === 'stock' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      )}>
                        {item.statut === 'stock' ? 'En stock' : 'Affecte'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {item.statut === 'affecte' && item.employee_name ? (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          {item.employee_name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 cell-wrap">
                      {item.statut === 'affecte' && item.client_nom ? item.client_nom : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="mr-1.5 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-gray-100 p-4">
                          <PackageOpen className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Aucun element dans l'inventaire</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <PackageOpen className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-500">Aucun element</p>
              </div>
            ) : (
              paged.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-medium text-gray-900">{item.numero_serie}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.num_article} - {item.article_nom}</p>
                    </div>
                    <span className={cn(
                      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0',
                      item.statut === 'stock' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                    )}>
                      {item.statut === 'stock' ? 'Stock' : 'Affecte'}
                    </span>
                  </div>
                  {item.statut === 'affecte' && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {item.employee_name && (
                        <div>
                          <p className="text-xs text-gray-400">Employe</p>
                          <p className="font-medium">{item.employee_name}</p>
                        </div>
                      )}
                      {item.client_nom && (
                        <div>
                          <p className="text-xs text-gray-400">Client</p>
                          <p className="font-medium">{item.client_nom}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {filtered.length > 0 && (
            <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <Modal
          title={editing ? "Modifier l'element" : 'Nouvel element'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Numero de serie"
              value={form.numero_serie}
              onChange={(e) => set('numero_serie')(e.target.value)}
              error={invalidFields.includes('numero_serie')}
              required
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Article</label>
              <select
                className={fieldClass(invalidFields.includes('article_id'))}
                value={form.article_id}
                onChange={(e) => set('article_id')(e.target.value)}
              >
                <option value="">-- Selectionner un article --</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>{a.num_article} - {a.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, statut: 'stock', client_id: '', employee_name: '' }))}
                  className={cn(
                    'rounded-xl border-2 p-3 text-left transition-all',
                    form.statut === 'stock'
                      ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Package className={cn('h-4 w-4', form.statut === 'stock' ? 'text-emerald-600' : 'text-gray-400')} />
                    <span className="text-sm font-medium">En stock</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, statut: 'affecte' }))}
                  className={cn(
                    'rounded-xl border-2 p-3 text-left transition-all',
                    form.statut === 'affecte'
                      ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className={cn('h-4 w-4', form.statut === 'affecte' ? 'text-blue-600' : 'text-gray-400')} />
                    <span className="text-sm font-medium">Affecte</span>
                  </div>
                </button>
              </div>
            </div>

            {form.statut === 'affecte' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Client</label>
                  <select
                    className={fieldClass(invalidFields.includes('client_id'))}
                    value={form.client_id}
                    onChange={(e) => set('client_id')(e.target.value)}
                  >
                    <option value="">-- Selectionner un client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
                <TextInput
                  label="Nom de l'employe"
                  value={form.employee_name}
                  onChange={(e) => set('employee_name')(e.target.value)}
                  error={invalidFields.includes('employee_name')}
                  required
                />
              </>
            )}

            {modalError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{modalError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-[0.98] transition-all duration-200"
              >
                {editing ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer l'element"
          message={`Voulez-vous vraiment supprimer le numero de serie "${deleteTarget.numero_serie}" ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}
