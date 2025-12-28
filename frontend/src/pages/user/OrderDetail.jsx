import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner } from "react-bootstrap";
import { FaTruck, FaCheckCircle, FaBox } from "react-icons/fa";
import axios from "axios";
import Swal from "sweetalert2";
import styles from "../../assets/styles/TrackingResult.module.css";

const OrderDetail = () => {
  const { id } = useParams(); // order_code
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const [order, setOrder] = useState({
    timeline: [],
    fees: [],
    images: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !id) return;

    const fetchOrder = async () => {
      try {
        const res = await axios.post(
          "http://localhost:8888/getOrderByUser.php",
          {
            order_code: id,
            user_id: userId
          }
        );

        if (res.data.status === "success") {
          setOrder(res.data.order);
        } else {
          Swal.fire("Error", res.data.message, "error");
        }
      } catch (error) {
        Swal.fire("Error", "Cannot connect to server", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, userId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const formatCurrency = (value) =>
    value != null ? value.toLocaleString("vi-VN") : "0";

  const getIcon = (label = "") => {
    if (label.includes("tạo") || label.toLowerCase().includes("created") || label.toLowerCase().includes("booked")) return FaBox;
    if (label.includes("lấy") || label.toLowerCase().includes("pickup") || label.toLowerCase().includes("picked")) return FaTruck;
    if (label.includes("giao") || label.toLowerCase().includes("deliver") || label.toLowerCase().includes("delivery")) return FaTruck;
    if (label.includes("thành công") || label.toLowerCase().includes("success") || label.toLowerCase().includes("delivered")) return FaCheckCircle;
    return FaBox;
  };

  const formatPayerType = (type) => {
    if (Number(type) === 1) return "Sender Pays";
    if (Number(type) === 2) return "Receiver Pays";
    return "-";
  };


  return (
    <Container className={`py-5 ${styles.container}`}>
      <h2 className={`fw-bold mb-4 ${styles.heading}`}>
        Order Details:{" "}
        <span className={styles.highlight}>{order.order_code}</span>
      </h2>

      <Row>
        {/* Package Information */}
        <Col md={4} className="mb-4">
          <Card className={`shadow-sm border-0 h-100 ${styles.card}`}>
            <Card.Header className={styles.cardHeader}>
              <FaBox className="me-2" /> Package Information
            </Card.Header>
            <Card.Body>
              <p><strong>Sender:</strong><br />{order.sender}</p>
              <hr />
              <p><strong>Receiver:</strong><br />{order.receiver}</p>
              <hr />
              <p>
                <strong>Status:</strong>{" "}
                <Badge bg="warning">{order.statusDesc}</Badge>
              </p>

              {order.notes && (
                <>
                  <hr />
                  <p><strong>Notes:</strong> {order.notes}</p>
                </>
              )}

              {order.images.length > 0 && (
                <>
                  <hr />
                  <Row>
                    {order.images.map((img, idx) => (
                      <Col key={idx} xs={6} className="mb-2">
                        <img
                          src={img.image_url}
                          alt="order"
                          className="img-fluid rounded"
                        />
                      </Col>
                    ))}
                  </Row>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Timeline + Details */}
        <Col md={8}>
          <Card className={`shadow-sm border-0 mb-4 ${styles.card}`}>
            <Card.Body>
              <h5 className="fw-bold mb-4">Order Timeline</h5>

              <div className={styles.timelineHorizontal}>
                {order.timeline.length === 0 && (
                  <p className="text-muted">No status updates yet</p>
                )}

                  {order.statuses
                    .filter(status => {
                      if (Number(status.id) <= 5) return true;
                      return Number(order.statusId) === Number(status.id);
                    })
                    .map((status) => {
                    const completed = Number(status.id) <= Number(order.statusId);

                    const timelineItem = order.timeline.find(
                        (t) => Number(t.statusId) === Number(status.id)
                    );

                    const Icon = getIcon(status.label);

                    return (
                        <div
                        key={status.id}
                        className={`${styles.timelineStep} ${
                            completed ? styles.completed : styles.pending
                        }`}
                        >
                        <div className={styles.circle}>
                            <Icon />
                        </div>

                        <span className={styles.timelineLabel}>
                            {status.label}
                        </span>

                        <small className={styles.timelineTime}>
                            {timelineItem?.time ?? "-"}
                        </small>
                        </div>
                    );
                })}
              </div>
            </Card.Body>
          </Card>

          <Card className={`shadow-sm border-0 ${styles.card}`}>
            <Card.Body>
              <h5 className="fw-bold mb-4">Detailed Information</h5>

              <Row className="mb-3">
                <Col md={3}><strong>Service Type:</strong> {order.serviceTypeName}</Col>

                <Col md={3}><strong>Weight:</strong> {order.weight} g</Col>

                <Col md={3}>
                  <strong>Payer:</strong>{" "}
                  {formatPayerType(order.payer_type)}
                </Col>

                <Col md={3}>
                  <strong>Dimensions:</strong>{" "}
                  {order.length} x {order.width} x {order.height} cm
                </Col>
              </Row>


              <h6 className="fw-bold">Fees</h6>
              <ul className="list-group mb-3">
                {order.fees.length > 0 ? (
                  order.fees.map((fee, idx) => (
                    <li key={idx} className="list-group-item d-flex justify-content-between">
                      {fee.name}
                      <span>{formatCurrency(fee.amount)} đ</span>
                    </li>
                  ))
                ) : (
                  <li className="list-group-item">No additional fees</li>
                )}
              </ul>

              <Row>
                <Col md={6}><strong>Total Amount:</strong> {formatCurrency(order.total_amount)} đ</Col>
                <Col md={6}><strong>COD:</strong> {formatCurrency(order.cod_amount)} đ</Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default OrderDetail;
