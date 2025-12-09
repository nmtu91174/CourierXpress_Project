// src/App.jsx

// 1. Chú phải import BrowserRouter và đặt tên tắt là Router
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import các trang
import Header from './components/Header';
import Footer from './components/Footer';
import Tracking from './pages/public/Tracking.jsx';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register.jsx';
import Option from './pages/auth/Option.jsx';
import TrackingResult from './pages/public/TrackingResult';
import ProtectedRoute from "./pages/auth/ProtectedRoute.jsx";
import NoPermission from "./pages/auth/NoPermission.jsx";
import HomePageCostumer from './pages/public/HomePage.jsx'


// Admin import
import AdminLayout from './components/Layouts/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard';
import OrderManagement from './pages/admin/OrderManagement.jsx';
import AgentsManagement from './pages/admin/AgentsManagement.jsx';
import Reports from './pages/admin/Reports.jsx';

//Shipper 
import HomePageShipper from './pages/shipper/HomePageShipper.jsx';
import AboutUsShipper from './pages/shipper/AboutUsShipper.jsx';
import ContactShipper from './pages/shipper/ContactShipper.jsx';

//User import
import UserOrdersPage from './pages/shipper/UserOrdersPage.jsx';
import UserProfilePage from './pages/shipper/UserProfilePage.jsx';


// Customer import
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

// Layout Login
const AuthLayout = ({ children }) => (
  <main style={{ minHeight: '100vh', backgroundColor: '#fff' }}>{children}</main>
);

export default function App() {
  return (
    <Routes>

      {/* Public */}
      <Route path="/tracking" element={
        <PublicLayout>
          <Tracking />
        </PublicLayout>
      } />


      {/* Homepage customer */}
      <Route path="/" element={
        <PublicLayout>
          <HomePageCostumer />
        </PublicLayout>
      } />

      <Route path="/tracking/:id" element={
        <PublicLayout>
          <TrackingResult />
        </PublicLayout>
      } />

      {/* Login/Register/Option */}
      <Route path="/login" element={
        <AuthLayout>
          <Login />
        </AuthLayout>
      } />
      <Route path="/register" element={
        <AuthLayout>
          <Register />
        </AuthLayout>
      } />
      <Route path="/option" element={
        <AuthLayout>
          <Option />
        </AuthLayout>
      } />



      <Route path="/createorder" element={
        <AuthLayout>
          <CreateOrder />
        </AuthLayout>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowed={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="agents" element={<AgentsManagement />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Shipper Routes */}
      <Route path="/shipper/home" element={
        <ProtectedRoute allowed={['shipper']}>
          <PublicLayout>
            <HomePageShipper />
          </PublicLayout>
        </ProtectedRoute>
      } />
      <Route path="/shipper/about" element={
        <ProtectedRoute allowed={['shipper']}>
          <PublicLayout>
            <AboutUsShipper />
          </PublicLayout>
        </ProtectedRoute>
      } />
      <Route path="/shipper/contact" element={
        <ProtectedRoute allowed={['shipper']}>
          <PublicLayout>
            <ContactShipper />
          </PublicLayout>
        </ProtectedRoute>
      } />

      {/* Customer/User Routes */}
      <Route path="/user/profile" element={
        <ProtectedRoute allowed={['customer']}>
          <PublicLayout>
            <UserProfilePage />
          </PublicLayout>
        </ProtectedRoute>
      } />
      <Route path="/user/orders" element={
        <ProtectedRoute allowed={['customer']}>
          <PublicLayout>
            <UserOrdersPage />
          </PublicLayout>
        </ProtectedRoute>
      } />

      {/* No permission */}
      <Route path="/no-permission" element={<NoPermission />} />

    </Routes>
  );
}

