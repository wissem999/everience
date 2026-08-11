import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { Select, TextInput } from '../components/FormField';
import { createUser, deleteUser, getUsers, updateUser } from '../api/users';
import type { User } from '../types';

interface FormState {
  nom: string;
  email: string;
  role: 'admin' | 'user';
  password: string;
}

const emptyForm: FormState = { nom: '', email: '', role: 'user', password: '' };

export function Users() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getUsers());
    } catch {
      setError('Impossible de charger les utilisateurs');
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

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ nom: u.nom, email: u.email, role: u.role, password: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        const payload: { nom: string; email: string; role: 'admin' | 'user'; password?: string } = {
          nom: form.nom,
          email: form.email,
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await updateUser(editing.id, payload);
      } else {
        await createUser({ nom: form.nom, email: form.email, role: form.role, password: form.password });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const handleDelete = async (u: User) => {
    if (!window.confirm(`Supprimer le compte de "${u.nom}" ?`)) return;
    try {
      await deleteUser(u.id);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Impossible de supprimer cet utilisateur');
    }
  };

  const set = (field: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Utilisateurs</h1>
          <p className="text-sm text-gray-500">Gestion des comptes (réservé à l'administrateur)</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouvel utilisateur
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
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.nom}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.role === 'admin'
                          ? 'inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700'
                          : 'inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600'
                      }
                    >
                      {u.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      className="text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Aucun utilisateur
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
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
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              required
            />
            <Select label="Rôle" value={form.role} onChange={(e) => set('role')(e.target.value)}>
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </Select>
            <TextInput
              label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
              type="password"
              value={form.password}
              onChange={(e) => set('password')(e.target.value)}
              required={!editing}
              minLength={6}
            />

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
