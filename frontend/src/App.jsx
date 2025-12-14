// src/App.jsx

// 1. main.jsx đã bọc BrowserRouter → App.jsx CHỈ dùng Routes
import { Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// ================= IMPORT CÁC TRANG =================
import Header from './components/Header';
import Footer from './components/Footer';
import Tracking from './pages/public/Tracking.jsx';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register.jsx';
import Option from './pages/auth/Option.jsx';
import TrackingResult from './pages/public/TrackingResult';
import ProtectedRoute from "./pages/auth/ProtectedRoute.jsx";
import NoPermission from "./pages/auth/NoPermission.jsx";
import HomePageCostumer from './pages/public/HomePage.jsx';

// ================= ADMIN IMPORT =================
import AdminLayout from './components/Layouts/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard';
import OrderManagement from './pages/admin/OrderManagement.jsx';
import AgentsManagement from './pages/admin/AgentsManagement.jsx';
import Reports from './pages/admin/Reports.jsx';

// ================= SHIPPER =================
import HomePageShipper from './pages/shipper/HomePageShipper.jsx';
import AboutUsShipper from './pages/shipper/AboutUsShipper.jsx';
import ContactShipper from './pages/shipper/ContactShipper.jsx';
import OrderDetailShipper from './pages/shipper/OrderDetailShipper.jsx';

// ================= USER =================
import UserOrdersPage from './pages/shipper/UserOrdersPage.jsx';
import UserProfilePage from './pages/shipper/UserProfilePage.jsx';

// ================= CUSTOMER =================
import CreateOrder from './pages/user/CreateOrder.jsx';

// (Các phần Layout PublicLayout, AuthLayout chú giữ nguyên như cũ...)

// Layout cho trang Public
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: '80vh' }}>{children}</main>
    <Footer />
  </>
);

// Layout Login / Register / Option
const AuthLayout = ({ children }) => (
  <main style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
    {children}
  </main>
);

export default function App() {
  return (
    <Routes>

      {/* ================= PUBLIC ================= */}
      <Route
        path="/tracking"
        element={
          <PublicLayout>
            <Tracking />
          </PublicLayout>
        }
      />

      {/* Homepage customer */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePageCostumer />
          </PublicLayout>
        }
      />

      <Route
        path="/tracking/:id"
        element={
          <PublicLayout>
            <TrackingResult />
          </PublicLayout>
        }
      />

      {/* ================= LOGIN / REGISTER / OPTION ================= */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />

      <Route
        path="/register"
        element={
          <AuthLayout>
            <Register />
          </AuthLayout>
        }
      />

      <Route
        path="/option"
        element={
          <AuthLayout>
            <Option />
          </AuthLayout>
        }
      />

      {/* ================= CUSTOMER (USER) ================= */}
      {/* Tạo đơn hàng – chỉ customer được phép */}
      <Route
        path="/createorder"
        element={
          <ProtectedRoute allowed={['customer']}>
            <AuthLayout>
              <CreateOrder />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/profile"
        element={
          <ProtectedRoute allowed={['customer']}>
            <PublicLayout>
              <UserProfilePage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/orders"
        element={
          <ProtectedRoute allowed={['customer']}>
            <PublicLayout>
              <UserOrdersPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= ADMIN + AGENT (DASHBOARD) ================= */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowed={['admin', 'agent']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="agents" element={<AgentsManagement />} />
        <Route path="reports" element={<Reports />} />
        {/* sau này nếu thêm route admin khác thì gắn ở đây */}
      </Route>

      {/* ================= SHIPPER ================= */}
      <Route
        path="/shipper/home"
        element={
          <ProtectedRoute allowed={['shipper']}>
            <PublicLayout>
              <HomePageShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/about"
        element={
          <ProtectedRoute allowed={['shipper']}>
            <PublicLayout>
              <AboutUsShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/contact"
        element={
          <ProtectedRoute allowed={['shipper']}>
            <PublicLayout>
              <ContactShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/order/:id"
        element={
          <ProtectedRoute allowed={['shipper']}>
            <PublicLayout>
              <OrderDetailShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />




      {/* ================= NO PERMISSION / FALLBACK ================= */}
      <Route path="/no-permission" element={<NoPermission />} />
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
