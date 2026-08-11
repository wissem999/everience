import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Products } from './pages/Products';
import { Fournisseurs } from './pages/Fournisseurs';
import { Clients } from './pages/Clients';
import { Users } from './pages/Users';

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
        <Route path="/products" element={<Products />} />
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
      </Route>

      <Route path="*" element={<Navigate to="/products" replace />} />
    </Routes>
  );
}

export default App;
