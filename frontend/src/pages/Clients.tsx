import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { TextInput } from '../components/FormField';
import { createClient, deleteClient, getClients, updateClient } from '../api/clients';
import type { Client } from '../types';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

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
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      nom: c.nom,
      adresse: c.adresse ?? '',
      ville: c.ville ?? '',
      pays: c.pays ?? '',
      telephone: c.telephone ?? '',
      mail: c.mail ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await updateClient(editing.id, form);
      } else {
        await createClient(form);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const handleDelete = async (c: Client) => {
    if (!window.confirm(`Supprimer le client "${c.nom}" ?`)) return;
    try {
      await deleteClient(c.id);
      await load();
    } catch {
      alert('Impossible de supprimer ce client');
    }
  };

  const set = (field: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
          <p className="text-sm text-gray-500">Gestion des clients</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouveau client
        </button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Pays</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.nom}</td>
                  <td className="px-4 py-3">{c.ville ?? '—'}</td>
                  <td className="px-4 py-3">{c.pays ?? '—'}</td>
                  <td className="px-4 py-3">{c.telephone ?? '—'}</td>
                  <td className="px-4 py-3">{c.mail ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Aucun client pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Modifier le client' : 'Nouveau client'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Nom"
              value={form.nom}
              onChange={(e) => set('nom')(e.target.value)}
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

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
