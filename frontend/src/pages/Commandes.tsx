import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Commande } from '../api/commandes';
import {
  approuverCommande,
  createCommande,
  deleteCommande,
  envoyerAdmin,
  getCommandes,
  refuserCommande,
  relancerDevis,
  updateCommande,
} from '../api/commandes';
import { getFournisseurs } from '../api/fournisseurs';
import { getProducts } from '../api/articles';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

interface FormState {
  nr_commande: string;
  date: string;
  article_id: string;
  nombre: string;
  prix_unitaire: string;
  fournisseur_id: string;
  controle: boolean;
}

const emptyForm: FormState = {
  nr_commande: '',
  date: '',
  article_id: '',
  nombre: '',
  prix_unitaire: '',
  fournisseur_id: '',
  controle: true,
};

function localDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10';
const errorInputClass =
  'w-full rounded-xl border border-red-500 px-3 py-2 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10';
const fieldClass = (invalid: boolean) => (invalid ? errorInputClass : inputClass);

const STATUT_BADGE: Record<Commande['statut'], { label: string; cls: string }> = {
  en_attente: { label: 'Devis en attente', cls: 'bg-orange-100 text-orange-700' },
  soumis: { label: 'Envoyé à l\'admin', cls: 'bg-blue-100 text-blue-700' },
  approuve: { label: 'Approuvé', cls: 'bg-green-100 text-green-700' },
  refuse: { label: 'Refusé', cls: 'bg-red-100 text-red-700' },
};

