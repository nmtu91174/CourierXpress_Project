// frontend/src/pages/shipper/OrderDetailShipper.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Card, Row, Col, Button, Spinner, Alert, ListGroup } from "react-bootstrap";
import { FaBoxOpen, FaUser, FaMapMarkerAlt, FaRuler, FaWeightHanging, FaMoneyBillWave, FaCheckCircle, FaTruck } from "react-icons/fa";
import Swal from "sweetalert2";
import axios from "axios";

// Thay đổi URL API PHP của bạn
const API_URL = "http://localhost:8888/api/shipper.php";

const OrderDetailShipper = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Order Detail (2.1.4)
    const fetchOrderDetail = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}?action=order_detail&order_id=${id}`);
            setOrder(res.data.data);
            setError(null);
        } catch (err) {
            console.error("Lỗi khi tải chi tiết đơn hàng:", err);
            setError("Không thể tải chi tiết đơn hàng. Vui lòng kiểm tra mã đơn hoặc kết nối mạng.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    // Xử lý xác nhận nhận đơn (2.2.5)
    const handleConfirmPickup = async () => {
        setIsSubmitting(true);
        try {
            // Gọi API PUT: action=confirm_pickup (Gói 2.2.4)
            const res = await axios.put(`${API_URL}?action=confirm_pickup`, { order_id: id });

            if (res.data.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: res.data.message,
                    timer: 2000,
                    showConfirmButton: false,
                });

                // Điều hướng sang trang Đang Giao (DeliveryInProgress)
                navigate('/shipper/on-the-way');
            } else {
                Swal.fire('Lỗi', res.data.message || 'Xác nhận thất bại.', 'error');
            }
        } catch (err) {
            console.error("Lỗi khi xác nhận nhận đơn:", err);
            Swal.fire('Lỗi Server', 'Không thể kết nối hoặc đơn hàng không hợp lệ.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;
    if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!order) return <Container className="py-5"><Alert variant="warning">Không tìm thấy thông tin đơn hàng.</Alert></Container>;

    // Kiểm tra nếu đơn hàng đã được Shipper này nhận rồi (Status 4 hoặc 5)
    const isReadyForPickup = order.status === 2;
    const isPickedUp = order.status === 4 || order.status === 5;


    return (
        <Container className="py-5">
            <h2 className="fw-bold mb-4">Chi tiết Đơn hàng: {order.order_code}</h2>

            <Row className="g-4">
                {/* CỘT TRÁI: THÔNG TIN GỬI/NHẬN & HÀNH ĐỘNG */}
                <Col md={7}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-danger text-white fw-bold"><FaMapMarkerAlt className="me-2" /> Thông tin Giao nhận</Card.Header>
                        <Card.Body>
                            <Row>
                                {/* NGƯỜI GỬI */}
                                <Col md={6}>
                                    <h6 className="fw-bold text-primary">Người Gửi (Khách hàng)</h6>
                                    <p><strong>{order.sender_name}</strong> ({order.customer_name})</p>
                                    <p className="small text-muted mb-0">SĐT: {order.sender_phone}</p>
                                    <p className="small text-muted">{order.sender_address}</p>
                                </Col>
                                {/* NGƯỜI NHẬN */}
                                <Col md={6}>
                                    <h6 className="fw-bold text-success">Người Nhận</h6>
                                    <p><strong>{order.receiver_name}</strong></p>
                                    <p className="small text-muted mb-0">SĐT: {order.receiver_phone}</p>
                                    <p className="small text-muted">{order.receiver_address}</p>
                                </Col>
                            </Row>
                            <hr />
                            {/* HÀNH ĐỘNG */}
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <h5 className="m-0">Trạng thái: <span className={`fw-bold ${isReadyForPickup ? 'text-warning' : 'text-success'}`}>{order.status_desc}</span></h5>

                                {isReadyForPickup && (
                                    <Button
                                        variant="success"
                                        onClick={handleConfirmPickup}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <><Spinner as="span" size="sm" animation="border" role="status" aria-hidden="true" className="me-2" /> Đang xử lý...</>
                                        ) : (
                                            <><FaCheckCircle className="me-2" /> Xác nhận NHẬN ĐƠN</>
                                        )}
                                    </Button>
                                )}

                                {isPickedUp && (
                                    <Button variant="info" disabled>
                                        <FaTruck className="me-2" /> Đã nhận - Đang giao
                                    </Button>
                                )}
                            </div>
                        </Card.Body>
                    </Card>

                    {/* HÌNH ẢNH BAN ĐẦU (NẾU CÓ) */}
                    {order.images && order.images.length > 0 && (
                        <Card className="shadow-sm border-0">
                            <Card.Header className="fw-bold"><FaBoxOpen className="me-2" /> Ảnh Đơn Hàng (Khách cung cấp)</Card.Header>
                            <Card.Body>
                                <Row>
                                    {order.images.map((img, index) => (
                                        <Col key={index} md={6} className="mb-3">
                                            <img
                                                src={img.image_url}
                                                alt={`Order proof ${img.type}`}
                                                style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                                            />
                                            <p className="small text-center mt-1 text-muted">Loại: {img.type} | Tạo lúc: {new Date(img.created_at).toLocaleString()}</p>
                                        </Col>
                                    ))}
                                </Row>
                            </Card.Body>
                        </Card>
                    )}
                </Col>

                {/* CỘT PHẢI: THÔNG TIN HÀNG HÓA & CƯỚC PHÍ */}
                <Col md={5}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="fw-bold"><FaBoxOpen className="me-2" /> Chi tiết Hàng hóa</Card.Header>
                        <ListGroup variant="flush">
                            <ListGroup.Item>
                                <FaBoxOpen className="me-2 text-primary" /> Tên hàng: <strong>{order.item_name}</strong>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <FaWeightHanging className="me-2 text-danger" /> Cân nặng (Khai báo): <strong>{order.weight} kg</strong>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <FaRuler className="me-2 text-secondary" /> Kích thước: {order.length} x {order.width} x {order.height} cm
                            </ListGroup.Item>
                            <ListGroup.Item>
                                Ghi chú khách hàng: <em>{order.notes || "Không có ghi chú."}</em>
                            </ListGroup.Item>
                        </ListGroup>
                    </Card>

                    <Card className="shadow-sm border-0">
                        <Card.Header className="fw-bold"><FaMoneyBillWave className="me-2" /> Chi phí & Thu hộ (COD)</Card.Header>
                        <Card.Body>
                            <p className="d-flex justify-content-between">
                                <span>Phí Vận chuyển (Gross)</span>
                                <strong className="text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_shipping_fee)}</strong>
                            </p>
                            <p className="d-flex justify-content-between">
                                <span>Tiền Thu Hộ (COD)</span>
                                <strong className="text-danger">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.cod_amount)}</strong>
                            </p>
                            <p className="d-flex justify-content-between border-top pt-2">
                                <span>**Tổng tiền cần thu (Nếu có COD)**</span>
                                <strong className="fs-5 text-success">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.cod_amount + order.total_shipping_fee)}
                                </strong>
                            </p>

                            <h6 className="mt-3 fw-bold">Chi tiết cước phí:</h6>
                            <ListGroup variant="flush" className="small">
                                {order.fees.map((fee, index) => (
                                    <ListGroup.Item key={index} className="d-flex justify-content-between">
                                        <span>{fee.name}</span>
                                        <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(fee.amount)}</span>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default OrderDetailShipper;