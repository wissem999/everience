import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { Select, TextInput } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  createFournisseur,
  deleteFournisseur,
  getFournisseurs,
  updateFournisseur,
} from '../api/fournisseurs';
import type { Fournisseur } from '../types';
import { Truck, Plus, Star, Building2, Pencil, Trash2, PackageOpen } from 'lucide-react';

interface FormState {
  nom: string;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string;
  mail: string;
  groupe: 'privilegie' | 'non';
}

const emptyForm: FormState = {
  nom: '',
  adresse: '',
  ville: '',
  pays: '',
  telephone: '',
  mail: '',
  groupe: 'non',
};

export function Fournisseurs() {
  const [rows, setRows] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fournisseur | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getFournisseurs());
    } catch {
      setError('Impossible de charger les fournisseurs');
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

  const openEdit = (f: Fournisseur) => {
    const snapshot: FormState = {
      nom: f.nom,
      adresse: f.adresse ?? '',
      ville: f.ville ?? '',
      pays: f.pays ?? '',
      telephone: f.telephone ?? '',
      mail: f.mail ?? '',
      groupe: f.groupe,
    };
    setEditing(f);
    setForm(snapshot);
    setOriginal(snapshot);
    setInvalidFields([]);
    setError('');
    setModalError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');
    setInvalidFields([]);

    if (!form.nom.trim()) {
      setInvalidFields(['nom']);
      setModalError('Le nom est requis');
      return;
    }

    if (editing && original && JSON.stringify(form) === JSON.stringify(original)) {
      setModalError('Vous devez modifier au moins un champ');
      return;
    }

    try {
      if (editing) {
        await updateFournisseur(editing.id, form);
      } else {
        await createFournisseur(form);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setModalError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const handleDelete = async (f: Fournisseur) => {
    setDeleteTarget(f);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFournisseur(deleteTarget.id);
      await load();
    } catch {
      alert('Impossible de supprimer ce fournisseur');
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

  const privilegedCount = rows.filter((f) => f.groupe === 'privilegie').length;
  const nonPrivilegedCount = rows.filter((f) => f.groupe === 'non').length;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion des fournisseurs</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-300"
        >
          <Plus className="h-4 w-4" />
          Nouveau fournisseur
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in delay-75">
        <div className="card-hover rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total fournisseurs</p>
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            </div>
          </div>
        </div>
        <div className="card-hover rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Privilégiés</p>
              <p className="text-2xl font-bold text-gray-900">{privilegedCount}</p>
            </div>
          </div>
        </div>
        <div className="card-hover rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Non privilégiés</p>
              <p className="text-2xl font-bold text-gray-900">{nonPrivilegedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="animate-fade-in break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <span className="ml-3 text-sm text-gray-500">Chargement...</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm animate-fade-in delay-100">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="px-6 py-4 font-medium">Nom</th>
                  <th className="px-6 py-4 font-medium">Ville</th>
                  <th className="px-6 py-4 font-medium">Pays</th>
                  <th className="px-6 py-4 font-medium">Téléphone</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Groupe</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((f) => (
                  <tr key={f.id} className="transition-colors hover:bg-gray-50">
                    <td className="max-w-[150px] truncate px-6 py-4 text-sm font-medium text-gray-900" title={f.nom}>{f.nom}</td>
                    <td className="max-w-[150px] truncate px-6 py-4 text-sm text-gray-600" title={f.ville ?? '—'}>{f.ville ?? '—'}</td>
                    <td className="max-w-[150px] truncate px-6 py-4 text-sm text-gray-600" title={f.pays ?? '—'}>{f.pays ?? '—'}</td>
                    <td className="max-w-[150px] truncate px-6 py-4 text-sm text-gray-600" title={f.telephone ?? '—'}>{f.telephone ?? '—'}</td>
                    <td className="max-w-[150px] truncate px-6 py-4 text-sm text-gray-600" title={f.mail ?? '—'}>{f.mail ?? '—'}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {f.groupe === 'privilegie' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          Privilégié
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                          Non privilégié
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(f)}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        <Pencil className="h-3 w-3" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(f)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {rows.map((f) => (
              <div key={f.id} className="border-b border-gray-100 p-4 last:border-b-0">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900" title={f.nom}>{f.nom}</h3>
                  {f.groupe === 'privilegie' ? (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Privilégié
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                      Non privilégié
                    </span>
                  )}
                </div>
                <div className="mb-3 space-y-1 text-xs text-gray-500">
                  {(f.ville || f.pays) && (
                    <p>{[f.ville, f.pays].filter(Boolean).join(', ')}</p>
                  )}
                  {f.telephone && <p>{f.telephone}</p>}
                  {f.mail && <p className="truncate" title={f.mail}>{f.mail}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(f)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <Pencil className="h-3 w-3" />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <PackageOpen className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-500">Aucun fournisseur pour le moment</p>
              <p className="mt-1 text-xs text-gray-400">Créez votre premier fournisseur pour commencer</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <Modal
          title={editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <TextInput
              label="Nom"
              value={form.nom}
              onChange={(e) => set('nom')(e.target.value)}
              error={invalidFields.includes('nom')}
              required
            />
            <TextInput
              label="Adresse"
              value={form.adresse}
              onChange={(e) => set('adresse')(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Ville"
                value={form.ville}
                onChange={(e) => set('ville')(e.target.value)}
              />
              <TextInput
                label="Pays"
                value={form.pays}
                onChange={(e) => set('pays')(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Téléphone"
                value={form.telephone}
                onChange={(e) => set('telephone')(e.target.value)}
              />
              <TextInput
                label="Email"
                type="email"
                value={form.mail}
                onChange={(e) => set('mail')(e.target.value)}
              />
            </div>
            <Select
              label="Groupe"
              value={form.groupe}
              onChange={(e) => set('groupe')(e.target.value)}
            >
              <option value="non">Non privilégié</option>
              <option value="privilegie">Privilégié</option>
            </Select>

            {modalError && (
              <div className="break-words rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{modalError}</div>
            )}

            <div className="flex flex-col-reverse justify-end gap-3 border-t border-gray-100 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:shadow-lg hover:shadow-blue-300"
              >
                {editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer le fournisseur"
          message={`Voulez-vous vraiment supprimer le fournisseur "${deleteTarget.nom}" ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}
