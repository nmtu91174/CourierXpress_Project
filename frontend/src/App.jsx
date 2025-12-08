// src/App.jsx

// 1. Chú phải import BrowserRouter và đặt tên tắt là Router
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import các trang
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import TrackingResult from './pages/public/TrackingResult';

// Admin import
import AdminLayout from './components/Layouts/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard';
import OrderManagement from './pages/admin/OrderManagement.jsx';
import AgentsManagement from './pages/admin/AgentsManagement.jsx';
import Reports from './pages/admin/Reports.jsx';

// User import
import UserOrdersPage from './pages/user/UserOrdersPage.jsx';
import UserProfilePage from './pages/user/UserProfilePage.jsx';


// (Các phần Layout PublicLayout, AuthLayout chú giữ nguyên như cũ...)

// Layout cho trang Public
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: '80vh' }}>{children}</main>
    <Footer />
  </>
);

// Layout Login
const AuthLayout = ({ children }) => (
  <main style={{ minHeight: '100vh', backgroundColor: '#fff' }}>{children}</main>
);

export default function App() {
  return (
    // main.jsx đã bọc Router rồi, nên ở đây không cần bọc nữa
      <Routes>

        {/* Public */}
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

        {/* Login */}
        <Route path="/login" element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        } />

        {/* Admin */}
        <Route path="/admin" element={<AdminLayout />}>

          {/* 3. GIỮ FULL ROUTE BÊN NHÁNH MỚI */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="agents" element={<AgentsManagement />} />
          <Route path="reports" element={<Reports />} />

        </Route>

        {/* USER ROUTES */}
        <Route path="/user/profile" element={
          <PublicLayout>
            <UserProfilePage />
          </PublicLayout>
        } />

        <Route path="/user/orders" element={
          <PublicLayout>
            <UserOrdersPage />
          </PublicLayout>
        } />


      </Routes>
  );
}
