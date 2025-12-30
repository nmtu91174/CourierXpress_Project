import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner, Button } from "react-bootstrap";
import { FaTruck, FaCheckCircle, FaBox, FaMapMarkerAlt, FaFileInvoice } from "react-icons/fa";
import axios from "axios";
import Swal from "sweetalert2";
import styles from "../../assets/styles/TrackingResult.module.css";

// --- Leaflet Imports for Map ---
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Fix Leaflet default icon issue in React ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const TrackingResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // State to store real-time shipper location
  const [location, setLocation] = useState(null);

  // --- Effect 1: Fetch Order Details ---
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // Ensure this URL points to your actual backend endpoint
        const res = await axios.get(`http://localhost:8888/getOrder.php?order_code=${id}`);
        if (res.data.status === "success") {
          setOrder(res.data.order);
        } else {
          Swal.fire("Error", res.data.message || "Order not found", "error");
        }
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Cannot connect to server", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  // --- Effect 2: Poll Shipper Location (Every 10 seconds) ---
  useEffect(() => {
    if (!id) return;

    const fetchLiveLocation = async () => {
      try {
        // Adjust the URL to point to your backend API location
        // Assuming the file is at: backend/api/tracking/get_live_location.php
        const res = await axios.get(`http://localhost:8888/backend/api/tracking/get_live_location.php?order_code=${id}`);

        if (res.data.status === 'success' && res.data.data) {
          setLocation({
            lat: parseFloat(res.data.data.latitude),
            lng: parseFloat(res.data.data.longitude),
            shipperName: res.data.data.shipper_name || "Shipper"
          });
        }
      } catch (err) {
        // Silent error for tracking to avoid spamming console
        console.warn("Tracking Map Update Failed:", err.message);
      }
    };

    // Initial fetch
    fetchLiveLocation();

    // Poll every 10 seconds
    const intervalId = setInterval(fetchLiveLocation, 10000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [id]);

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
  if (!order) return null;

  // Helper: Format Currency (Keep Vietnamese locale for currency format if using VND)
  const formatCurrency = (value) => (value != null ? value.toLocaleString("vi-VN") : "0");

  // Helper: Translate Payer Type
  const formatPayerType = (type) => {
    if (Number(type) === 1) return "Sender Pays";
    if (Number(type) === 2) return "Receiver Pays";
    return "-";
  };

  return (
    <Container className={`py-5 ${styles.container}`}>
      <h2 className={`fw-bold mb-4 ${styles.heading}`}>
        Tracking Code: <span className={styles.highlight}>{order.order_code}</span>
      </h2>

      {/* --- LIVE MAP SECTION (Only renders if location data exists) --- */}
      {location && (
        <Row className="mb-4">
          <Col xs={12}>
            <Card className={`shadow-sm border-0 ${styles.card}`}>
              <Card.Header className={`${styles.cardHeader} bg-primary text-white`}>
                <FaMapMarkerAlt className="me-2" /> Live Shipper Location
              </Card.Header>
              <Card.Body className="p-0">
                <div style={{ height: "400px", width: "100%" }}>
                  <MapContainer center={[location.lat, location.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <Marker position={[location.lat, location.lng]}>
                      <Popup>
                        <strong>Shipper:</strong> {location.shipperName} <br />
                        Status: Delivering
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        {/* --- LEFT COLUMN: PACKAGE INFO --- */}
        <Col xs={12} md={4} className="mb-4">
          <Card className={`shadow-sm border-0 h-100 ${styles.card}`}>
            <Card.Header className={`${styles.cardHeader}`}>
              <FaBox className="me-2" /> Package Information
            </Card.Header>
            <Card.Body>
              <p><strong>Sender:</strong><br /> {order.sender}</p>
              <hr />
              <p><strong>Receiver:</strong><br /> {order.receiver}</p>
              <hr />
              <p><strong>Status: </strong>
                {/* Assuming statusDesc comes from backend, might need translation if backend sends Vietnamese */}
                <Badge bg="warning" className={styles.badge}>{order.statusDesc}</Badge>
              </p>
              {order.notes && <>
                <hr />
                <p><strong>Note:</strong> {order.notes}</p>
              </>}

              {/* Images Section */}
              {order.images?.length > 0 && (
                <>
                  <hr />
                  <p><strong>Product Images:</strong></p>
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

        {/* --- RIGHT COLUMN: TIMELINE & DETAILS --- */}
        <Col xs={12} md={8}>

          {/* Timeline Section */}
          <Card className={`shadow-sm border-0 mb-4 ${styles.card}`}>
            <Card.Body>
              <h5 className={`fw-bold mb-4 ${styles.subHeading}`}>Tracking History</h5>
              <div className={styles.timelineHorizontal}>
                {order.statuses
                  .filter(status => Number(status.id) <= 5)
                  .map((status, index) => {
                    const completed = Number(status.id) <= Number(order.statusId);
                    const timelineItem = order.timeline.find(t => Number(t.statusId) === Number(status.id));
                    let IconComponent;

                    // Map Status ID to Icon
                    switch (Number(status.id)) {
                      case 1: IconComponent = FaBox; break; // Booked
                      case 2: IconComponent = FaCheckCircle; break; // Approved
                      case 3: IconComponent = FaTruck; break; // Assigned/Pickup
                      case 4: IconComponent = FaTruck; break; // In Transit
                      case 5: IconComponent = FaCheckCircle; break; // Delivered
                      default: IconComponent = FaBox;
                    }
                    return (
                      <div key={status.id} className={`${styles.timelineStep} ${completed ? styles.completed : styles.pending}`}>
                        <div className={styles.circle}><IconComponent /></div>
                        {/* Note: status.label comes from DB/Backend. If DB is VN, this stays VN unless mapped here */}
                        <span className={styles.timelineLabel}>{status.label}</span>
                        <small className={styles.timelineTime}>{timelineItem?.time ?? '-'}</small>
                      </div>
                    );
                  })
                }
              </div>
            </Card.Body>
          </Card>

          {/* Order Details Section */}
          <Card className={`shadow-sm border-0 ${styles.card}`}>
            <Card.Body>
              <h5 className={`fw-bold mb-4 ${styles.subHeading}`}>Order Details</h5>

              {/* Service, Weight, Dimensions */}
              <Row className="mb-3">
                <Col md={4}><strong>Service Type:</strong> {order.serviceTypeName ?? '-'}</Col>
                <Col md={4}><strong>Weight:</strong> {order.weight ?? '-'} g</Col>
                <Col md={4}><strong>Dimensions:</strong> {order.length ?? '-'} x {order.width ?? '-'} x {order.height ?? '-'} cm</Col>
              </Row>

              {/* Fees Breakdown */}
              <h6 className="fw-bold">Fees Breakdown</h6>
              <ul className="list-group mb-3">
                {order.fees?.length > 0 ? order.fees.map((fee, idx) => (
                  <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                    {fee.name}
                    <span>{formatCurrency(fee.amount)} đ</span>
                  </li>
                )) : <li className="list-group-item">No extra fees</li>}
              </ul>

              {/* Totals */}
              <Row>
                <Col md={6}><strong>Total Amount:</strong> {formatCurrency(order.total_amount)} đ</Col>
                <Col md={6}><strong>COD (Cash on Delivery):</strong> {formatCurrency(order.cod_amount)} đ</Col>
              </Row>

              <Row className="mt-2">
                <Col md={6}>
                  <strong>Payer:</strong> {formatPayerType(order.payer_type)}
                </Col>
              </Row>

              {/* Invoice Section - Same as OrderDetail (customer) */}
              <Row className="mt-4">
                <Col>
                  <hr />
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Invoice</strong>
                      <p className="text-muted small mb-0">View and download your invoice for this order</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="d-flex align-items-center gap-2"
                      onClick={() => navigate(`/invoice/${order.order_code}`)}
                    >
                      <FaFileInvoice className="me-2" /> View Invoice
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TrackingResult;