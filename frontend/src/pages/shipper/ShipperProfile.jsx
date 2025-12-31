// src/pages/shipper/ShipperProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container, Card, Spinner, Alert, Badge, Button, Row, Col } from "react-bootstrap";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
// ĐẢM BẢO IMPORT ĐẦY ĐỦ ICONS Ở ĐÂY
import { 
  FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, 
  FiCreditCard, FiTruck, FiClock, FiEdit3, 
  FiRefreshCcw, FiArrowLeft 
} from "react-icons/fi";

const API_BASE = "http://localhost:8891/CourierXpress_Project/backend/api/shipper";

// --- Modern Styles ---
const styles = {
  card: {
    borderRadius: "20px",
    border: "none",
    boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
    background: "#fff",
    overflow: "hidden"
  },
  pill: {
    fontSize: 12,
    opacity: 0.85,
    background: "#f6f7f9",
    border: "1px solid #eef0f3",
    padding: "6px 14px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: "500"
  },
  infoBox: {
    padding: "16px",
    borderRadius: "14px",
    background: "#fbfbfc",
    border: "1px solid #f0f1f3",
    height: "100%"
  },
  label: {
    fontSize: "12px",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  value: {
    fontWeight: "600",
    color: "#2d3436",
    fontSize: "15px"
  }
};

export default function ShipperProfile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  const calcWorkingTime = (createdAt) => {
    if (!createdAt) return "-";
    const start = new Date(createdAt);
    const now = new Date();
    const days = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    return `${months} months ${days % 30} days`;
  };

  const fmtDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-GB"); 
  };

  const genderText = (g) => {
    const genders = { male: "Male", female: "Female", other: "Other" };
    return genders[g] || "-";
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/get_profile.php`, { credentials: "include" });
      const data = await res.json();

      if (data.status !== "success") {
        setError(data.message || "Failed to load profile.");
        return;
      }

      setProfile(data.data);

      // Sync localStorage safely
      try {
        const oldUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...oldUser, ...data.data }));
      } catch (storageErr) {
        console.warn("Storage sync failed", storageErr);
}

    } catch (e) {
      setError("Cannot connect to server. Please check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // Calculate avatarUrl inside useMemo to prevent unnecessary re-renders or crashes
  const avatarUrl = useMemo(() => {
    if (!profile?.avatar) return null;
    // Nếu path đã có http thì dùng luôn, nếu chưa thì nối với Domain
    return profile.avatar.startsWith("http") 
        ? profile.avatar 
        : `http://localhost:8891${profile.avatar}`; 
}, [profile?.avatar]);

  if (loading) return (
    <Container className="py-5 text-center">
      <Spinner animation="grow" variant="dark" />
      <div className="mt-3 text-muted">Fetching profile details...</div>
    </Container>
  );

  if (error) return (
    <Container className="py-5" style={{ maxWidth: 800 }}>
      <Alert variant="danger" className="border-0 shadow-sm rounded-4">{error}</Alert>
      <Button variant="dark" className="rounded-pill px-4" onClick={fetchProfile}>Retry</Button>
    </Container>
  );

  if (!profile) return null;

  return (
    <Container className="py-4" style={{ maxWidth: 1000 }}>
      {/* 1. BACK TO HOME BUTTON */}
      <div className="mb-3">
        <Button 
          variant="link" 
          className="text-dark p-0 d-flex align-items-center gap-2 text-decoration-none fw-bold shadow-none"
          onClick={() => navigate("/shipper/home")}
        >
          <FiArrowLeft /> Back to Dashboard
        </Button>
      </div>

      {/* 2. HEADER CARD */}
      <Card className="p-4 mb-4 shadow-sm" style={styles.card}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-4">
          <div className="d-flex align-items-center gap-4">
            <div className="position-relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: 80, height: 80, borderRadius: "24px", objectFit: "cover", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: "24px", background: "linear-gradient(135deg, #ff824d 0%, #ff5e3a 100%)", display: "grid", placeItems: "center", color: "white", fontSize: 28, fontWeight: 800 }}>
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <Badge bg="success" className="position-absolute border border-3 border-white rounded-pill" style={{ bottom: "-5px", right: "-5px", padding: "6px 10px" }}>Active</Badge>
            </div>

            <div>
              <h3 className="fw-bold text-dark mb-1">{profile.name || "Shipper"}</h3>
              <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                 <span style={styles.pill}><FiUser /> <b>Role:</b> Shipper</span>
                 <span style={styles.pill}><FiClock /> <b>Tenure:</b> {calcWorkingTime(profile.created_at)}</span>
              </div>
<p className="text-muted small mb-0">Review your profile details and logistics performance.</p>
            </div>
          </div>

          <div className="d-flex gap-2">
            <Button variant="dark" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => navigate("/shipper/profile/edit")}>
              <FiEdit3 className="me-2" /> Edit Profile
            </Button>
            <Button variant="outline-dark" className="rounded-circle p-2 shadow-sm" onClick={fetchProfile}>
              <FiRefreshCcw />
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. INFORMATION GRID CARD */}
      <Card className="p-4 shadow-sm" style={styles.card}>
        <div className="d-flex align-items-center gap-2 mb-4">
          <div className="bg-light p-2 rounded-3"><FiUser className="text-dark" /></div>
          <h5 className="fw-bold mb-0">Personal & Operation Details</h5>
        </div>

        <Row className="g-3">
          <Col md={6}>
            <div style={styles.infoBox}>
              <div style={styles.label}><FiMail /> Email Address</div>
              <div style={styles.value}>{profile.email || "N/A"}</div>
            </div>
          </Col>
          <Col md={6}>
            <div style={styles.infoBox}>
              <div style={styles.label}><FiPhone /> Phone Number</div>
              <div style={styles.value}>{profile.phone || "Not linked"}</div>
            </div>
          </Col>
          <Col md={6}>
            <div style={styles.infoBox}>
              <div style={styles.label}><FiUser /> Gender</div>
              <div style={styles.value}>{genderText(profile.gender)}</div>
            </div>
          </Col>
          <Col md={6}>
            <div style={styles.infoBox}>
              <div style={styles.label}><FiCalendar /> Date of Birth</div>
              <div style={styles.value}>{profile.birthday || "N/A"}</div>
            </div>
          </Col>
          <Col md={12}>
            <div style={styles.infoBox}>
              <div style={styles.label}><FiMapPin /> Registered Address</div>
              <div style={styles.value}>{profile.address || "Address not provided"}</div>
            </div>
          </Col>
          <Col md={6}>
             <Card className="border-0 h-100 shadow-none" style={{ background: "#1a1a1a", borderRadius: "14px", color: "white" }}>
               <Card.Body className="p-3">
                  <div style={{ ...styles.label, color: "rgba(255,255,255,0.5)" }}><FiTruck /> Vehicle Plate</div>
                  <div className="fs-4 fw-bold mt-1" style={{ letterSpacing: "1px" }}>{profile.vehicle_plate || "N/A"}</div>
               </Card.Body>
             </Card>
          </Col>
          <Col md={6}>
            <div style={styles.infoBox}>
              <div style={styles.label}><FiCreditCard /> Citizen ID</div>
              <div style={styles.value}>{profile.citizen_id || "Unverified"}</div>
            </div>
          </Col>
        </Row>
<div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span className="text-muted small">Account created: {fmtDate(profile.created_at)}</span>
          <span className="text-muted small italic">Last sync: {new Date().toLocaleTimeString()}</span>
        </div>
      </Card>

      <div className="text-center mt-4 text-muted small">
        Note: Please ensure your <b>Vehicle Plate</b> and <b>Phone Number</b> are accurate.
      </div>
    </Container>
  );
}
