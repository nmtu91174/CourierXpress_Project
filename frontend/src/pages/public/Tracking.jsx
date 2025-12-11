// src/pages/public/Tracking.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Card
} from "react-bootstrap";

import {
  FaSearch,
  FaShippingFast,
  FaUserShield,
  FaGlobeAsia,
} from "react-icons/fa";

import HeroVideo from "../../components/HeroVideo";

import { featureCardsReveal } from "../../animations/homeAnimation";

const Home = () => {
  const [trackingid, setTrackingid] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    featureCardsReveal();
  }, []);

  const handleSearch = () => {
    if (trackingid.trim()) {
      navigate(`/tracking/${trackingid}`);
    } else {
      alert("Vui lòng nhập mã vận đơn để tra cứu.");
    }
  };

  return (
    <div className="tracking-page">
      <HeroVideo />
      {/* 1. Hero Banner + Tracking Box */}
      <section className="hero-section">
        <div className="tracking-box tracking-box-lux">
          <h3 className="fw-bold mb-4 text-center tracking-title">
            Theo dõi đơn hàng
          </h3>
          <p className="text-muted text-center mb-4 tracking-subtitle">
            Nhập mã vận đơn của bạn để tra cứu hành trình (VD: CX123456)
          </p>

          <Form className="d-flex gap-2 tracking-form">
            <Form.Control
              type="text"
              placeholder="Nhập mã vận đơn..."
              size="lg"
              className="tracking-input"
              value={trackingid}
              onChange={(e) => setTrackingid(e.target.value)}
            />
            <Button
              variant="danger"
              className="btn-spx tracking-btn px-4"
              size="lg"
              onClick={handleSearch}
            >
              <FaSearch /> Search
            </Button>
          </Form>
        </div>
      </section>

      {/* 2. Features Section */}
      <section className="py-5 features-section">
        <Container>
          <h2 className="text-center fw-bold mb-5 section-title-lux">
            Tại sao chọn CourierXpress?
          </h2>

          <Row>
            <Col md={4} className="mb-4">
              <Card className="h-100 border-0 text-center p-4 feature-card">
                <div className="feature-icon-wrap mb-3">
                  <FaShippingFast className="feature-icon" />
                </div>
                <Card.Title className="fw-semibold">Giao hàng siêu tốc</Card.Title>
                <Card.Text className="text-muted">
                  Cam kết giao hàng đúng hẹn với mạng lưới logistics rộng khắp.
                </Card.Text>
              </Card>
            </Col>

            <Col md={4} className="mb-4">
              <Card className="h-100 border-0 text-center p-4 feature-card">
                <div className="feature-icon-wrap mb-3">
                  <FaUserShield className="feature-icon" />
                </div>
                <Card.Title className="fw-semibold">An toàn tuyệt đối</Card.Title>
                <Card.Text className="text-muted">
                  Bảo hiểm hàng hóa 100% và quy trình xử lý chuyên nghiệp.
                </Card.Text>
              </Card>
            </Col>

            <Col md={4} className="mb-4">
              <Card className="h-100 border-0 text-center p-4 feature-card">
                <div className="feature-icon-wrap mb-3">
                  <FaGlobeAsia className="feature-icon" />
                </div>
                <Card.Title className="fw-semibold">Tra cứu thời gian thực</Card.Title>
                <Card.Text className="text-muted">
                  Tracking System giúp bạn biết đơn hàng đang ở đâu.
                </Card.Text>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
      {/* 3. Sitemap */}
      <section className="bg-light py-4 sitemap-section">
        <Container>
          <h5 className="mb-3 fw-semibold">Sitemap</h5>
          <Row className="small">
            <Col>
              <a href="/" className="text-decoration-none text-secondary">
                Trang chủ
              </a>
            </Col>
            <Col>
              <a href="/tracking" className="text-decoration-none text-secondary">
                Tra cứu vận đơn
              </a>
            </Col>
            <Col>
              <a href="/login" className="text-decoration-none text-secondary">
                Đăng nhập Admin/Agent
              </a>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;
