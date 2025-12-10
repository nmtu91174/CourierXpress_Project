// src/pages/shipper/HomePageShipper.jsx 

import React, { useEffect } from "react";
import { Container, Row, Col, Card, Button, Table } from "react-bootstrap";
import { FaMotorcycle, FaTasks, FaCheckCircle, FaClock } from "react-icons/fa";

// 👉 IMPORT CSS ĐÚNG ĐƯỜNG DẪN BẠN YÊU CẦU
import "../../assets/styles/shipper/HomePageShipper.css";

const ShipperHome = () => {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="shipper-home-page">
      <Container className="py-4">

        {/* Greeting */}
        <h2 className="fw-bold mb-3">
          👋 Chào Shipper, chúc bạn một ngày giao hàng thuận lợi!
        </h2>
        <p className="text-muted mb-4">
          Dưới đây là tổng quan công việc của bạn hôm nay.
        </p>

        {/* Dashboard Stats */}
        <Row className="mb-4">
          <Col md={4}>
            <Card className="shadow-sm p-3 stat-card">
              <FaTasks size={35} className="text-primary mb-2" />
              <h5 className="fw-bold">Đơn cần giao</h5>
              <p className="text-muted">8 đơn đang chờ xử lý</p>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="shadow-sm p-3 stat-card">
              <FaClock size={35} className="text-warning mb-2" />
              <h5 className="fw-bold">Đang giao</h5>
              <p className="text-muted">3 đơn đang vận chuyển</p>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="shadow-sm p-3 stat-card">
              <FaCheckCircle size={35} className="text-success mb-2" />
              <h5 className="fw-bold">Đã hoàn thành</h5>
              <p className="text-muted">12 đơn giao thành công</p>
            </Card>
          </Col>
        </Row>

        {/* Action Button */}
        <Card className="p-4 shadow-sm mb-4">
          <h5 className="fw-bold mb-3">🚀 Nhận đơn mới</h5>
          <Button variant="danger" className="px-4 py-2">
            <FaMotorcycle className="me-2" />
            Tìm đơn giao ngay
          </Button>
        </Card>

        {/* Orders List */}
        <Card className="shadow-sm p-4 order-list-card">
          <h5 className="fw-bold mb-3">📦 Đơn hàng hôm nay</h5>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách nhận</th>
                <th>Địa chỉ</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CX90871</td>
                <td>Nguyễn Minh T</td>
                <td>Quận 7, TP.HCM</td>
                <td>
                  <span className="text-warning fw-bold">Đang giao</span>
                </td>
                <td>
                  <Button size="sm" variant="outline-primary">
                    Xem
                  </Button>
                </td>
              </tr>

              <tr>
                <td>CX77124</td>
                <td>Trần Hoài B</td>
                <td>Quận 3, TP.HCM</td>
                <td>
                  <span className="text-success fw-bold">Hoàn thành</span>
                </td>
                <td>
                  <Button size="sm" variant="outline-primary">
                    Xem
                  </Button>
                </td>
              </tr>

              <tr>
                <td>CX55689</td>
                <td>Phạm Quỳnh A</td>
                <td>Thủ Đức, TP.HCM</td>
                <td>
                  <span className="text-primary fw-bold">Chờ nhận</span>
                </td>
                <td>
                  <Button size="sm" variant="outline-primary">
                    Nhận đơn
                  </Button>
                </td>
              </tr>

            </tbody>
          </Table>
        </Card>
      </Container>
    </div>
  );
};

export default ShipperHome;
