// src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// ================= IMPORT =================
import Header from './components/Header';
import Footer from './components/Footer';

// Public pages
import Tracking from './pages/public/Tracking.jsx';
import TrackingResult from './pages/public/TrackingResult';
import HomePageCostumer from './pages/public/HomePage.jsx';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register.jsx';
import Option from './pages/auth/Option.jsx';
import ProtectedRoute from "./pages/auth/ProtectedRoute.jsx";
import NoPermission from "./pages/auth/NoPermission.jsx";

// Customer pages
import CreateOrder from './pages/user/CreateOrder.jsx';
import UserOrdersPage from './pages/shipper/UserOrdersPage.jsx';
import UserProfilePage from './pages/shipper/UserProfilePage.jsx';
import OrderDetail from './pages/user/OrderDetail.jsx';
import DeliveryInProgress from './pages/shipper/DeliveryInProgress.jsx';

// Admin pages
import AdminLayout from './components/Layouts/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard';
import OrderManagement from './pages/admin/OrderManagement.jsx';
import AgentsManagement from './pages/admin/AgentsManagement.jsx';
import Reports from './pages/admin/Reports.jsx';

// Shipper pages
import HomePageShipper from './pages/shipper/HomePageShipper.jsx';
import AboutUsShipper from './pages/shipper/AboutUsShipper.jsx';
import ContactShipper from './pages/shipper/ContactShipper.jsx';
import OrderDetailShipper from './pages/shipper/OrderDetailShipper.jsx';
import EditOrderShipper from "./pages/shipper/EditOrderShipper.jsx";
import OrderHistoryShipper from "./pages/shipper/OrderHistoryShipper.jsx";



// ================= LAYOUT =================

// Layout cho các trang public (có Header + Footer)
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: '80vh' }}>
      {children}
    </main>
    <Footer />
  </>
);

// Layout cho login / register / option / create order
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
        path="/"
        element={
          <PublicLayout>
            <HomePageCostumer />
          </PublicLayout>
        }
      />

      <Route
        path="/tracking"
        element={
          <PublicLayout>
            <Tracking />
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

      {/* ================= AUTH ================= */}

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

      {/* ================= CREATE ORDER ================= */}
      {/* Trang tạo đơn dùng chung cho khách vãng lai và user đã đăng nhập */}
      <Route
        path="/createorder"
        element={
          <AuthLayout>
            <CreateOrder />
          </AuthLayout>
        }
      />

      {/* ================= CUSTOMER (LOGIN) ================= */}

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
        path="/orders"
        element={
          <ProtectedRoute allowed={['customer']}>
            <PublicLayout>
              <UserOrdersPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/orders/:id"
        element={
          <ProtectedRoute allowed={['customer']}>
            <PublicLayout>
              <OrderDetail />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= ADMIN + AGENT ================= */}

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
        <Route
          path="/shipper/on-the-way"
          element={
            <ProtectedRoute allowed={['shipper']}>
              <PublicLayout>
                <DeliveryInProgress />
              </PublicLayout>
            </ProtectedRoute>
          }
        />
              <Route
        path="/shipper/edit-order/:id"
        element={
          <ProtectedRoute allowed={['shipper']}>
            <PublicLayout>
              <EditOrderShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />
            <Route
        path="/shipper/order-history"
        element={
          <ProtectedRoute allowed={['shipper']}>
            <PublicLayout>
              <OrderHistoryShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />



      {/* ================= FALLBACK ================= */}

      <Route path="/no-permission" element={<NoPermission />} />
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
