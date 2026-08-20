import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Articles } from './pages/Articles';
import { Fournisseurs } from './pages/Fournisseurs';
import { Clients } from './pages/Clients';
import { Users } from './pages/Users';
import { Bookings } from './pages/Bookings';
import { Commandes } from './pages/Commandes';
import { Settings } from './pages/Settings';
import { Packs } from './pages/Packs';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/articles" element={<Articles />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/packs" element={<Packs />} />
        <Route path="/commandes" element={<Commandes />} />
        <Route path="/fournisseurs" element={<Fournisseurs />} />
        <Route path="/clients" element={<Clients />} />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <Users />
            </AdminRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/articles" replace />} />
    </Routes>
  );
}

export default App;