export function Commandes() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'admin';

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [fournisseurs, setFournisseurs] = useState<{ id: number; nom: string; mail?: string }[]>([]);
  const [articles, setArticles] = useState<{ id: number; num_article: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [info, setInfo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Commande | null>(null);
  const [lockedArticle, setLockedArticle] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: number;
    label: string;
    type: 'delete' | 'relancer' | 'envoyer' | 'approuver' | 'refuser';
  } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [c, f, a] = await Promise.all([getCommandes(), getFournisseurs(), getProducts()]);
      setCommandes(c);
      setFournisseurs(f.map((x) => ({ id: x.id, nom: x.nom, mail: x.mail })));
      setArticles(a.map((x) => ({ id: x.id, num_article: x.num_article, nom: x.nom })));
    } catch {
      setError('Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const autoOpenDone = useRef(false);

  useEffect(() => {
    const articleParam = searchParams.get('article');
    const shouldOpen = searchParams.get('new') === '1' && articleParam;
    if (!shouldOpen || autoOpenDone.current) return;
    const found = articles.find((a) => a.id === Number(articleParam));
    if (!found) return;
    autoOpenDone.current = true;
    openCreate();
    setForm((f) => ({ ...f, article_id: String(found.id) }));
    setLockedArticle(true);
    setSearchParams({}, { replace: true });
  }, [articles, searchParams, setSearchParams]);

  const touch = (field: keyof FormState) => {
    setFormError('');
    setInvalidFields((prev) => prev.filter((f) => f !== field));
  };

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setInvalidFields([]);
    setOriginal(null);
    setForm({ ...emptyForm, date: localDateTime(new Date()) });
    setShowModal(true);
  };

  const openEdit = (c: Commande) => {
    const snapshot: FormState = {
      nr_commande: c.nr_commande,
      date: c.date.slice(0, 16),
      article_id: String(c.article_id),
      nombre: String(c.nombre),
      prix_unitaire: c.prix_unitaire != null ? String(c.prix_unitaire) : '',
      fournisseur_id: String(c.fournisseur_id),
      controle: c.controle,
    };
    setEditing(c);
    setFormError('');
    setInvalidFields([]);
    setOriginal(snapshot);
    setLockedArticle(false);
    setForm(snapshot);
    setShowModal(true);
  };

  const computedTotal = (() => {
    const qty = Number(form.nombre);
    const price = Number(form.prix_unitaire);
    if (form.nombre && Number.isInteger(qty) && form.prix_unitaire !== '' && Number.isFinite(price)) {
      return (qty * price).toFixed(2);
    }
    return '';
  })();

  const handleSave = async () => {
    setFormError('');
    setInvalidFields([]);
    const errs: Array<[string, string]> = [];
    if (!form.nr_commande.trim()) errs.push(['nr_commande', 'Le numero de commande est requis']);
    if (!form.date) errs.push(['date', 'La date est requise']);
    if (!form.article_id) errs.push(['article_id', 'Selectionnez un article']);
    const nombre = Number(form.nombre);
    if (!Number.isInteger(nombre) || nombre <= 0) errs.push(['nombre', 'Le nombre doit etre un entier positif']);
    if (form.prix_unitaire !== '') {
      const price = Number(form.prix_unitaire);
      if (!Number.isFinite(price) || price < 0) errs.push(['prix_unitaire', 'Le prix unitaire doit etre un nombre >= 0']);
    }
    if (!form.fournisseur_id) errs.push(['fournisseur_id', 'Selectionnez un fournisseur']);
    if (errs.length) {
      setInvalidFields(errs.map(([f]) => f));
      setFormError(errs[0][1]);
      return;
    }

    if (editing && original && JSON.stringify(form) === JSON.stringify(original)) {
      setFormError('Vous devez modifier au moins un champ');
      return;
    }

    const payload = {
      nr_commande: form.nr_commande.trim(),
      date: form.date.replace('T', ' '),
      article_id: Number(form.article_id),
      nombre,
      prix_unitaire: form.prix_unitaire === '' ? null : Number(form.prix_unitaire),
      fournisseur_id: Number(form.fournisseur_id),
      controle: form.controle,
    };
    try {
      if (editing) {
        await updateCommande(editing.id, payload);
      } else {
        await createCommande(payload);
      }
      setShowModal(false);
      setInfo(
        editing
          ? 'Commande mise a jour'
          : 'Commande creee. Email de demande de devis envoye au fournisseur.'
      );
      setTimeout(() => setInfo(''), 5000);
      await load();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Erreur lors de l\'enregistrement');
    }
  };

  const runAction = async () => {
    if (!confirmTarget) return;
    const { id, type } = confirmTarget;
    setConfirmTarget(null);
    setInfo('');
    try {
      switch (type) {
        case 'delete':
          await deleteCommande(id);
          setInfo('Commande supprimee');
          break;
        case 'relancer':
          await relancerDevis(id);
          setInfo('Demande de devis renvoyee au fournisseur');
          break;
        case 'envoyer':
          await envoyerAdmin(id);
          setInfo('Devis envoye a l administrateur');
          break;
        case 'approuver':
          await approuverCommande(id);
          setInfo('Commande approuvee. Elle passe a la finance.');
          break;
        case 'refuser':
          await refuserCommande(id);
          setInfo('Commande refusee');
          break;
      }
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Action impossible');
      setTimeout(() => setError(''), 5000);
    }
  };

  const confirmLabel = (t: string) => {
    if (t === 'delete') return 'Supprimer la commande';
    if (t === 'relancer') return 'Renvoyer la demande de devis';
    if (t === 'envoyer') return 'Envoyer le devis a l administrateur';
    if (t === 'approuver') return 'Approuver le devis';
    return 'Refuser le devis';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Commandes</h1>
              <p className="text-sm text-blue-100">Commandes et devis fournisseurs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setLockedArticle(false);
              openCreate();
            }}
            className="shrink-0 rounded-2xl bg-white px-5 py-2.5 text-sm font-medium text-blue-600 shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl"
          >
            + Nouvelle commande
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-fade-in">
          <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* Info banner */}
      {info && (
        <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 animate-fade-in">
          <svg className="h-5 w-5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="break-words">{info}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nr commande</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Nr article</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Prix unitaire</th>
                <th className="px-4 py-3">Prix total</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Contrôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Chargement...
                    </div>
                  </td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p className="mt-3 text-gray-400 text-sm">Aucune commande pour le moment</p>
                    </div>
                  </td>
                </tr>
              ) : (
                commandes.map((c, idx) => {
                  const badge = STATUT_BADGE[c.statut];
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50/50"
                      style={{ animationDelay: `${idx * 75}ms` }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <span className="max-w-[150px] truncate inline-block" title={c.nr_commande}>{c.nr_commande}</span>
                      </td>
                      <td className="px-4 py-3">{c.date.slice(0, 16).replace('T', ' ')}</td>
                      <td className="px-4 py-3">{c.nr_article ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className="max-w-[150px] truncate inline-block" title={c.article_nom ?? '-'}>{c.article_nom ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3">{c.nombre}</td>
                      <td className="px-4 py-3">{c.prix_unitaire != null ? c.prix_unitaire : '-'}</td>
                      <td className="px-4 py-3">{c.prix_total != null ? c.prix_total : '-'}</td>
                      <td className="px-4 py-3">
                        <span className="max-w-[150px] truncate inline-block" title={c.fournisseur ?? '-'}>{c.fournisseur ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium shadow-sm ${
                            c.controle ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {c.controle ? 'Ouvert' : 'Fermé'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium shadow-sm ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(c.statut === 'en_attente' || isAdmin) && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(c)}
                                className="rounded-xl px-3 py-1.5 text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 transition-all hover:bg-blue-100 hover:shadow-sm"
                              >
                                Modifier
                              </button>
                              {c.statut === 'en_attente' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'relancer' })
                                  }
                                  className="rounded-xl px-3 py-1.5 text-xs font-medium border border-orange-200 bg-orange-50 text-orange-700 transition-all hover:bg-orange-100 hover:shadow-sm"
                                >
                                  Relancer fournisseur
                                </button>
                              )}
                              {c.statut === 'en_attente' && (
                                <button
                                  type="button"
                                  disabled={c.prix_unitaire == null || c.prix_unitaire <= 0}
                                  onClick={() =>
                                    setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'envoyer' })
                                  }
                                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                                    c.prix_unitaire == null || c.prix_unitaire <= 0
                                      ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                                      : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm'
                                  }`}
                                >
                                  Envoyer à l'admin
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'delete' })
                                }
                                className="rounded-xl px-3 py-1.5 text-xs font-medium border border-red-200 bg-red-50 text-red-700 transition-all hover:bg-red-100 hover:shadow-sm"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                          {c.statut === 'soumis' && isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'approuver' })
                                }
                                className="rounded-xl px-3 py-1.5 text-xs font-medium border border-green-200 bg-green-50 text-green-700 transition-all hover:bg-green-100 hover:shadow-sm"
                              >
                                Approuver
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'refuser' })
                                }
                                className="rounded-xl px-3 py-1.5 text-xs font-medium border border-red-200 bg-red-50 text-red-700 transition-all hover:bg-red-100 hover:shadow-sm"
                              >
                                Refuser
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="lg:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Chargement...
              </div>
            </div>
          ) : commandes.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="mt-3 text-gray-400 text-sm">Aucune commande pour le moment</p>
            </div>
          ) : (
            commandes.map((c, idx) => {
              const badge = STATUT_BADGE[c.statut];
              return (
                <div
                  key={c.id}
                  className="p-4 space-y-3"
                  style={{ animationDelay: `${idx * 75}ms` }}
                >
                  {/* Top: nr_commande + statut */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800 truncate" title={c.nr_commande}>{c.nr_commande}</span>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium shadow-sm ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  {/* Middle: info grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Date</span>
                      <p className="text-gray-800">{c.date.slice(0, 16).replace('T', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Article</span>
                      <p className="text-gray-800 truncate" title={c.article_nom ?? '-'}>
                        <span className="text-gray-600">{c.nr_article ?? '-'}</span> {c.article_nom ?? '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Nombre</span>
                      <p className="text-gray-800">{c.nombre}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Prix unitaire</span>
                      <p className="text-gray-800">{c.prix_unitaire != null ? c.prix_unitaire : '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Prix total</span>
                      <p className="text-gray-800">{c.prix_total != null ? c.prix_total : '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Fournisseur</span>
                      <p className="text-gray-800 truncate" title={c.fournisseur ?? '-'}>{c.fournisseur ?? '-'}</p>
                    </div>
                  </div>
                  {/* Bottom: controle + actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span
                      className={`self-start rounded-full px-3 py-1 text-xs font-medium shadow-sm ${
                        c.controle ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.controle ? 'Ouvert' : 'Fermé'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(c.statut === 'en_attente' || isAdmin) && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="rounded-xl px-3 py-1.5 text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 transition-all hover:bg-blue-100 hover:shadow-sm"
                          >
                            Modifier
                          </button>
                          {c.statut === 'en_attente' && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'relancer' })
                              }
                              className="rounded-xl px-3 py-1.5 text-xs font-medium border border-orange-200 bg-orange-50 text-orange-700 transition-all hover:bg-orange-100 hover:shadow-sm"
                            >
                              Relancer fournisseur
                            </button>
                          )}
                          {c.statut === 'en_attente' && (
                            <button
                              type="button"
                              disabled={c.prix_unitaire == null || c.prix_unitaire <= 0}
                              onClick={() =>
                                setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'envoyer' })
                              }
                              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                                c.prix_unitaire == null || c.prix_unitaire <= 0
                                  ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                                  : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm'
                              }`}
                            >
                              Envoyer à l'admin
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'delete' })
                            }
                            className="rounded-xl px-3 py-1.5 text-xs font-medium border border-red-200 bg-red-50 text-red-700 transition-all hover:bg-red-100 hover:shadow-sm"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                      {c.statut === 'soumis' && isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'approuver' })
                            }
                            className="rounded-xl px-3 py-1.5 text-xs font-medium border border-green-200 bg-green-50 text-green-700 transition-all hover:bg-green-100 hover:shadow-sm"
                          >
                            Approuver
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmTarget({ id: c.id, label: c.nr_commande, type: 'refuser' })
                            }
                            className="rounded-xl px-3 py-1.5 text-xs font-medium border border-red-200 bg-red-50 text-red-700 transition-all hover:bg-red-100 hover:shadow-sm"
                          >
                            Refuser
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          title={editing ? 'Modifier la commande' : 'Nouvelle commande'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nr commande</label>
                <input
                  className={fieldClass(invalidFields.includes('nr_commande'))}
                  value={form.nr_commande}
                  onChange={(e) => {
                    touch('nr_commande');
                    setForm({ ...form, nr_commande: e.target.value });
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="datetime-local"
                  className={fieldClass(invalidFields.includes('date'))}
                  value={form.date}
                  onChange={(e) => {
                    touch('date');
                    setForm({ ...form, date: e.target.value });
                  }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Article</label>
              <select
                disabled={lockedArticle}
                className={fieldClass(invalidFields.includes('article_id'))}
                value={form.article_id}
                onChange={(e) => {
                  touch('article_id');
                  setForm({ ...form, article_id: e.target.value });
                }}
              >
                <option value="">-- Selectionner un article --</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.num_article} - {a.nom}
                  </option>
                ))}
              </select>
              {lockedArticle && (
                <>
                  {articles.find((a) => a.id === Number(form.article_id)) && (
                    <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-700">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>
                          Article proposé depuis l'alerte stock :{' '}
                          {articles.find((a) => a.id === Number(form.article_id))?.num_article} -{' '}
                          {articles.find((a) => a.id === Number(form.article_id))?.nom}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Choisissez le fournisseur, le nombre et la date.
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="number"
                  min={1}
                  className={fieldClass(invalidFields.includes('nombre'))}
                  value={form.nombre}
                  onChange={(e) => {
                    touch('nombre');
                    setForm({ ...form, nombre: e.target.value });
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix unitaire</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={fieldClass(invalidFields.includes('prix_unitaire'))}
                  value={form.prix_unitaire}
                  placeholder="apres devis"
                  onChange={(e) => {
                    touch('prix_unitaire');
                    setForm({ ...form, prix_unitaire: e.target.value });
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix total</label>
                <input
                  type="text"
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 transition-all"
                  value={computedTotal || '-'}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fournisseur</label>
              <select
                className={fieldClass(invalidFields.includes('fournisseur_id'))}
                value={form.fournisseur_id}
                onChange={(e) => {
                  touch('fournisseur_id');
                  setForm({ ...form, fournisseur_id: e.target.value });
                }}
              >
                <option value="">-- Selectionner un fournisseur --</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.controle}
                onChange={(e) => setForm({ ...form, controle: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              Contrôle (ouvert par défaut)
            </label>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                <svg className="h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="break-words">{formError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-all hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-300"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={confirmLabel(confirmTarget.type)}
          message={`Confirmer pour la commande ${confirmTarget.label} ?`}
          onConfirm={runAction}
          onCancel={() => setConfirmTarget(null)}
          confirmLabel={confirmTarget.type === 'approuver' ? 'Approuver' : confirmTarget.type === 'refuser' ? 'Refuser' : 'Confirmer'}
          danger={confirmTarget.type === 'delete' || confirmTarget.type === 'refuser'}
        />
      )}
    </div>
  );
}
