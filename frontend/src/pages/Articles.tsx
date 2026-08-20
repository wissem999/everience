import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { TextArea, TextInput } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../api/articles';
import type { Product } from '../types';
import { cn } from '../lib/utils';
import { Plus, Package, TrendingUp, AlertTriangle, PackageOpen, Pencil, Trash2, X } from 'lucide-react';

interface FormState {
  num_article: string;
  nom: string;
  description: string;
  prix: string;
  stock: string;
  stock_min: string;
}

const emptyForm: FormState = {
  num_article: '',
  nom: '',
  description: '',
  prix: '',
  stock: '',
  stock_min: '',
};

export function Articles() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await getProducts());
    } catch {
      setError('Impossible de charger les articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOriginal(null);
    setInvalidFields([]);
    setError('');
    setModalError('');
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    const snapshot: FormState = {
      num_article: product.num_article,
      nom: product.nom,
      description: product.description ?? '',
      prix: String(product.prix),
      stock: String(product.stock),
      stock_min: String(product.stock_min),
    };
    setEditing(product);
    setForm(snapshot);
    setOriginal(snapshot);
    setInvalidFields([]);
    setError('');
    setModalError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError('');
    setInvalidFields([]);

    const errs: Array<[string, string]> = [];
    if (!form.num_article.trim()) errs.push(['num_article', 'Le numero article est requis']);
    if (!form.nom.trim()) errs.push(['nom', 'Le nom est requis']);
    if (form.prix === '' || !Number.isFinite(Number(form.prix)) || Number(form.prix) < 0) {
      errs.push(['prix', 'Le prix doit etre un nombre >= 0']);
    }
    if (form.stock === '' || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      errs.push(['stock', 'Le stock doit etre un entier >= 0']);
    }
    if (form.stock_min === '' || !Number.isInteger(Number(form.stock_min)) || Number(form.stock_min) < 0) {
      errs.push(['stock_min', 'Le stock minimum doit etre un entier >= 0']);
    }
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
      num_article: form.num_article.trim(),
      nom: form.nom.trim(),
      description: form.description,
      prix: Number(form.prix),
      stock: Number(form.stock),
      stock_min: Number(form.stock_min),
    };
    try {
      if (editing) {
        await updateProduct(editing.id, payload);
      } else {
        await createProduct(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setModalError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const handleDelete = async (product: Product) => {
    setDeleteTarget(product);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      await load();
    } catch {
      alert('Impossible de supprimer cet article');
    } finally {
      setDeleteTarget(null);
    }
  };

  const set = (field: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
    setModalError('');
    setInvalidFields((prev) => prev.filter((f) => f !== field));
  };

  const prix = Number(form.prix) || 0;
  const stock = Number(form.stock) || 0;
  const stockMin = Number(form.stock_min) || 0;
  const previewStatus = stock <= stockMin ? 'Besoin Actif' : 'Actif';

  const totalArticles = products.length;
  const totalValeurStock = products.reduce((sum, p) => sum + (Number(p.valeur_stock) || 0), 0);
  const totalBesoinActif = products.filter((p) => p.status === 'Besoin Actif' || p.stock <= p.stock_min).length;

  return (
    <div className="animate-fade-in-up">
      {/* header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-sm text-gray-500">Gestion des articles en stock</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-[0.98] transition-all duration-200 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouvel article
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 min-w-0 break-words">{error}</p>
        </div>
      )}

      {/* stats row */}
      {!loading && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-up delay-75">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-5 shadow-lg shadow-blue-600/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-blue-100">Total articles</p>
                <p className="text-2xl font-bold text-white">{totalArticles}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-5 shadow-lg shadow-emerald-600/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-100">Valeur stock</p>
                <p className="text-xl sm:text-2xl font-bold text-white truncate">{totalValeurStock.toFixed(2)} TND</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 sm:p-5 shadow-lg shadow-orange-600/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-orange-100">Besoin actif</p>
                <p className="text-2xl font-bold text-white">{totalBesoinActif}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <th className="px-5 py-3.5">N Article</th>
                  <th className="px-5 py-3.5">Nom</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Prix</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">Stock min</th>
                  <th className="px-5 py-3.5">Valeur stock</th>
                  <th className="px-5 py-3.5">Statut</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p, i) => (
                  <tr key={p.id} className={cn('hover:bg-gray-50/80 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                    <td className="px-5 py-3.5 font-mono text-gray-600">{p.num_article}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800 cell-wrap">{p.nom}</td>
                    <td className="px-5 py-3.5 text-gray-500 cell-wrap">{p.description || '—'}</td>
                    <td className="px-5 py-3.5">{Number(p.prix).toFixed(2)} TND</td>
                    <td className="px-5 py-3.5">{p.stock}</td>
                    <td className="px-5 py-3.5">{p.stock_min}</td>
                    <td className="px-5 py-3.5">{Number(p.valeur_stock).toFixed(2)} TND</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="mr-1.5 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-gray-100">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <PackageOpen className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-500">Aucun article pour le moment</p>
                <p className="mt-1 text-sm text-gray-400">Commencez par ajouter votre premier article</p>
              </div>
            ) : (
              products.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 cell-wrap">{p.nom}</p>
                      <p className="text-xs text-gray-500 font-mono">{p.num_article}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.description && (
                    <p className="text-sm text-gray-500 cell-wrap">{p.description}</p>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Prix</p>
                      <p className="font-medium">{Number(p.prix).toFixed(2)} TND</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Stock</p>
                      <p className="font-medium">{p.stock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Min</p>
                      <p className="font-medium">{p.stock_min}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
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

          {products.length === 0 && (
            <div className="hidden md:flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <PackageOpen className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-500">Aucun article pour le moment</p>
              <p className="mt-1 text-sm text-gray-400">Commencez par ajouter votre premier article</p>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Modifier l\'article' : 'Nouvel article'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput
                label="Numero article"
                value={form.num_article}
                onChange={(e) => set('num_article')(e.target.value)}
                error={invalidFields.includes('num_article')}
                required
              />
              <TextInput
                label="Nom"
                value={form.nom}
                onChange={(e) => set('nom')(e.target.value)}
                error={invalidFields.includes('nom')}
                required
              />
            </div>
            <TextArea
              label="Description"
              rows={2}
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TextInput
                label="Prix (TND)"
                type="number"
                step="0.01"
                min="0"
                value={form.prix}
                onChange={(e) => set('prix')(e.target.value)}
                error={invalidFields.includes('prix')}
                required
              />
              <TextInput
                label="Stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock')(e.target.value)}
                error={invalidFields.includes('stock')}
                required
              />
              <TextInput
                label="Stock min"
                type="number"
                min="0"
                value={form.stock_min}
                onChange={(e) => set('stock_min')(e.target.value)}
                error={invalidFields.includes('stock_min')}
                required
              />
            </div>

            {/* stock preview */}
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm">
              <p>
                Valeur du stock :{' '}
                <span className="font-semibold text-blue-700">{(prix * stock).toFixed(2)} TND</span>
              </p>
              <p className="mt-1 flex items-center gap-2">
                Statut : <StatusBadge status={previewStatus} />
              </p>
            </div>

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
          title="Supprimer l'article"
          message={`Voulez-vous vraiment supprimer l'article "${deleteTarget.nom}" ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}
