// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/public/Home';

// Tạo component Layout để Header và Footer luôn hiển thị
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: '80vh' }}>
      {children}
    </main>
    <Footer />
  </>
);

function App() {
  return (
    <Router>
      <PublicLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tracking" element={<h2 className="text-center mt-5">Trang Tra cứu chi tiết (Đang phát triển)</h2>} />
          <Route path="/login" element={<h2 className="text-center mt-5">Trang Đăng nhập (Đang phát triển)</h2>} />
          {/* Sau này sẽ thêm các Route cho Admin/Agent ở đây */}
        </Routes>
      </PublicLayout>
    </Router>
  );
}

export default App;