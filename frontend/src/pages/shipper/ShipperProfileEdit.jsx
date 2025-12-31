import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from "react-bootstrap";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
// Icons
import { 
  FiUser, FiPhone, FiMapPin, FiTruck, 
  FiCreditCard, FiUpload, FiSave, FiX, 
  FiArrowLeft, FiRefreshCcw 
} from "react-icons/fi";

const API_BASE = "http://localhost:8891/CourierXpress_Project/backend/api/shipper";

// --- Custom Styles ---
const styles = {
  card: {
    borderRadius: "20px",
    border: "none",
    boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
    background: "#fff",
    overflow: "hidden"
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#888",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#444",
    marginBottom: "8px",
    display: "block"
  },
  input: {
    borderRadius: "12px",
    padding: "12px 15px",
    border: "1px solid #eee",
    fontSize: "14px",
    transition: "all 0.2s ease"
  },
  avatarPreview: {
    width: "120px",
    height: "120px",
    borderRadius: "30px",
    objectFit: "cover",
    border: "4px solid #f8f9fa",
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
  }
};

const ShipperProfileEdit = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const toast = useMemo(() => Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  }), []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/get_profile.php`, { credentials: "include" });
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.message || "Failed to load profile.");
      setProfile(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return toast.fire({ icon: "error", title: "Please select an image." });
    
    try {
      setUploading(true);
      const form = new FormData();
      form.append("avatar", avatarFile);

      const res = await fetch(`${API_BASE}/upload_avatar.php`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      // Nếu PHP vẫn bị lỗi Fatal error, đoạn này sẽ quăng lỗi thay vì crash trang
      if (!res.ok) throw new Error("Server error. Please check PHP logs.");

      const data = await res.json();
if (data.status === "success") {
        toast.fire({ icon: "success", title: "Avatar updated!" });
        
        // Cập nhật đường dẫn ảnh mới từ server trả về
        setProfile(prev => ({ 
          ...prev, 
          avatar: data.data.avatar 
        }));
        
        setAvatarFile(null);
        
        // Không nhất thiết phải await fetchProfile() trừ khi bạn cần đồng bộ các dữ liệu khác
      } else {
        throw new Error(data.message);
      }
    } catch (e) {
      // Bắt lỗi "Unexpected token <" tại đây
      console.error("Upload detail:", e);
      toast.fire({ icon: "error", title: "Upload failed: " + e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/update_profile.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.status === "success") {
        await toast.fire({ icon: "success", title: "Profile updated successfully!" });
        navigate("/shipper/profile");
      } else throw new Error(data.message);
    } catch (err) {
      toast.fire({ icon: "error", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const avatarUrl = useMemo(() => {
    if (!profile?.avatar) return null;
    return profile.avatar.startsWith("http") 
      ? profile.avatar 
      : `http://localhost:8891/CourierXpress_Project${profile.avatar}`;
  }, [profile?.avatar]);

  if (loading) return (
    <Container className="py-5 text-center"><Spinner animation="grow" variant="dark" /></Container>
  );

  return (
    <Container className="py-4" style={{ maxWidth: 980 }}>
      {/* 1. Nút quay về Dashboard (Home) */}
      <div className="mb-3">
        <Button 
          variant="link" 
          className="text-dark p-0 d-flex align-items-center gap-2 text-decoration-none fw-bold"
          onClick={() => navigate("/shipper/home")}
        >
          <FiArrowLeft /> Back to Dashboard
        </Button>
      </div>

      {/* 2. Page Header & Nút quay về Profile */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Edit Profile</h2>
          <p className="text-muted small mb-0">Update your personal information and vehicle details.</p>
        </div>
        <Button 
          variant="light" 
          className="rounded-pill px-4 shadow-sm border" 
          onClick={() => navigate("/shipper/profile")}
        >
          <FiUser size={16} className="me-2" /> View Profile
        </Button>
      </div>

      {error && <Alert variant="danger" className="rounded-4 mb-4 shadow-sm">{error}</Alert>}

      <Row className="g-4">
{/* CỘT TRÁI: AVATAR */}
        <Col lg={4}>
          <Card className="p-4 text-center border-0 shadow-sm mb-4" style={styles.card}>
            <div style={styles.sectionTitle} className="justify-content-center">Profile Picture</div>
            <div className="mb-4 position-relative d-inline-block">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={styles.avatarPreview} />
              ) : (
                <div style={{ ...styles.avatarPreview, background: "#eee", display: "grid", placeItems: "center", fontSize: "40px" }}>
                  {profile?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <Form.Group className="mb-3">
              <Form.Control 
                type="file" 
                size="sm" 
                accept="image/*" 
                className="rounded-pill"
                onChange={(e) => setAvatarFile(e.target.files?.[0])}
              />
            </Form.Group>
            <Button 
              variant="dark" 
              className="w-100 rounded-pill py-2 shadow-sm" 
              onClick={uploadAvatar}
              disabled={uploading || !avatarFile}
            >
              {uploading ? <Spinner size="sm" /> : <><FiUpload className="me-2" /> Update Photo</>}
            </Button>
          </Card>
        </Col>

        {/* CỘT PHẢI: FORM DỮ LIỆU */}
        <Col lg={8}>
          <Form onSubmit={handleSubmit}>
            <Card className="p-4 border-0 shadow-sm mb-4" style={styles.card}>
              <div style={styles.sectionTitle}><FiUser /> Personal Details</div>
              <Row className="g-3">
                <Col md={6}>
                  <label style={styles.label}>Full Name</label>
                  <Form.Control
                    style={styles.input}
                    value={profile?.name || ""}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <label style={styles.label}>Email (Read-only)</label>
                  <Form.Control style={{...styles.input, background: "#f8f9fa"}} value={profile?.email || ""} disabled />
                </Col>
                <Col md={6}>
                  <label style={styles.label}>Phone Number</label>
                  <Form.Control
                    style={styles.input}
                    value={profile?.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <label style={styles.label}>Gender</label>
                  <Form.Select
                    style={styles.input}
                    value={profile?.gender || ""}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
<option value="female">Female</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <label style={styles.label}>Birthday</label>
                  <Form.Control
                    type="date"
                    style={styles.input}
                    value={profile?.birthday || ""}
                    onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <label style={styles.label}>Address</label>
                  <Form.Control
                    style={styles.input}
                    value={profile?.address || ""}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                </Col>
              </Row>
            </Card>

            <Card className="p-4 border-0 shadow-sm mb-4" style={styles.card}>
              <div style={styles.sectionTitle}><FiTruck /> Operations & ID</div>
              <Row className="g-3">
                <Col md={6}>
                  <label style={styles.label}>Vehicle Plate Number</label>
                  <Form.Control
                    style={styles.input}
                    value={profile?.vehicle_plate || ""}
                    onChange={(e) => setProfile({ ...profile, vehicle_plate: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <label style={styles.label}>Citizen ID (CCCD)</label>
                  <Form.Control
                    style={styles.input}
                    value={profile?.citizen_id || ""}
                    onChange={(e) => setProfile({ ...profile, citizen_id: e.target.value })}
                  />
                </Col>
              </Row>
            </Card>

            {/* CÁC NÚT THAO TÁC */}
            <div className="d-flex justify-content-end gap-3">
              <Button 
                variant="white" 
                className="rounded-pill px-4 shadow-sm border" 
                onClick={fetchProfile}
                disabled={saving}
              >
                <FiRefreshCcw className="me-2" /> Reset
              </Button>
              <Button 
                variant="outline-danger" 
                className="rounded-pill px-4 shadow-sm" 
                onClick={() => navigate("/shipper/profile")}
                disabled={saving}
              >
                <FiX className="me-2" /> Cancel
              </Button>
              <Button 
                variant="dark" 
                type="submit" 
                className="rounded-pill px-5 shadow-sm" 
                disabled={saving}
                style={{ background: "#1a1a1a", fontWeight: "700" }}
              >
                {saving ? <Spinner size="sm" /> : <><FiSave className="me-2" /> Save Changes</>}
              </Button>
</div>
          </Form>
        </Col>
      </Row>

      <div className="text-center mt-5 text-muted small">
        Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : "N/A"}
      </div>
    </Container>
  );
};

export default ShipperProfileEdit;
