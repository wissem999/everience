import { useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2, X, Inbox } from 'lucide-react';
import type { Pack } from '../types';
import { createPack, deletePack, getPacks, updatePack } from '../api/packs';
import { getProducts } from '../api/articles';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';

interface PackForm {
  nom: string;
  description: string;
  items: { article_id: string; quantite: string }[];
}

const emptyForm: PackForm = { nom: '', description: '', items: [{ article_id: '', quantite: '1' }] };

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20';

export function Packs() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [articles, setArticles] = useState<{ id: number; num_article: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Pack | null>(null);
  const [form, setForm] = useState<PackForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Pack | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [p, a] = await Promise.all([getPacks(), getProducts()]);
      setPacks(p);
      setArticles(a.map((x) => ({ id: x.id, num_article: x.num_article, nom: x.nom })));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Pack) => {
    setEditing(p);
    setFormError('');
    setForm({
      nom: p.nom,
      description: p.description ?? '',
      items: p.items.length > 0
        ? p.items.map((i) => ({ article_id: String(i.article_id), quantite: String(i.quantite) }))
        : [{ article_id: '', quantite: '1' }],
    });
    setShowModal(true);
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { article_id: '', quantite: '1' }] });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, field: 'article_id' | 'quantite', value: string) => {
    const items = [...form.items];
    if (field === 'quantite') {
      const n = Number(value);
      items[idx] = { ...items[idx], quantite: String(Math.max(1, isNaN(n) ? 1 : n)) };
    } else {
      items[idx] = { ...items[idx], [field]: value };
    }
    setForm({ ...form, items });
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.nom.trim()) { setFormError('Le nom du pack est requis'); return; }
    if (form.nom.trim().length < 2) { setFormError('Le nom doit contenir au moins 2 caracteres'); return; }
    if (form.items.length === 0) { setFormError('Le pack doit contenir au moins un article'); return; }

    const errors: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < form.items.length; i++) {
      const item = form.items[i];
      if (!item.article_id) { errors.push(`Article ${i + 1}: selectionnez un article`); }
      const qty = Number(item.quantite);
      if (!item.quantite || isNaN(qty) || qty < 1) { errors.push(`Article ${i + 1}: la quantite doit etre >= 1`); }
      if (item.article_id && seen.has(item.article_id)) { errors.push(`Article ${i + 1}: article en double`); }
      if (item.article_id) seen.add(item.article_id);
    }
    if (errors.length) { setFormError(errors[0]); return; }

    const validItems = form.items.filter((i) => i.article_id && Number(i.quantite) >= 1);
    const totalQty = validItems.reduce((sum, i) => sum + Number(i.quantite), 0);
    if (totalQty < 2) { setFormError('Un pack doit totaliser au moins 2 articles (ex: 1 article avec 2 quantites)'); return; }

    try {
      const payload = {
        nom: form.nom.trim(),
        description: form.description.trim() || undefined,
        items: validItems.map((i) => ({ article_id: Number(i.article_id), quantite: Number(i.quantite) })),
      };
      if (editing) {
        await updatePack(editing.id, payload);
      } else {
        await createPack(payload);
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? "Erreur lors de l'enregistrement");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePack(deleteTarget.id);
      await load();
    } catch {
      alert('Impossible de supprimer ce pack');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            Packs
          </h1>
          <p className="mt-1 ml-0 sm:ml-13 text-sm text-gray-500">
            Gérer les packs d'articles
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-110 active:scale-[0.98] shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nouveau pack
        </button>
      </div>

      {/* Stat card */}
      <div className="animate-fade-in-up delay-75">
        <div className="card-hover inline-flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total packs</p>
            <p className="text-2xl font-bold text-gray-900">{packs.length}</p>
          </div>
        </div>
      </div>

      {/* Table — Desktop */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm animate-fade-in-up delay-100 hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50/80">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3.5">Nom</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5">Articles</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span className="text-sm text-gray-500">Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : packs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                        <Inbox className="h-7 w-7 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Aucun pack</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Créez un pack pour regrouper des articles
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : packs.map((p, i) => (
                <tr
                  key={p.id}
                  className="animate-fade-in-up transition-colors hover:bg-gray-50/50"
                  style={{ animationDelay: `${(i + 2) * 50}ms` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900 min-w-0 cell-wrap">{p.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 cell-wrap">{p.description ?? '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {p.items.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {item.quantite}x {item.num_article}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table — Mobile cards */}
      <div className="md:hidden space-y-3 animate-fade-in-up delay-100">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm text-gray-500">Chargement...</span>
            </div>
          </div>
        ) : packs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <Inbox className="h-7 w-7 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">Aucun pack</p>
                <p className="mt-1 text-xs text-gray-500">
                  Créez un pack pour regrouper des articles
                </p>
              </div>
            </div>
          </div>
        ) : packs.map((p, i) => (
          <div
            key={p.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm animate-fade-in-up"
            style={{ animationDelay: `${(i + 2) * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900 cell-wrap">{p.nom}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(p)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {p.description && (
              <p className="mt-2 ml-11 text-sm text-gray-500 cell-wrap">{p.description}</p>
            )}
            <div className="mt-3 ml-11 flex flex-wrap gap-1.5">
              {p.items.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                >
                  {item.quantite}x {item.num_article}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifier le pack' : 'Nouveau pack'}
        maxWidth="max-w-xl"
      >
            <div className="space-y-5">
              {/* Nom */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom</label>
                <input
                  className={inputClass}
                  placeholder="Nom du pack"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <input
                  className={inputClass}
                  placeholder="Description optionnelle"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Articles */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Articles</label>
                <div className="space-y-3">
                  {form.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3 transition-colors hover:border-gray-300"
                    >
                      <select
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        value={item.article_id}
                        onChange={(e) => updateItem(idx, 'article_id', e.target.value)}
                      >
                        <option value="">-- Article --</option>
                        {articles.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.num_article} - {a.nom}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        className="w-20 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none"
                        value={item.quantite}
                        onChange={(e) => updateItem(idx, 'quantite', e.target.value)}
                      />
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Retirer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add article button */}
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un article
                </button>
              </div>

              {/* Error */}
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 break-words">
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.98]"
                >
                  Enregistrer
                </button>
              </div>
            </div>
      </Modal>

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer le pack"
          message={`Voulez-vous vraiment supprimer le pack "${deleteTarget.nom}" ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}
