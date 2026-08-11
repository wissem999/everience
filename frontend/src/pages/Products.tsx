import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { TextArea, TextInput } from '../components/FormField';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../api/products';
import type { Product } from '../types';

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

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await getProducts());
    } catch {
      setError('Impossible de charger les produits');
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

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      num_article: product.num_article,
      nom: product.nom,
      description: product.description ?? '',
      prix: String(product.prix),
      stock: String(product.stock),
      stock_min: String(product.stock_min),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = {
      num_article: form.num_article,
      nom: form.nom,
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
      setError(err.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Supprimer le produit "${product.nom}" ?`)) return;
    try {
      await deleteProduct(product.id);
      await load();
    } catch {
      alert("Impossible de supprimer ce produit");
    }
  };

  const set = (field: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const prix = Number(form.prix) || 0;
  const stock = Number(form.stock) || 0;
  const stockMin = Number(form.stock_min) || 0;
  const previewStatus = stock <= stockMin ? 'Besoin Activation' : 'Actif';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Produits</h1>
          <p className="text-sm text-gray-500">Gestion des articles en stock</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouveau produit
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
                <th className="px-4 py-3">N° Article</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Stock min</th>
                <th className="px-4 py-3">Valeur stock</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-600">{p.num_article}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nom}</td>
                  <td className="px-4 py-3">{Number(p.prix).toFixed(2)} DH</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3">{p.stock_min}</td>
                  <td className="px-4 py-3">{Number(p.valeur_stock).toFixed(2)} DH</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Aucun produit pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Modifier le produit' : 'Nouveau produit'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Numéro article"
                value={form.num_article}
                onChange={(e) => set('num_article')(e.target.value)}
                required
              />
              <TextInput
                label="Nom"
                value={form.nom}
                onChange={(e) => set('nom')(e.target.value)}
                required
              />
            </div>
            <TextArea
              label="Description"
              rows={2}
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-4">
              <TextInput
                label="Prix (DH)"
                type="number"
                step="0.01"
                min="0"
                value={form.prix}
                onChange={(e) => set('prix')(e.target.value)}
                required
              />
              <TextInput
                label="Stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock')(e.target.value)}
                required
              />
              <TextInput
                label="Stock min"
                type="number"
                min="0"
                value={form.stock_min}
                onChange={(e) => set('stock_min')(e.target.value)}
                required
              />
            </div>

            <div className="rounded-md bg-gray-50 px-4 py-3 text-sm">
              <p>
                Valeur du stock :{' '}
                <span className="font-semibold">{(prix * stock).toFixed(2)} DH</span>
              </p>
              <p>
                Statut : <StatusBadge status={previewStatus} />
              </p>
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
