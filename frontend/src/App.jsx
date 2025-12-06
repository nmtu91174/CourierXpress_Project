// src/App.jsx
// 1. Chú phải import BrowserRouter và đặt tên tắt là Router
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import các trang
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import AdminLayout from '../src/components/Layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import TrackingResult from './pages/public/TrackingResult';

// (Các phần Layout PublicLayout, AuthLayout chú giữ nguyên như cũ...)
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: '80vh' }}>{children}</main>
    <Footer />
  </>
);

const AuthLayout = ({ children }) => (
  <main style={{ minHeight: '100vh', backgroundColor: '#fff' }}>{children}</main>
);

function App() {
  return (
    // 2. QUAN TRỌNG: Vì main.jsx không có Router, nên ở đây PHẢI CÓ Router bọc ngoài cùng
    <Router>
      <Routes>
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

        <Route path="/login" element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        } />

        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
        </Route>

      </Routes>
    </Router> // 3. Đóng thẻ Router lại
  );
}

export default App;