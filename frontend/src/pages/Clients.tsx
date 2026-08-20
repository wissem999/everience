import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { TextInput } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { createClient, deleteClient, getClients, updateClient } from '../api/clients';
import type { Client } from '../types';
import { Users, Plus, Pencil, Trash2, PackageOpen } from 'lucide-react';

interface FormState {
  nom: string;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string;
  mail: string;
}

const emptyForm: FormState = { nom: '', adresse: '', ville: '', pays: '', telephone: '', mail: '' };

export function Clients() {
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getClients());
    } catch {
      setError('Impossible de charger les clients');
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

  const openEdit = (c: Client) => {
    const snapshot: FormState = {
      nom: c.nom,
      adresse: c.adresse ?? '',
      ville: c.ville ?? '',
      pays: c.pays ?? '',
      telephone: c.telephone ?? '',
      mail: c.mail ?? '',
    };
    setEditing(c);
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
        await updateClient(editing.id, form);
      } else {
        await createClient(form);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setModalError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const handleDelete = async (c: Client) => {
    setDeleteTarget(c);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteClient(deleteTarget.id);
      await load();
    } catch {
      alert('Impossible de supprimer ce client');
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

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion des clients</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-300"
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </button>
      </div>

      {/* Stat Card */}
      <div className="animate-fade-in delay-75">
        <div className="card-hover w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total clients</p>
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="px-6 py-4 font-medium">Nom</th>
                <th className="px-6 py-4 font-medium">Ville</th>
                <th className="px-6 py-4 font-medium">Pays</th>
                <th className="px-6 py-4 font-medium">Telephone</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{c.nom}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{c.ville ?? '\u2014'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{c.pays ?? '\u2014'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{c.telephone ?? '\u2014'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{c.mail ?? '\u2014'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="mr-2 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Pencil className="h-3 w-3" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
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

          {/* Empty State */}
          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <PackageOpen className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-500">Aucun client pour le moment</p>
              <p className="mt-1 text-xs text-gray-400">Creez votre premier client pour commencer</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <Modal
          title={editing ? 'Modifier le client' : 'Nouveau client'}
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Telephone"
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

            {modalError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{modalError}</div>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
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
                {editing ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer le client"
          message={`Voulez-vous vraiment supprimer le client "${deleteTarget.nom}" ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}
