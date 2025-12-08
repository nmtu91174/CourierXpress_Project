import { Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// Public
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import TrackingResult from './pages/public/TrackingResult';

// Shipper
import HomePageShipper from './pages/shipper/HomePageShipper.jsx';
import AboutUsShipper from './pages/shipper/AboutUsShipper.jsx';
import ContactShipper from './pages/shipper/ContactShipper.jsx';

// Admin
import AdminLayout from './components/Layouts/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard';
import OrderManagement from './pages/admin/OrderManagement.jsx';
import AgentsManagement from './pages/admin/AgentsManagement.jsx';
import Reports from './pages/admin/Reports.jsx';

// ✅ User
import UserLayout from "./components/Layouts/UserLayout";
import UserProfilePage from "./pages/user/UserProfilePage";
import UserOrdersPage from "./pages/user/UserOrdersPage";

// ===== Layout Public =====
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: '80vh' }}>{children}</main>
    <Footer />
  </>
);

// ===== Layout Login =====
const AuthLayout = ({ children }) => (
  <main style={{ minHeight: '100vh', backgroundColor: '#fff' }}>{children}</main>
);

export default function App() {
  return (
    <Routes>

      {/* ===== PUBLIC ===== */}
      <Route path="/" element={
        <PublicLayout>
          <Home />
        </PublicLayout>
      } />

      <Route path="/tracking/:id" element={
        <PublicLayout>
          <TrackingResult />
        </PublicLayout>
      } />

      {/* ===== SHIPPER ===== */}
      <Route path="/shipper/home" element={
        <PublicLayout>
          <HomePageShipper />
        </PublicLayout>
      } />

      <Route path="/shipper/about" element={
        <PublicLayout>
          <AboutUsShipper />
        </PublicLayout>
      } />

      <Route path="/shipper/contact" element={
        <PublicLayout>
          <ContactShipper />
        </PublicLayout>
      } />

      {/* ===== LOGIN ===== */}
      <Route path="/login" element={
        <AuthLayout>
          <Login />
        </AuthLayout>
      } />

      {/* ===== ADMIN ===== */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="agents" element={<AgentsManagement />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* ✅ ===== USER ===== */}
      <Route path="/user" element={<UserLayout />}>
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="orders" element={<UserOrdersPage />} />
      </Route>

    </Routes>
  );
}
