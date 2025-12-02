// src/components/Footer.jsx
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="bg-light pt-5 pb-3 border-top mt-5">
      <Container>
        <Row>
          <Col md={4}>
            <h5 className="text-spx fw-bold">CourierXpress</h5>
            <p className="text-muted small">
              Giải pháp vận chuyển nhanh chóng, an toàn và tin cậy cho mọi nhu cầu của bạn.
            </p>
          </Col>
          <Col md={4}>
            <h6 className="fw-bold">Liên kết nhanh</h6>
            <ul className="list-unstyled text-muted small">
              <li>Về chúng tôi</li>
              <li>Dịch vụ</li>
              <li>Điều khoản sử dụng</li>
            </ul>
          </Col>
          <Col md={4}>
             <h6 className="fw-bold">Liên hệ</h6>
             <p className="text-muted small">Hà Nội, Việt Nam</p>
          </Col>
        </Row>
        <hr />
        <p className="text-center small text-muted">© 2025 CourierXpress Project. All rights reserved.</p>
      </Container>
    </footer>
  );
};

export default Footer;