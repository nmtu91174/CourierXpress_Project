// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css'; // Đảm bảo đã import Bootstrap

// Import các trang
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import AdminLayout from '../src/components/Layouts/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard';

// Layout cho trang Public (Có Header và Footer)
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: '80vh' }}>
      {children}
    </main>
    <Footer />
  </>
);

// Layout riêng cho Login (Trống trơn, không có Header/Footer)
const AuthLayout = ({ children }) => (
  <main style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
    {children}
  </main>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. Đường dẫn Trang chủ: http://localhost:5173/ */}
        <Route path="/" element={
          <PublicLayout>
            <Home />
          </PublicLayout>
        } />

        {/* 2. Đường dẫn Trang Login: http://localhost:5173/login */}
        <Route path="/login" element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        } />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;