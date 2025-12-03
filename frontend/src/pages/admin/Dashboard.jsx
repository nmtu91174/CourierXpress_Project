// frontend/src/pages/admin/Dashboard.jsx
import React from 'react';
import { Card, Table, Badge, Button, Row, Col } from 'react-bootstrap';
import { FaBox, FaShippingFast, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const Dashboard = () => {
    return (
        <div className="container-fluid p-0">
            {/* 1. PHẦN THỐNG KÊ (STATS CARDS) - Làm đẹp thêm */}
            <Row className="mb-4 g-3">
                <Col md={3}>
                    <Card className="border-0 shadow-sm text-white" style={{ backgroundColor: '#0d6efd' }}>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-0">Tổng đơn hàng</h6>
                                    <h3 className="fw-bold my-2">150</h3>
                                </div>
                                <FaBox className="fs-1 opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm text-white" style={{ backgroundColor: '#ffc107' }}>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-0 text-dark">Đang vận chuyển</h6>
                                    <h3 className="fw-bold my-2 text-dark">45</h3>
                                </div>
                                <FaShippingFast className="fs-1 text-dark opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm text-white" style={{ backgroundColor: '#198754' }}>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-0">Đã giao thành công</h6>
                                    <h3 className="fw-bold my-2">98</h3>
                                </div>
                                <FaCheckCircle className="fs-1 opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm text-white" style={{ backgroundColor: '#dc3545' }}>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-0">Đơn bị hủy</h6>
                                    <h3 className="fw-bold my-2">7</h3>
                                </div>
                                <FaExclamationTriangle className="fs-1 opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* 2. HEADER CỦA BẢNG */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold text-dark">Đơn hàng gần đây</h4>
                <Button variant="success" size="sm">+ Tạo vận đơn mới</Button>
            </div>

            {/* 3. BẢNG DỮ LIỆU TĨNH (STATIC TABLE) */}
            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                    <Table hover responsive className="m-0 align-middle">
                        <thead className="bg-light text-secondary">
                            <tr>
                                <th className="ps-4">Mã Vận Đơn</th>
                                <th>Người Gửi</th>
                                <th>Người Nhận</th>
                                <th>Ngày Tạo</th>
                                <th>Trạng Thái</th>
                                <th>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Dữ liệu giả 1 */}
                            <tr>
                                <td className="ps-4 fw-bold text-primary">CX123456</td>
                                <td>Nguyễn Văn A</td>
                                <td>Trần Thị B</td>
                                <td>03/12/2025</td>
                                <td><Badge bg="primary">Booked</Badge></td>
                                <td>
                                    <Button variant="outline-secondary" size="sm" className="me-2">Chi tiết</Button>
                                </td>
                            </tr>
                            {/* Dữ liệu giả 2 */}
                            <tr>
                                <td className="ps-4 fw-bold text-primary">CX789012</td>
                                <td>Lê Văn C</td>
                                <td>Phạm Thị D</td>
                                <td>02/12/2025</td>
                                <td><Badge bg="warning" text="dark">In Transit</Badge></td>
                                <td>
                                    <Button variant="outline-secondary" size="sm" className="me-2">Chi tiết</Button>
                                </td>
                            </tr>
                            {/* Dữ liệu giả 3 */}
                            <tr>
                                <td className="ps-4 fw-bold text-primary">CX456123</td>
                                <td>Công ty XYZ</td>
                                <td>Kho Hà Nội</td>
                                <td>01/12/2025</td>
                                <td><Badge bg="success">Delivered</Badge></td>
                                <td>
                                    <Button variant="outline-secondary" size="sm" className="me-2">Chi tiết</Button>
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
                <Card.Footer className="bg-white border-0 py-3 text-end">
                    <Button variant="link" className="text-decoration-none">Xem tất cả đơn hàng &rarr;</Button>
                </Card.Footer>
            </Card>
        </div>
    );
};

export default Dashboard;