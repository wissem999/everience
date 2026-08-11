import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { Select, TextInput } from '../components/FormField';
import {
  createFournisseur,
  deleteFournisseur,
  getFournisseurs,
  updateFournisseur,
} from '../api/fournisseurs';
import type { Fournisseur } from '../types';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

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
    setModalOpen(true);
  };

  const openEdit = (f: Fournisseur) => {
    setEditing(f);
    setForm({
      nom: f.nom,
      adresse: f.adresse ?? '',
      ville: f.ville ?? '',
      pays: f.pays ?? '',
      telephone: f.telephone ?? '',
      mail: f.mail ?? '',
      groupe: f.groupe,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await updateFournisseur(editing.id, form);
      } else {
        await createFournisseur(form);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const handleDelete = async (f: Fournisseur) => {
    if (!window.confirm(`Supprimer le fournisseur "${f.nom}" ?`)) return;
    try {
      await deleteFournisseur(f.id);
      await load();
    } catch {
      alert('Impossible de supprimer ce fournisseur');
    }
  };

  const set = (field: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fournisseurs</h1>
          <p className="text-sm text-gray-500">Gestion des fournisseurs</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouveau fournisseur
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
                <th className="px-4 py-3">Groupe</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{f.nom}</td>
                  <td className="px-4 py-3">{f.ville ?? '—'}</td>
                  <td className="px-4 py-3">{f.pays ?? '—'}</td>
                  <td className="px-4 py-3">{f.telephone ?? '—'}</td>
                  <td className="px-4 py-3">{f.mail ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        f.groupe === 'privilegie'
                          ? 'inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700'
                          : 'inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600'
                      }
                    >
                      {f.groupe === 'privilegie' ? 'Privilégié' : 'Non privilégié'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(f)}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f)}
                      className="text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Aucun fournisseur pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
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
            <Select
              label="Groupe"
              value={form.groupe}
              onChange={(e) => set('groupe')(e.target.value)}
            >
              <option value="non">Non privilégié</option>
              <option value="privilegie">Privilégié</option>
            </Select>

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
