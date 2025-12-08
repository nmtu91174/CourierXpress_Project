// frontend/src/App.jsx
import { Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/public/Home";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/admin/Dashboard";

import UserProfilePage from "./pages/user/UserProfilePage";
import UserOrdersPage from "./pages/user/UserOrdersPage";

import AdminLayout from "./components/Layouts/AdminLayout";
import UserLayout from "./components/Layouts/UserLayout";

// ===== LAYOUT PUBLIC =====
const PublicLayout = ({ children }) => (
  <>
    <Header />
    <main style={{ minHeight: "80vh" }}>{children}</main>
    <Footer />
  </>
);

// ===== LAYOUT AUTH =====
const AuthLayout = ({ children }) => (
  <main style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
    {children}
  </main>
);

function App() {
  return (
    <Routes>

      {/* ===== PUBLIC ===== */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <Home />
          </PublicLayout>
        }
      />

      {/* ===== LOGIN ===== */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />

      {/* ===== ADMIN ===== */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
      </Route>

      {/* ✅ ===== USER (CÓ SIDEBAR RIÊNG, KHÔNG DÍNH ADMIN) ===== ✅ */}
      <Route path="/user" element={<UserLayout />}>
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="orders" element={<UserOrdersPage />} />
      </Route>

    </Routes>
  );
}

export default App;
