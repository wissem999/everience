import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Users as UsersIcon, UserPlus, Pencil, Trash2, Shield, User, Inbox } from 'lucide-react';
import { Modal } from '../components/Modal';
import { TextInput } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { createUser, deleteUser, getUsers, updateUser } from '../api/users';
import type { User as UserType } from '../types';

interface FormState {
  nom: string;
  email: string;
  password: string;
}

const emptyForm: FormState = { nom: '', email: '', password: '' };

export function Users() {
  const [rows, setRows] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserType | null>(null);

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
    setOriginal(null);
    setInvalidFields([]);
    setError('');
    setModalError('');
    setModalOpen(true);
  };

  const openEdit = (u: UserType) => {
    const snapshot: FormState = { nom: u.nom, email: u.email, password: '' };
    setEditing(u);
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

    const errs: Array<[string, string]> = [];
    if (!form.nom.trim()) errs.push(['nom', 'Le nom est requis']);
    if (!form.email.trim()) errs.push(['email', "L'email est requis"]);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.push(['email', "L'email n'est pas valide"]);
    }
    if (!editing && (!form.password || form.password.length < 6)) {
      errs.push(['password', 'Le mot de passe doit contenir au moins 6 caracteres']);
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

    try {
      if (editing) {
        const payload: { nom: string; email: string; password?: string } = {
          nom: form.nom,
          email: form.email,
        };
        if (form.password) payload.password = form.password;
        await updateUser(editing.id, payload);
      } else {
        await createUser({ nom: form.nom, email: form.email, password: form.password });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setModalError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const handleDelete = (u: UserType) => {
    setDeleteTarget(u);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Impossible de supprimer cet utilisateur');
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
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
              <UsersIcon className="h-5 w-5" />
            </div>
            Utilisateurs
          </h1>
          <p className="mt-1 ml-13 text-sm text-gray-500">
            Gestion des comptes (réservé à l'administrateur)
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:brightness-110 active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Stat card */}
      <div className="animate-fade-in-up delay-75">
        <div className="card-hover inline-flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
            <UsersIcon className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total utilisateurs</p>
            <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 animate-fade-in">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-12 shadow-sm animate-fade-in">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <span className="text-sm text-gray-500">Chargement...</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm animate-fade-in-up delay-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50/80">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3.5">Nom</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Rôle</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((u, i) => (
                <tr
                  key={u.id}
                  className="animate-fade-in-up transition-colors hover:bg-gray-50/50"
                  style={{ animationDelay: `${(i + 2) * 50}ms` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <span className="font-medium text-gray-900">{u.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-3">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                        <Shield className="h-3 w-3" />
                        Administrateur
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                        <User className="h-3 w-3" />
                        Utilisateur
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                        <Inbox className="h-7 w-7 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Aucun utilisateur</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Commencez par créer un compte utilisateur
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Nom"
              value={form.nom}
              onChange={(e) => set('nom')(e.target.value)}
              error={invalidFields.includes('nom')}
              required
            />
            <TextInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              error={invalidFields.includes('email')}
              required
            />
            <TextInput
              label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
              type="password"
              value={form.password}
              onChange={(e) => set('password')(e.target.value)}
              error={invalidFields.includes('password')}
              required={!editing}
              minLength={6}
            />

            {modalError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.98]"
              >
                {editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer l'utilisateur"
          message={`Voulez-vous vraiment supprimer le compte de "${deleteTarget.nom}" ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}
