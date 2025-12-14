import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner } from "react-bootstrap";
import { FaTruck, FaCheckCircle, FaBox } from "react-icons/fa";
import axios from "axios";
import Swal from "sweetalert2";
import styles from "../../assets/styles/TrackingResult.module.css"; 

const TrackingResult = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`http://localhost:8888/getOrder.php?order_code=${id}`);
        if (res.data.status === "success") {
          setOrder(res.data.order);
        } else {
          Swal.fire("Lỗi", res.data.message, "error");
        }
      } catch (error) {
        console.error(error);
        Swal.fire("Lỗi", "Không thể kết nối server", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
  if (!order) return null;

  const formatCurrency = (value) => (value != null ? value.toLocaleString("vi-VN") : "0");

  return (
    <Container className={`py-5 ${styles.container}`}>
      <h2 className={`fw-bold mb-4 ${styles.heading}`}>
        Mã vận đơn: <span className={styles.highlight}>{order.order_code}</span>
      </h2>

      <Row>
        {/* Thông tin người gửi/nhận */}
        <Col xs={12} md={4} className="mb-4">
          <Card className={`shadow-sm border-0 h-100 ${styles.card}`}>
            <Card.Header className={`${styles.cardHeader}`}>
              <FaBox className="me-2" /> Thông tin kiện hàng
            </Card.Header>
            <Card.Body>
              <p><strong>Người gửi:</strong><br /> {order.sender}</p>
              <hr />
              <p><strong>Người nhận:</strong><br /> {order.receiver}</p>
              <hr />
              <p><strong>Trạng thái: </strong>
                <Badge bg="warning" className={styles.badge}>{order.statusDesc}</Badge>
              </p>
              {order.notes && <>
                <hr />
                <p><strong>Ghi chú:</strong> {order.notes}</p>
              </>}

              {/* Hình ảnh */}
              {order.images?.length > 0 && (
                <>
                  <hr />
                  <p><strong>Hình ảnh sản phẩm:</strong></p>
                  <Row className="mb-3">
                    {order.images.map((img, idx) => (
                      <Col key={idx} xs={6} md={6} className="mb-2">
                        <div className={styles.imgWrapper}>
                          <img src={img.image_url} alt="order" className={styles.img} />
                        </div>
                      </Col>
                    ))}
                  </Row>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Timeline + Chi tiết */}
        <Col xs={12} md={8}>
          {/* Timeline */}
          <Card className={`shadow-sm border-0 mb-4 ${styles.card}`}>
            <Card.Body>
              <h5 className={`fw-bold mb-4 ${styles.subHeading}`}>Hành trình chi tiết</h5>
              <div className={styles.timelineHorizontal}>
                {order.statuses
                    .filter(status => Number(status.id) <= 5)
                    .map((status, index) => {
                    const completed = Number(status.id) <= Number(order.statusId);
                    const timelineItem = order.timeline.find(t => Number(t.statusId) === Number(status.id));
                    let IconComponent;
                    switch(Number(status.id)) {
                        case 1: IconComponent = FaBox; break;
                        case 2: IconComponent = FaCheckCircle; break;
                        case 3: IconComponent = FaTruck; break;
                        case 4: IconComponent = FaTruck; break;
                        case 5: IconComponent = FaCheckCircle; break; 
                        default: IconComponent = FaBox;
                    }
                    return (
                        <div key={status.id} className={`${styles.timelineStep} ${completed ? styles.completed : styles.pending}`}>
                        <div className={styles.circle}><IconComponent /></div>
                        <span className={styles.timelineLabel}>{status.label}</span>
                        <small className={styles.timelineTime}>{timelineItem?.time ?? '-'}</small>
                        </div>
                    );
                    })
                }
            </div>
            </Card.Body>
          </Card>

          {/* Chi tiết đơn hàng */}
          <Card className={`shadow-sm border-0 ${styles.card}`}>
            <Card.Body>
              <h5 className={`fw-bold mb-4 ${styles.subHeading}`}>Chi tiết đơn hàng</h5>

              {/* Loại dịch vụ, trọng lượng, kích thước */}
              <Row className="mb-3">
                <Col md={4}><strong>Loại dịch vụ:</strong> {order.serviceTypeName ?? '-'}</Col>
                <Col md={4}><strong>Trọng lượng:</strong> {order.weight ?? '-'} kg</Col>
                <Col md={4}><strong>Kích thước:</strong> {order.length ?? '-'} x {order.width ?? '-'} x {order.height ?? '-'} cm</Col>
              </Row>

              {/* Các loại phí */}
              <h6 className="fw-bold">Các loại phí</h6>
              <ul className="list-group mb-3">
                {order.fees?.length > 0 ? order.fees.map((fee, idx) => (
                  <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                    {fee.name}
                    <span>{formatCurrency(fee.amount)} đ</span>
                  </li>
                )) : <li className="list-group-item">Không có phụ phí</li>}
              </ul>

              {/* Tổng tiền, COD */}
              <Row>
                <Col md={6}><strong>Tổng tiền:</strong> {formatCurrency(order.total_amount)} đ</Col>
                <Col md={6}><strong>COD:</strong> {formatCurrency(order.cod_amount)} đ</Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TrackingResult;
