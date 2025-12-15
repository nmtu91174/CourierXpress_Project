// src/pages/user/OrderDetailPage.jsx

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button, ListGroup } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaMapMarkerAlt, FaCalendarAlt, FaBarcode, FaTruckLoading, FaRulerCombined } from 'react-icons/fa';

// Import các components đã được style
import OrderTimeline from '../../components/OrderTimeline';
import CustomerShipperDetail from '../../components/CustomerShipperDetail';

// Màu chủ đạo
const COLOR_PRIMARY = '#004792'; // Xanh đậm
const COLOR_ACCENT = '#E9522F'; // Cam/Đỏ

const API_BASE = "http://localhost:8889/CourierXpress_Project/backend/api";

const OrderDetailPage = () => {
    // Giả định bạn đã cấu hình Route là /user/orders/:id
    const { id } = useParams(); 
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP ---
    const userJSON = localStorage.getItem("user");
    let user;
    try {
        user = JSON.parse(userJSON);
    } catch {
        user = {};
    }
    // ------------------------------------------

    useEffect(() => {
        if (!id) {
            setError("Thiếu ID đơn hàng.");
            setLoading(false);
            return;
        }
        
        // ID người dùng đang đăng nhập
        const userId = user?.id; 
        
        const fetchOrderDetail = async () => {
            try {
                // Request GET Chi tiết đơn hàng, cần gửi ID người dùng để Backend xác thực quyền
                const res = await fetch(
                    `${API_BASE}/order/get_order_detail.php?order_id=${id}&user_id=${userId}`,
                    { credentials: 'include' }
                );

                const data = await res.json();

                if (!res.ok || data.status === "error") {
                    throw new Error(data.message || "Không thể tải chi tiết đơn hàng.");
                }

                setOrder(data.order_detail);
                setError(null);
            } catch (err) {
                console.error("Fetch Order Detail Error:", err);
                setError(err.message || "Lỗi kết nối server.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetail();
    }, [id, user.id]);

    if (loading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" style={{ color: COLOR_PRIMARY }} />
                <p className="mt-3">Đang tải chi tiết đơn hàng...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-5">
                <Alert variant="danger" className="text-center">
                    <h5>{error}</h5>
                    <p className="mb-0">Vui lòng kiểm tra lại ID đơn hàng và quyền truy cập.</p>
                </Alert>
                <div className="text-center">
                    <Button variant="outline-secondary" onClick={() => navigate(-1)}>Quay lại</Button>
                </div>
            </Container>
        );
    }
    
    // Đảm bảo dữ liệu đơn hàng tồn tại
    if (!order) return null;


    return (
        <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Container className="py-5">
                <h2 className="mb-4 fw-bold" style={{ color: COLOR_PRIMARY }}>
                    <FaBarcode className="me-2" style={{ color: COLOR_ACCENT }} />
                    Theo Dõi Đơn Hàng #{order.order_code}
                </h2>

                <Row className="mb-4">
                    <Col>
                        {/* Thanh Tiến Trình (Sử dụng component đã được style) */}
                        <Card className="shadow-sm p-4 border-0">
                            <OrderTimeline currentStatus={order.current_status_code} />
                            <small className="mt-3 text-muted">Cập nhật lần cuối: {order.last_status_time}</small>
                        </Card>
                    </Col>
                </Row>
                
                <Row>
                    {/* Cột Chi tiết Đơn hàng và Phí */}
                    <Col lg={8} className="mb-4">
                        <Card className="shadow-sm border-0">
                            <Card.Header 
                                className="fw-bold text-white" 
                                style={{ backgroundColor: COLOR_PRIMARY }}
                            >
                                <FaBoxOpen className="me-2" /> CHI TIẾT GÓI HÀNG
                            </Card.Header>
                            <Card.Body>
                                {/* Thông tin Gói hàng */}
                                <ListGroup variant="flush" className="mb-4">
                                    <ListGroup.Item>
                                        <FaTruckLoading className="text-muted me-2" />
                                        <span className="fw-bold">Loại dịch vụ:</span> {order.service_type_name}
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <FaRulerCombined className="text-muted me-2" />
                                        <span className="fw-bold">Kích thước (D/R/C):</span> {order.length} / {order.width} / {order.height} (cm)
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <span className="fw-bold me-2">Trọng lượng:</span> <span className="text-danger fw-bold">{order.weight} kg</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <span className="fw-bold me-2">Ghi chú:</span> {order.notes || 'Không có'}
                                    </ListGroup.Item>
                                </ListGroup>

                                {/* Thông tin Địa chỉ */}
                                <Row>
                                    <Col md={6}>
                                        <h6 className="fw-bold mb-3" style={{ color: COLOR_ACCENT }}><FaMapMarkerAlt /> Người Gửi</h6>
                                        <p className="mb-1"><strong>{order.sender_name}</strong> - {order.sender_phone}</p>
                                        <p className="text-muted">{order.sender_address}</p>
                                    </Col>
                                    <Col md={6}>
                                        <h6 className="fw-bold mb-3" style={{ color: COLOR_ACCENT }}><FaMapMarkerAlt /> Người Nhận</h6>
                                        <p className="mb-1"><strong>{order.receiver_name}</strong> - {order.receiver_phone}</p>
                                        <p className="text-muted">{order.receiver_address}</p>
                                    </Col>
                                </Row>
                                
                                {/* Tổng quan Phí */}
                                <div className="mt-4 pt-3 border-top">
                                    <h5 className="fw-bold" style={{ color: COLOR_PRIMARY }}>Tổng Kết Thanh Toán</h5>
                                    <ListGroup variant="flush">
                                        <ListGroup.Item className="d-flex justify-content-between">
                                            <span>Tổng Phí Vận Chuyển:</span>
                                            <span className="fw-bold text-danger">{order.total_shipping_fee.toLocaleString()} VNĐ</span>
                                        </ListGroup.Item>
                                        <ListGroup.Item className="d-flex justify-content-between">
                                            <span>Thu Hộ (COD):</span>
                                            <span className="fw-bold text-success">{order.cod_amount.toLocaleString()} VNĐ</span>
                                        </ListGroup.Item>
                                        <ListGroup.Item className="d-flex justify-content-between bg-light">
                                            <span className="fw-bold">Tổng thanh toán:</span>
                                            <span className="fw-bold" style={{ color: COLOR_PRIMARY }}>{order.total_amount.toLocaleString()} VNĐ</span>
                                        </ListGroup.Item>
                                    </ListGroup>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    
                    {/* Cột Thông tin Shipper */}
                    <Col lg={4} className="mb-4">
                        {/* Thông tin Shipper (Sử dụng component đã được style) */}
                        <CustomerShipperDetail shipperId={order.shipper_id} />
                        
                        {/* Trạng thái thanh toán (Nếu có logic invoice) */}
                        <Card className="shadow-sm mt-3 p-3">
                            <p className="mb-1 fw-bold text-muted">Trạng thái Thanh toán</p>
                            <h5 className="text-success fw-bold">Đã thanh toán (Ví dụ)</h5> 
                            <small>Phương thức: Tiền mặt</small>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default OrderDetailPage;