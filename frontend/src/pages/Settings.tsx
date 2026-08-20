import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle, AlertCircle, X, Plus, Mail, Server, FileText, Users } from 'lucide-react';
import { getSettings, updateSettings } from '../api/settings';
import { TextInput } from '../components/FormField';

const SMTP_KEYS = ['smtp_user', 'smtp_pass', 'mail_from'];

const EMAIL_GROUPS = [
  {
    title: 'Alerte stock bas',
    description: 'Envoyee automatiquement quand un article atteint le stock minimum',
    keys: ['stock_alert_subject', 'stock_alert_body'],
  },
  {
    title: 'Demande de devis au fournisseur',
    description: 'Envoyee au fournisseur quand on lui demande un devis',
    keys: ['devis_supplier_subject', 'devis_supplier_body'],
  },
  {
    title: 'Devis a approuver (Admin)',
    description: 'Envoyee a l\'admin quand un devis est pret a etre approuve',
    keys: ['devis_admin_subject', 'devis_admin_body'],
  },
  {
    title: 'Commande approuvee (Finance)',
    description: 'Envoyee a l\'equipe finance quand l\'admin approuve une commande',
    keys: ['commande_approve_subject', 'commande_approve_body'],
  },
];

const LABELS: Record<string, string> = {
  smtp_user: 'SMTP User',
  smtp_pass: 'SMTP Password',
  mail_from: 'Email expediteur',
  stock_alert_subject: 'Objet',
  stock_alert_body: 'Corps du message',
  devis_supplier_subject: 'Objet',
  devis_supplier_body: 'Corps du message',
  devis_admin_subject: 'Objet',
  devis_admin_body: 'Corps du message',
  commande_approve_subject: 'Objet',
  commande_approve_body: 'Corps du message',
};

function isTextarea(key: string) {
  return key.endsWith('_body');
}

export function Settings() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [financeError, setFinanceError] = useState('');

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const addFinanceEmail = (val: string) => {
    const clean = val.trim().toLowerCase();
    if (!clean) { setFinanceError('Entrez un email'); return; }
    if (!isValidEmail(clean)) { setFinanceError('Email invalide (ex: nom@domaine.com)'); return; }
    const current = (form.finance_emails || '').split(',').filter((x) => x.trim());
    if (current.some((e) => e.trim().toLowerCase() === clean)) { setFinanceError('Cet email existe deja'); return; }
    setFinanceError('');
    current.push(clean);
    set('finance_emails')(current.join(', '));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setForm(data);
      setOriginal(data);
    } catch {
      setError('Impossible de charger les parametres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    if (JSON.stringify(form) === JSON.stringify(original)) {
      setError('Aucune modification effectuee');
      setSaving(false);
      return;
    }

    try {
      const updated = await updateSettings(form);
      setForm(updated);
      setOriginal(updated);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
    setSuccess(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
        <p className="mt-1 text-sm text-gray-500">Configuration des emails et du serveur SMTP</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* SMTP Configuration */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in-up">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Server className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Configuration SMTP</h2>
              <p className="text-sm text-gray-500">Connexion au serveur d'envoi d'emails</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SMTP_KEYS.map((key) => (
              <TextInput
                key={key}
                label={LABELS[key] || key}
                type={key.includes('pass') ? 'password' : 'text'}
                value={form[key] || ''}
                onChange={(e) => set(key)(e.target.value)}
              />
            ))}
          </div>
        </section>

        {/* Finance Team */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in-up delay-75">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Equipe Finance</h2>
              <p className="text-sm text-gray-500">Qui recoit l'email quand une commande est approuvee ?</p>
            </div>
          </div>

          {/* Email Chips */}
          <div className="flex flex-wrap gap-2">
            {(form.finance_emails || '').split(',').filter((e) => e.trim()).map((email, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 animate-scale-in"
              >
                <Mail className="h-3.5 w-3.5" />
                {email.trim()}
                <button
                  type="button"
                  onClick={() => {
                    const emails = (form.finance_emails || '').split(',').filter((x) => x.trim());
                    emails.splice(idx, 1);
                    set('finance_emails')(emails.join(', '));
                    setFinanceError('');
                  }}
                  className="ml-0.5 rounded-full p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>

          {/* Add Email Input */}
          <div className="mt-4 flex items-center gap-2">
            <input
              id="new-finance-email"
              type="email"
              placeholder="email@exemple.com"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFinanceEmail(e.currentTarget.value);
                  if (isValidEmail(e.currentTarget.value.trim())) e.currentTarget.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('new-finance-email') as HTMLInputElement;
                addFinanceEmail(input.value);
                if (isValidEmail(input.value.trim())) input.value = '';
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          {financeError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {financeError}
            </div>
          )}
        </section>

        {/* Email Template Groups */}
        {EMAIL_GROUPS.map((group, groupIdx) => (
          <section
            key={group.title}
            className={`mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in-up delay-${groupIdx < 4 ? ['100', '150', '200', '300'][groupIdx] : '300'}`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
                <p className="text-sm text-gray-500">{group.description}</p>
              </div>
            </div>
            <div className="space-y-4">
              {group.keys.map((key) => (
                <div key={key}>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{LABELS[key] || key}</label>
                  {isTextarea(key) ? (
                    <textarea
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-colors placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      rows={5}
                      value={form[key] || ''}
                      onChange={(e) => set(key)(e.target.value)}
                    />
                  ) : (
                    <TextInput
                      label=""
                      value={form[key] || ''}
                      onChange={(e) => set(key)(e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 animate-scale-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 animate-scale-in">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            Parametres enregistres avec succes !
          </div>
        )}

        {/* Submit Button */}
        <div className="pb-8">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sauvegarde...
              </span>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </form>

      {/* Variables Helper */}
      <section className="mb-8 rounded-xl bg-gray-50 p-5 text-xs text-gray-500 animate-fade-in-up delay-400">
        <p className="mb-2 font-medium text-gray-700">Variables utilisables dans les messages :</p>
        <div className="flex flex-wrap gap-2">
          {['{num_article}', '{nom}', '{stock}', '{stock_min}', '{besoin}', '{link}', '{nr_commande}', '{article_nom}', '{nombre}', '{date}', '{prix_unitaire}', '{prix_total}', '{fournisseur}'].map((v) => (
            <code key={v} className="rounded-lg bg-white px-2 py-1 font-mono text-xs text-gray-600 shadow-sm border border-gray-100">
              {v}
            </code>
          ))}
        </div>
      </section>
    </div>
  );
}
