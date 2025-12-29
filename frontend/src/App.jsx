// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// ================= IMPORT =================
import Header from "./components/Header";
import Footer from "./components/Footer";

// Public pages
import Tracking from "./pages/public/Tracking.jsx";
import TrackingResult from "./pages/public/TrackingResult";
import HomePageCostumer from "./pages/public/HomePage.jsx";
import Sitemap from "./pages/public/Sitemap.jsx";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register.jsx";
import Option from "./pages/auth/Option.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";
import ProtectedRoute from "./pages/auth/ProtectedRoute.jsx";
import NoPermission from "./pages/auth/NoPermission.jsx";

// Customer pages
import CreateOrder from "./pages/user/CreateOrder.jsx";
import UserOrdersPage from "./pages/shipper/UserOrdersPage.jsx";
import UserProfilePage from "./pages/shipper/UserProfilePage.jsx";
import UserIdentityDashboard from "./pages/admin/UserIdentityDashboard.jsx";
import AccountSettingsPage from "./pages/admin/AccountSettingsPage.jsx";
import NotificationsPage from "./pages/admin/NotificationsPage.jsx";
import OrderDetail from "./pages/user/OrderDetail.jsx";
import Orders from "./pages/user/Orders.jsx";
import DeliveryInProgress from "./pages/shipper/DeliveryInProgress.jsx";

// Admin pages
import AdminLayout from "./components/Layouts/AdminLayout.jsx";
import Dashboard from "./pages/admin/Dashboard";
import OrderManagement from "./pages/admin/OrderManagement.jsx";
import AgentsManagement from "./pages/admin/AgentsManagement.jsx";
import Reports from "./pages/admin/Reports.jsx";

// Invoice pages
import InvoiceList from './pages/Invoice/InvoiceList.jsx';
import InvoiceView from './pages/Invoice/InvoiceView.jsx';
import CustomerInvoiceView from './pages/Invoice/CustomerInvoiceView.jsx';

// Agent pages
import AgentLayout from "./components/Layouts/AgentLayout.jsx";
import AgentDashboard from "./pages/agent/AgentDashboard.jsx";
import MyOrders from "./pages/agent/MyOrders.jsx";
import AssignShipper from "./pages/agent/AssignShipper.jsx";
import AgentNotifications from "./pages/agent/Notifications.jsx";
import RequireRole from "./components/guards/RequireRole.jsx";

// Shipper pages
import HomePageShipper from "./pages/shipper/HomePageShipper.jsx";
import AboutUsShipper from "./pages/shipper/AboutUsShipper.jsx";
import ContactShipper from "./pages/shipper/ContactShipper.jsx";
import OrderDetailShipper from "./pages/shipper/OrderDetailShipper.jsx";
import EditOrderShipper from "./pages/shipper/EditOrderShipper.jsx";
import OrderHistoryShipper from "./pages/shipper/OrderHistoryShipper.jsx";

// ================= LAYOUT =================

// Layout cho các trang public (có Header + Footer)
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: "80vh", backgroundColor: "#f5f7fa" }}>
      {children}
    </main>
    <Footer />
  </>
);

// Layout cho login / register / option / create order
const AuthLayout = ({ children }) => (
  <main style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
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
      {/* --- 2. THÊM ROUTE SITEMAP TẠI ĐÂY --- */}
      <Route
        path="/sitemap"
        element={
          <PublicLayout>
            {" "}
            {/* Bọc trong PublicLayout để có Header/Footer */}
            <Sitemap />
          </PublicLayout>
        }
      />
      {/* -------------------------------------- */}

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

      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <ForgotPassword />
          </AuthLayout>
        }
      />

      <Route
        path="/reset-password"
        element={
          <AuthLayout>
            <ResetPassword />
          </AuthLayout>
        }
      />

      {/* ================= CREATE ORDER ================= */}
      {/* Trang tạo đơn dùng chung cho khách vãng lai và user đã đăng nhập */}
      <Route
        path="/createorder"
        element={
          <AuthLayout>
            <Header />
            <CreateOrder />
            <Footer />
          </AuthLayout>
        }
      />

      {/* ================= CUSTOMER (LOGIN) ================= */}

      <Route
        path="/customer"
        element={
          <ProtectedRoute allowed={["customer"]}>
            <PublicLayout>
              <Navigate to="/customer/profile" replace />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customer/profile"
        element={
          <ProtectedRoute allowed={["customer"]}>
            <PublicLayout>
              <UserIdentityDashboard />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customer/account-settings"
        element={
          <ProtectedRoute allowed={["customer"]}>
            <PublicLayout>
              <AccountSettingsPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customer/notifications"
        element={
          <ProtectedRoute allowed={["customer"]}>
            <PublicLayout>
              <NotificationsPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy route - redirect to new route */}
      <Route
        path="/user/profile"
        element={
          <ProtectedRoute allowed={["customer", "shipper"]}>
            <PublicLayout>
              <UserProfilePage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute allowed={["customer"]}>
            <PublicLayout>
              <Orders />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/orders/:id"
        element={
          <ProtectedRoute allowed={["customer"]}>
            <PublicLayout>
              <OrderDetail />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/orders/:orderId/invoice"
        element={
          <ProtectedRoute allowed={['customer']}>
            <PublicLayout>
              <CustomerInvoiceView />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= ADMIN PORTAL ================= */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowed={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="agents" element={<AgentsManagement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/:id" element={<InvoiceView />} />
        <Route path="profile" element={<UserIdentityDashboard />} />
        <Route path="account-settings" element={<AccountSettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* ================= AGENT PORTAL ================= */}

      <Route
        path="/agent"
        element={
          <RequireRole allowedRoles={["agent", "admin"]}>
            <AgentLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="orders" element={<MyOrders />} />
        <Route path="assign-shipper" element={<AssignShipper />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<UserIdentityDashboard />} />
        <Route path="account-settings" element={<AccountSettingsPage />} />
      </Route>

      {/* ================= SHIPPER ================= */}

      <Route
        path="/shipper"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <Navigate to="/shipper/home" replace />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/profile"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <UserIdentityDashboard />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/account-settings"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <AccountSettingsPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/notifications"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <NotificationsPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/home"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <HomePageShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/about"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <AboutUsShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/contact"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <ContactShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipper/order/:id"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <OrderDetailShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipper/on-the-way"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <DeliveryInProgress />
            </PublicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipper/edit-order/:id"
        element={
          <ProtectedRoute allowed={["shipper"]}>
            <PublicLayout>
              <EditOrderShipper />
            </PublicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipper/order-history"
        element={
          <ProtectedRoute allowed={["shipper"]}>
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
