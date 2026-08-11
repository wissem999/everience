import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-5">
          <h1 className="text-xl font-bold text-gray-800">Everience</h1>
          <p className="text-xs text-gray-500">Gestion stock &amp; contacts</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <NavLink to="/products" className={navLinkClass}>
            Produits
          </NavLink>
          <NavLink to="/fournisseurs" className={navLinkClass}>
            Fournisseurs
          </NavLink>
          <NavLink to="/clients" className={navLinkClass}>
            Clients
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/users" className={navLinkClass}>
              Utilisateurs
            </NavLink>
          )}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-800">{user?.nom}</p>
          <p className="mb-2 text-xs text-gray-500">
            {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
