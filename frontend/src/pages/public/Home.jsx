// src/pages/public/Home.jsx
import React from 'react';
import { Form, Button, Container, Row, Col, Card } from 'react-bootstrap';
import { FaSearch, FaShippingFast, FaUserShield, FaGlobeAsia } from 'react-icons/fa';
import HeroVideo from '../../components/HeroVideo';

const Home = () => {
    return (
        <div className="home-page">
            {/* Hero Video Component */}
            <HeroVideo />
            {/* 1. Hero Banner + Tracking Box */}
            <section className="hero-section">
                <div className="tracking-box">
                    <h3 className="fw-bold mb-4 text-center">Theo dõi đơn hàng</h3>
                    <p className="text-muted text-center mb-4">Nhập mã vận đơn của bạn để tra cứu hành trình (VD: CX123456)</p>
                    <Form className="d-flex gap-2">
                        <Form.Control
                            type="text"
                            placeholder="Nhập mã vận đơn..."
                            size="lg"
                            className="border-2"
                        />
                        <Button variant="danger" className="btn-spx px-4" size="lg">
                            <FaSearch /> Tra cứu
                        </Button>
                    </Form>
                </div>
            </section>

            {/* 2. Features Section (Giới thiệu dịch vụ) */}
            <section className="py-5">
                <Container>
                    <h2 className="text-center fw-bold mb-5">Tại sao chọn CourierXpress?</h2>
                    <Row>
                        <Col md={4} className="mb-4">
                            <Card className="h-100 border-0 shadow-sm text-center p-4">
                                <div className="text-spx display-4 mb-3"><FaShippingFast /></div>
                                <Card.Title>Giao hàng siêu tốc</Card.Title>
                                <Card.Text className="text-muted">
                                    Cam kết giao hàng đúng hẹn với mạng lưới logistics rộng khắp.
                                </Card.Text>
                            </Card>
                        </Col>
                        <Col md={4} className="mb-4">
                            <Card className="h-100 border-0 shadow-sm text-center p-4">
                                <div className="text-spx display-4 mb-3"><FaUserShield /></div>
                                <Card.Title>An toàn tuyệt đối</Card.Title>
                                <Card.Text className="text-muted">
                                    Bảo hiểm hàng hóa 100% và quy trình xử lý chuyên nghiệp.
                                </Card.Text>
                            </Card>
                        </Col>
                        <Col md={4} className="mb-4">
                            <Card className="h-100 border-0 shadow-sm text-center p-4">
                                <div className="text-spx display-4 mb-3"><FaGlobeAsia /></div>
                                <Card.Title>Tra cứu thời gian thực</Card.Title>
                                <Card.Text className="text-muted">
                                    Hệ thống Tracking System giúp bạn biết chính xác đơn hàng đang ở đâu.
                                </Card.Text>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* 3. Sitemap Area (Yêu cầu bắt buộc của đề bài [cite: 141, 168]) */}
            <section className="bg-light py-4">
                <Container>
                    <h5 className="mb-3">Sitemap</h5>
                    <Row className="small">
                        <Col><a href="/" className="text-decoration-none text-secondary">Trang chủ</a></Col>
                        <Col><a href="/tracking" className="text-decoration-none text-secondary">Tra cứu vận đơn</a></Col>
                        <Col><a href="/login" className="text-decoration-none text-secondary">Đăng nhập Admin/Agent</a></Col>
                    </Row>
                </Container>
            </section>
        </div>
    );
};

export default Home;