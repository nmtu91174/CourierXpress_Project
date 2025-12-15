// src/components/CustomerShipperDetail.jsx

import React, { useEffect, useState } from 'react';
import { Card, Spinner, ListGroup, Alert } from 'react-bootstrap';
import { FaUserShield, FaPhone, FaMotorcycle, FaIdCard, FaClock, FaCheckCircle, FaCarSide } from 'react-icons/fa';

// Màu chủ đạo
const COLOR_PRIMARY = '#004792'; // Xanh đậm
const COLOR_ACCENT = '#E9522F'; // Cam/Đỏ

const API_BASE = "http://localhost:8889/CourierXpress_Project/backend/api";

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


const CustomerShipperDetail = ({ shipperId }) => {
    const [shipper, setShipper] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchShipper = async () => {
            if (!shipperId) {
                setLoading(false);
                return;
            }

            try {
                // Gọi API lấy thông tin công khai của Shipper
                const res = await fetch(`${API_BASE}/shipper/get_shipper_public_info.php?id=${shipperId}`);
                const data = await res.json();

                if (!res.ok || data.status === "error") {
                    throw new Error(data.message || "Không thể tải thông tin shipper.");
                }

                setShipper(data.shipper);
                setError(null);
            } catch (err) {
                console.error("Fetch Shipper Error:", err);
                setError(err.message || "Lỗi kết nối server.");
            } finally {
                setLoading(false);
            }
        };

        fetchShipper();
    }, [shipperId]);

    if (loading) {
        return (
            <Card className="p-3 text-center">
                <Spinner animation="border" size="sm" />
                <p className="mt-2 mb-0">Đang tải thông tin tài xế...</p>
            </Card>
        );
    }

    if (error) {
        return <Alert variant="danger">Lỗi tải thông tin tài xế: {error}</Alert>;
    }

    if (!shipper) {
        return <Alert variant="info">Thông tin tài xế không khả dụng.</Alert>;
    }
    
    // Xử lý logic hiển thị Avatar (Lấy từ DB, dùng ảnh mặc định nếu rỗng)
    // Giả định bạn đã import defaultAvatar (hoặc sử dụng đường dẫn public)
    const displayAvatar = shipper.avatar || '/src/assets/images/avatar.jpg'; 


    return (
        <Card className="shadow-sm border-0" style={{ borderLeft: `5px solid ${COLOR_ACCENT}` }}>
            <Card.Header 
                className="fw-bold text-white" 
                style={{ backgroundColor: COLOR_PRIMARY, borderBottom: `2px solid ${COLOR_ACCENT}` }}
            >
                <FaUserShield className="me-2" /> THÔNG TIN TÀI XẾ
            </Card.Header>
            <Card.Body className="p-0">
                
                {/* Panel Avatar và Tên */}
                <div className="text-center p-3" style={{ borderBottom: '1px solid #eee' }}>
                    <img
                        src={displayAvatar}
                        alt="Avatar"
                        style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${COLOR_ACCENT}` }}
                        className="mb-2"
                    />
                    <h5 className="mb-0 fw-bold" style={{ color: COLOR_PRIMARY }}>
                        {shipper.name || 'Tài xế [Đã gán]'}
                    </h5>
                    <small className="text-muted">ID: {shipper.id} | {shipper.status === 'active' ? <span className="text-success fw-bold"><FaCheckCircle className="me-1" />Đang hoạt động</span> : 'N/A'}</small>
                </div>


                <ListGroup variant="flush">
                    {/* Phone */}
                    <ListGroup.Item>
                        <FaPhone className="text-muted me-2" />
                        <span className="fw-bold">Liên hệ:</span> {shipper.phone || 'Đang cập nhật'}
                    </ListGroup.Item>
                    
                    {/* Vehicle Type (Mới) */}
                    <ListGroup.Item>
                        <FaCarSide className="text-muted me-2" />
                        <span className="fw-bold">Loại xe:</span> {shipper.vehicle_type || 'Xe máy'}
                    </ListGroup.Item>

                    {/* Biển số */}
                    <ListGroup.Item>
                        <FaMotorcycle className="text-muted me-2" />
                        <span className="fw-bold">Biển số:</span> <span className="text-danger fw-bold">{shipper.vehicle_plate || 'N/A'}</span>
                    </ListGroup.Item>

                    {/* Kinh nghiệm */}
                    <ListGroup.Item>
                        <FaClock className="text-muted me-2" />
                        <span className="fw-bold">Kinh nghiệm:</span> {calculateWorkDuration(shipper.created_at)}
                    </ListGroup.Item>
                </ListGroup>
            </Card.Body>
        </Card>
    );
};

export default CustomerShipperDetail;