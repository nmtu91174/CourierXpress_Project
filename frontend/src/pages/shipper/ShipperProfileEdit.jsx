import React, { useEffect, useState } from "react";
import { Container, Form, Button, Card, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import defaultAvatar from '../../assets/images/avatar.jpg';

// ❌ ĐƯỜNG DẪN ẢNH MẶC ĐỊNH TRUNG LẬP GIỚI TÍNH CỦA BẠN (TRONG THƯ MỤC ASSETS)
const DEFAULT_AVATAR_PATH = defaultAvatar;

// Định nghĩa hàm tính toán thời gian (giữ nguyên)
const calculateWorkDuration = (createdAt) => {
    if (!createdAt) return "Chưa rõ";
    
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    let result = "";
    if (years > 0) result += `${years} năm `;
    if (months > 0) result += `${months} tháng `;

    return result.trim() || "Chưa đầy 1 tháng";
};

const API_BASE = "http://localhost:8889/CourierXpress_Project/backend/api";

const ShipperProfileEdit = () => {
    const navigate = useNavigate();

    // --- (PHẦN KIỂM TRA ĐĂNG NHẬP VÀ ROLE GIỮ NGUYÊN) ---
    const userJSON = localStorage.getItem("user");
    if (!userJSON) {
      alert("Bạn chưa đăng nhập!");
      navigate("/login");
      return null;
    }

    let user;
    try {
      user = JSON.parse(userJSON);
    } catch (e) {
      alert("Dữ liệu đăng nhập bị lỗi!");
      localStorage.removeItem("user");
      navigate("/login");
      return null;
    }

    if (!user.id || user.role !== "shipper") {
      alert("Không có quyền truy cập trang này (không phải tài khoản shipper hoặc thiếu ID)");
      navigate("/no-permission");
      return null;
    }
    // -----------------------------------------------------

    const [form, setForm] = useState({
      name: "",
      phone: "",
      address: "",
      citizen_id: "",
      vehicle_plate: "",
      avatar: "",
      created_at: "",
      // ✅ BỔ SUNG TRƯỜNG MỚI:
      vehicle_type: "", 
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [loading, setLoading] = useState(true);

    // ===== LOAD INFO (Cập nhật để lấy vehicle_type) =====
    useEffect(() => {
        const loadShipper = async () => {
            try {
                // Giữ nguyên credentials: 'include' cho request GET nếu cần session
                const res = await fetch(
                    `${API_BASE}/shipper/get_shipper_info.php?id=${user.id}`,
                    { credentials: 'include' } 
                );

                const text = await res.text();

                if (!res.ok) {
                    console.error("API error:", text);
                    return;
                }

                const data = JSON.parse(text);

                if (data.status === "success") {
                    setForm({
                        name: data.shipper.name ?? "",
                        phone: data.shipper.phone ?? "",
                        address: data.shipper.address ?? "",
                        citizen_id: data.shipper.citizen_id ?? "",
                        vehicle_plate: data.shipper.vehicle_plate ?? "",
                        avatar: data.shipper.avatar ?? "", 
                        created_at: data.shipper.created_at ?? "", 
                        // ✅ LẤY TRƯỜNG MỚI:
                        vehicle_type: data.shipper.vehicle_type ?? "Motorcycle", 
                    });
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error("Fetch shipper error:", err);
                alert("Không thể tải thông tin shipper");
            } finally {
                setLoading(false);
            }
        };

        loadShipper();
    }, [user.id]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        
        if (name === "avatarFile" && files.length > 0) {
            setAvatarFile(files[0]);
        } else if (name !== "avatarFile") {
            setForm({ ...form, [name]: value });
        }
    };

    // ===== SUBMIT (Cập nhật để gửi vehicle_type) =====
    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('id', user.id);
        formData.append('name', form.name);
        formData.append('phone', form.phone);
        formData.append('address', form.address);
        formData.append('citizen_id', form.citizen_id);
        formData.append('vehicle_plate', form.vehicle_plate);
        // ✅ GỬI TRƯỜNG MỚI:
        formData.append('vehicle_type', form.vehicle_type); 
        
        if (avatarFile) {
            formData.append('avatarFile', avatarFile);
        } else {
            formData.append('avatar', form.avatar); 
        }

        try {
            const res = await fetch(
                `${API_BASE}/shipper/update_shipper.php`,
                {
                    method: "POST",
                    body: formData, 
                    credentials: 'include',
                }
            );

            const text = await res.text();

            if (!res.ok) {
                console.error("Update error:", text);
                try {
                    const errorData = JSON.parse(text);
                    alert(`Lỗi cập nhật: ${errorData.message}`);
                } catch {
                    alert("Lỗi Server không xác định. Vui lòng kiểm tra console.");
                }
                return;
            }

            const data = JSON.parse(text);

            if (data.status === "success") {
                // ✅ CẬP NHẬT LOCALSTORAGE VỚI CẢ TRƯỜNG vehicle_type MỚI
                localStorage.setItem(
                    "user",
                    JSON.stringify({ 
                        ...user, 
                        ...form, 
                        avatar: data.user_data?.avatar ?? form.avatar,
                        vehicle_type: data.user_data?.vehicle_type ?? form.vehicle_type
                    })
                );
                alert("Cập nhật thành công");
                navigate("/shipper/home");
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error("Submit error:", err);
            alert("Không thể kết nối server");
        }
    };

    if (loading) {
        return <p className="text-center mt-5">Đang tải dữ liệu…</p>;
    }
    
    // ❌ LOGIC HIỂN THỊ AVATAR (Ưu tiên: File mới > URL cũ > URL Mặc định)
    const displayAvatar = avatarFile 
        ? URL.createObjectURL(avatarFile) 
        : (form.avatar || DEFAULT_AVATAR_PATH); 

    return (
        // 1. CHỈNH SỬA TÔNG MÀU: Áp dụng nền xanh đậm (mô phỏng)
        <div style={{ backgroundColor: '#004792', minHeight: '100vh' }}>
            <Container className="py-5">
                <Card 
                    className="p-4 shadow-lg"
                    // 2. CARD MỜ VÀ BORDER TRẮNG
                    style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        borderRadius: '15px',
                        border: '1px solid rgba(255, 255, 255, 0.5)'
                    }}
                >
                    <h4 className="fw-bold mb-4" style={{ color: '#E9522F' }}>Cập nhật Hồ sơ Shipper</h4>

                    {/* HIỂN THỊ AVATAR VÀ THỜI GIAN LÀM VIỆC */}
                    <Row className="align-items-center mb-4">
                        <Col xs={12} md={3} className="text-center">
                            <img
                                src={displayAvatar} // SỬ DỤNG LOGIC DISPLAY AVATAR MỚI
                                alt="avatar"
                                style={{ width: 100, height: 100, borderRadius: "50%", border: '3px solid #E9522F', objectFit: 'cover' }}
                                className="mb-2"
                            />
                        </Col>
                        <Col xs={12} md={9}>
                            <p className="mb-1 text-muted">Tham gia từ: {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}</p>
                            <h5>
                                Thời gian đã làm việc: 
                                <span className="fw-bold ms-2" style={{ color: '#004792' }}>
                                    {calculateWorkDuration(form.created_at)}
                                </span>
                            </h5>
                        </Col>
                    </Row>


                    <Form onSubmit={handleSubmit}>
                        {/* 3. TRƯỜNG NHẬP THÔNG TIN */}
                        {["name", "phone", "address", "citizen_id", "vehicle_plate"].map(
                            (field) => (
                                <Form.Group className="mb-3" key={field}>
                                    <Form.Label className="fw-bold">{field.replace('_', ' ').toUpperCase()}</Form.Label>
                                    <Form.Control
                                        name={field}
                                        value={form[field]}
                                        onChange={handleChange}
                                        placeholder={`Nhập ${field.replace('_', ' ')}`}
                                    />
                                </Form.Group>
                            )
                        )}
                        
                        {/* ❌ FORM GROUP CHO LOẠI XE MỚI */}
                        <Form.Group className="mb-3" key="vehicle_type">
                            <Form.Label className="fw-bold">LOẠI XE</Form.Label>
                            <Form.Select
                                name="vehicle_type"
                                value={form.vehicle_type}
                                onChange={handleChange}
                            >
                                <option value="Motorcycle">Xe máy</option>
                                <option value="Light Truck">Xe tải nhẹ (Dưới 1 tấn)</option>
                                <option value="Bicycle">Xe đạp</option>
                                <option value="">Khác/Chưa xác định</option>
                            </Form.Select>
                        </Form.Group>


                        {/* TRƯỜNG AVATAR FILE INPUT (Giữ nguyên) */}
                        <Form.Group className="mb-4" key="avatar-upload">
                            <Form.Label className="fw-bold">Ảnh đại diện (Avatar)</Form.Label>
                            <Form.Control
                                type="file"
                                name="avatarFile"
                                onChange={handleChange}
                                accept="image/*"
                            />
                            <Form.Text className="text-muted">
                                Chọn file ảnh mới để cập nhật. Kích thước tối đa 2MB. Ảnh không bắt buộc, nếu không chọn, ảnh cũ sẽ được giữ lại hoặc dùng ảnh mặc định.
                            </Form.Text>
                        </Form.Group>


                        <Button 
                            type="submit" 
                            variant="primary"
                            // 4. NÚT SUBMIT THEO TÔNG MÀU (CAM/ĐỎ)
                            style={{ 
                                backgroundColor: '#E9522F', 
                                border: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            Lưu Thay đổi (Cập nhật Profile)
                        </Button>
                    </Form>
                </Card>
            </Container>
        </div>
    );
};

export default ShipperProfileEdit;