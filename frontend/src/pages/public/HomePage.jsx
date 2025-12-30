import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css"; // Đừng quên import CSS của Bootstrap
import {
  Container,
  Navbar,
  Nav,
  Button,
  Row,
  Col,
  Card,
  Form,
  InputGroup,
  Badge,
} from "react-bootstrap";
import {
  Truck,
  Search,
  BoxSeam,
  GeoAlt,
  Telephone,
  Envelope,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Airplane,
  Tsunami, // Thay thế cho tàu biển
  GooglePlay,
  Apple,
  LightningCharge, // Bolt
  ShieldCheck, // Verified User
  Map, // Map/Location
  ArrowRight,
  ChevronRight,
  Android,
  Person,
  Bell,
} from "react-bootstrap-icons";
import HeroVideo from "../../components/HeroVideo";

// Style tùy chỉnh nhỏ để giữ màu sắc cam chủ đạo (nếu không dùng file CSS riêng)
const styles = {
  textOrange: { color: "#FF4500" },
  bgOrangeLight: { backgroundColor: "rgba(255, 69, 0, 0.1)" },
  btnOrange: {
    backgroundColor: "#FF4500",
    borderColor: "#FF4500",
    color: "white",
    fontWeight: "bold",
  },
  sectionBg: { backgroundColor: "#f8f9fa" },
  appSection: { backgroundColor: "#1a1a1a", color: "white" }, // Dark background
};

function App() {
  const [trackingId, setTrackingId] = useState("");

  const handleTrackingSearch = () => {
    if (trackingId.trim()) {
      alert(`Tracking: ${trackingId}`);
    } else {
      alert("Please enter a valid tracking ID.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleTrackingSearch();
  };

  return (
    <div
      className="App"
      style={{ overflowX: "hidden", fontFamily: "'Inter', sans-serif" }}
    >
      <HeroVideo />
      {/* --- 2. HERO SECTION --- */}
      <section id="home" className="py-5 position-relative overflow-hidden">
        {/* Background blobs giả lập bằng div rỗng nếu cần, ở đây giữ đơn giản */}
        <Container className="position-relative z-1">
          <Row className="align-items-center gy-5">
            <Col lg={6} className="text-center text-lg-start">
              <Badge
                bg="light"
                text="danger"
                className="mb-3 px-3 py-2 border border-danger border-opacity-25 rounded-pill"
              >
                <LightningCharge className="me-1" /> Next-Gen Logistics
              </Badge>
              <h1 className="display-3 fw-bolder mb-4 lh-sm">
                Shipping <br />
                <span
                  style={styles.textOrange}
                  className="position-relative d-inline-block"
                >
                  Fast, Safe
                  {/* SVG gạch chân giả lập */}
                  <svg
                    className="position-absolute w-100 start-0"
                    style={{
                      bottom: "-5px",
                      height: "8px",
                      color: "rgba(255,69,0,0.2)",
                    }}
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 5 Q 50 10 100 5"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                    />
                  </svg>
                </span>
                <br /> & On Time
              </h1>
              <p className="lead text-muted mb-4">
                Global logistics solutions powered by modern technology. We
                ensure your cargo reaches its destination safely and
                efficiently.
              </p>

              <div className="d-flex gap-3 justify-content-center justify-content-lg-start mb-5">
                <Button
                  size="lg"
                  style={styles.btnOrange}
                  className="px-4 rounded-3 d-flex align-items-center gap-2"
                >
                  Start Shipping <ArrowRight />
                </Button>
                <Button
                  variant="outline-dark"
                  size="lg"
                  className="px-4 rounded-3 d-flex align-items-center gap-2"
                >
                  Get Estimate
                </Button>
              </div>

              <div className="d-flex gap-5 justify-content-center justify-content-lg-start border-top pt-4">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h2 className="fw-bold mb-0">500K+</h2>
                    <span
                      className="position-relative d-flex bg-danger rounded-circle"
                      style={{ width: 10, height: 10 }}
                    ></span>
                  </div>
                  <small className="text-muted fw-bold">Monthly Orders</small>
                </div>
                <div>
                  <h2 className="fw-bold mb-0">99.8%</h2>
                  <small className="text-muted fw-bold">On-Time Delivery</small>
                </div>
              </div>
            </Col>

            <Col lg={6}>
              <div className="position-relative">
                {/* Tracking Card Layer */}
                {/* <Card className="border-0 shadow-lg rounded-4 p-2 mb-4">
                  <Card.Body className="bg-light rounded-4 p-4">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center shadow"
                        style={{ width: 40, height: 40 }}
                      >
                        <Search />
                      </div>
                      <div>
                        <h5 className="fw-bold mb-0">Track Shipment</h5>
                        <small className="text-muted">
                          Real-time status updates
                        </small>
                      </div>
                    </div>
                    <Form onSubmit={handleSubmit} className="position-relative">
                      <Form.Control
                        type="text"
                        placeholder="Enter tracking ID (e.g., CX-123456)"
                        className="py-3 ps-4 pe-5 rounded-3 border-0 shadow-sm"
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                      />
                      <Button
                        type="submit"
                        variant="danger"
                        className="position-absolute top-50 end-0 translate-middle-y me-2 py-1 px-3 fw-bold rounded-3"
                        style={{
                          fontSize: "0.8rem",
                          backgroundColor: "#FF4500",
                        }}
                      >
                        Track
                      </Button>
                    </Form>
                  </Card.Body>
                </Card> */}

                {/* Floating Cards Grid */}
                <Row className="g-3">
                  <Col md={6}>
                    <div
                      className="bg-danger text-white p-4 rounded-4 shadow position-relative overflow-hidden h-100"
                      style={{ backgroundColor: "#FF4500" }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-4 position-relative z-1">
                        <div className="bg-white bg-opacity-25 p-2 rounded-3">
                          <BoxSeam size={24} />
                        </div>
                        <ArrowRight />
                      </div>
                      <div className="position-relative z-1">
                        <h5 className="fw-bold">Express Delivery</h5>
                        <small className="text-white-50 fw-bold text-uppercase">
                          Global Reach
                        </small>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="bg-dark text-white p-4 rounded-4 shadow position-relative overflow-hidden h-100">
                      <div className="d-flex justify-content-between align-items-start mb-4 position-relative z-1">
                        <div className="bg-white bg-opacity-10 border border-white border-opacity-10 p-2 rounded-3">
                          <ShieldCheck size={24} />
                        </div>
                        <ArrowRight />
                      </div>
                      <div className="position-relative z-1">
                        <h5 className="fw-bold">Cargo Insurance</h5>
                        <small className="text-white-50 fw-bold text-uppercase">
                          Full Protection
                        </small>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* --- 3. WHY CHOOSE US --- */}
      <section className="py-5" style={styles.sectionBg}>
        <Container>
          <div
            className="text-center mb-5 mw-100 mx-auto"
            style={{ maxWidth: "700px" }}
          >
            <h2 className="fw-bold display-6 mb-3">Why Choose CourierXpress</h2>
            <p className="text-muted lead">
              We provide the fastest and most reliable logistics services in the
              industry, backed by cutting-edge technology.
            </p>
          </div>

          <Row className="g-4">
            {[
              {
                icon: <LightningCharge size={30} />,
                title: "Express Delivery",
                desc: "Guaranteed next-day delivery for urgent shipments with priority handling.",
              },
              {
                icon: <ShieldCheck size={30} />,
                title: "Secure Packaging",
                desc: "Tamper-proof packaging and comprehensive insurance options.",
              },
              {
                icon: <GeoAlt size={30} />,
                title: "Live GPS Tracking",
                desc: "Real-time updates on your shipment's location 24/7 via our app.",
              },
            ].map((item, idx) => (
              <Col md={4} key={idx}>
                <Card className="h-100 border-0 shadow-sm rounded-4 hover-shadow transition-all p-3">
                  <Card.Body>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 mb-4 text-danger"
                      style={{ width: 60, height: 60, ...styles.bgOrangeLight }}
                    >
                      {item.icon}
                    </div>
                    <Card.Title className="fw-bold fs-4 mb-3">
                      {item.title}
                    </Card.Title>
                    <Card.Text className="text-muted">{item.desc}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* --- 4. PROCESS SECTION --- */}
      <section className="py-5 bg-white">
        <Container>
          <div className="text-center mb-5">
            <small style={styles.textOrange} className="fw-bold text-uppercase">
              How it works
            </small>
            <h2 className="fw-bold display-6">Simple 4-Step Shipping</h2>
          </div>
          <Row className="text-center g-4 position-relative">
            {/* Note: Connecting lines are hard in pure Bootstrap, skipped for cleanliness */}
            {[
              {
                title: "1. Book Online",
                sub: "Schedule pickup",
                icon: "calendar_month",
              },
              {
                title: "2. We Pack",
                sub: "Professionals handle items",
                icon: "package_2",
              },
              {
                title: "3. In Transit",
                sub: "Real-time tracking",
                icon: "local_shipping",
              },
              { title: "4. Delivered", sub: "Safe arrival", icon: "home_pin" },
            ].map((step, idx) => (
              <Col md={3} key={idx}>
                <div
                  className="d-inline-flex align-items-center justify-content-center bg-white border rounded-4 shadow-sm mb-3 position-relative z-1"
                  style={{ width: 80, height: 80 }}
                >
                  {/* Using Bootstrap Icons instead of material strings */}
                  {idx === 0 && <BoxSeam className="text-danger" size={30} />}
                  {idx === 1 && <Truck className="text-danger" size={30} />}
                  {idx === 2 && <Map className="text-danger" size={30} />}
                  {idx === 3 && <GeoAlt className="text-danger" size={30} />}
                </div>
                <h5 className="fw-bold">{step.title}</h5>
                <p className="text-muted small">{step.sub}</p>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* --- 5. SERVICES SECTION --- */}
      <section id="services" className="py-5" style={styles.sectionBg}>
        <Container>
          <div className="d-flex justify-content-between align-items-end mb-5">
            <div>
              <small
                style={styles.textOrange}
                className="fw-bold text-uppercase"
              >
                What we do
              </small>
              <h2 className="fw-bold display-6">Our Services</h2>
            </div>
            <Button
              variant="link"
              className="text-decoration-none fw-bold d-none d-md-block"
              style={{ color: styles.textOrange.color }}
            >
              View all services <ArrowRight />
            </Button>
          </div>

          <Row className="g-4">
            {[
              {
                title: "Air Freight",
                desc: "Fast international shipping for time-sensitive cargo. We handle customs and documentation seamlessly.",
                icon: <Airplane />,
                color: "primary",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdJGZTNfPKG2MdkRtA3jEW54T2APo207qC2Ve5TB9UE4MC1ZRqoORsPDkPL5ch5XaMmVwFBK3_NeGysw2yNBhJh6nn2Cr__mAyzH2JFYdsDAx02tVNrm0G0oyML69qn9ENhnlg-6ODITVTYbWHZH4MtRY0JL4A-zyQi6XP0E181ZNkOkQeMAi1C2JlMFGoGgjLK-IZ8JWaUUoBnf3l8ILf7baaDu9VVNZ4wzE0-qzfeuEPDIuT4RRYUGVVjTt1-D5lbVJdjkVTWDH8",
              },
              {
                title: "Ocean Cargo",
                desc: "Cost-effective solutions for large bulk shipments. FCL and LCL options available globally.",
                icon: <Tsunami />,
                color: "info",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB8F2nZPPpmc-_qzsyrPYWTUDFlN1n6QcIK6XnxMnxT9VSME1GoM-dUiB-3XMAtpxQ-Dqbx6T2YjE-QWDYvS1BaB6Pw1okMEAbtRt5ZvOvBZ0c5ZIJn2GBrodYA5Gl8CZ5H8gBZqo6H8yrD8lquHY_3VROsZJQ7Tev7UnaoL6Lkj88JG_XujfzcFuxQ6w9HeTpN6pI6q36p9ucbX32jSzyGdLKFY4Ow5D6UO-s22r73Nic6M0SMo5BR4veD43sbC9zQTx_x-6hH1DYb",
              },
              {
                title: "Road Transport",
                desc: "Reliable domestic and cross-border trucking. Flexible fleet options for every cargo size.",
                icon: <Truck />,
                color: "warning",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWFPnVDDEv_oGrpXrmTJxB1pViedY59X5Kiqm2JvxWT8LVHW8gSoZTCNgGZYoUkWtceuc5NTJ3PZCm7V99O1L31PgoveO64OmtJjREYy9396eW4cqP0oIoixNIkWSzIj0M_QqVQRcpxqAVBZSDXk7aSKkOckIf4IhreknjJYQgBafFIgKY4gYacfT82apOVZQ2MEnIBTSpatfyF65kgCRZd3fDxttS4w6WcDIDLVvhaWxglsAJ009Pnkf-6w5mkGobW8JmqgZ1U5yR",
              },
              {
                title: "Warehousing",
                desc: "Secure storage solutions with modern inventory management systems. Short and long-term.",
                icon: <BoxSeam />,
                color: "secondary",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZusvrDQZUMQHyU6iKgj7aTYUDQC2hq904obUqbEMZ1Q_A4S5zUon43TEwJzHKAIFWqmrmfECRLkKdym41idOU1k3uPDxKzJrX1xF_dxXVDv0kkS0H-TY2nNU11WwOqmuTlUvpquHZBaRxx3yDrG0ButfpCkpPNqCTZMw3eBnDUGBkVoO0gutz1_96BJB5TLGD4B3AzE2mNW3C9JAOPGJWNA6m6O1ebh0kFSxqQS5_3p3ju8xKkWDw84_aig20jh4dW1TA7tdjsqZm",
              },
            ].map((svc, idx) => (
              <Col lg={6} key={idx}>
                <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                  <Row className="g-0 h-100">
                    <Col md={5}>
                      <img
                        src={svc.img}
                        alt={svc.title}
                        className="w-100 h-100 object-fit-cover"
                        style={{ minHeight: "200px" }}
                      />
                    </Col>
                    <Col md={7}>
                      <Card.Body className="d-flex flex-column justify-content-center h-100 p-4">
                        <div
                          className={`text-${svc.color} bg-${svc.color} bg-opacity-10 p-2 rounded mb-3 d-inline-block w-auto`}
                        >
                          {svc.icon}
                        </div>
                        <Card.Title className="fw-bold">{svc.title}</Card.Title>
                        <Card.Text className="text-muted small">
                          {svc.desc}
                        </Card.Text>
                        <a
                          href="#"
                          className="fw-bold text-decoration-none text-dark mt-auto d-flex align-items-center gap-1"
                        >
                          Details <ChevronRight size={14} />
                        </a>
                      </Card.Body>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* --- 6. APP DOWNLOAD SECTION --- */}
      <section className="py-5">
        <Container>
          <div
            className="p-5 rounded-5 position-relative overflow-hidden"
            style={styles.appSection}
          >
            <Row className="align-items-center position-relative z-1">
              <Col lg={6} className="text-center text-lg-start mb-5 mb-lg-0">
                <Badge
                  bg="white"
                  text="dark"
                  className="bg-opacity-10 text-white border border-white border-opacity-25 rounded-pill mb-3 px-3"
                >
                  MOBILE APP
                </Badge>
                <h2 className="display-4 fw-bold mb-3">
                  Track on the go.
                  <br />
                  Download the App.
                </h2>
                <p className="text-white-50 lead mb-5">
                  Get real-time notifications and manage shipments from
                  anywhere.
                </p>
                <div className="d-flex gap-3 justify-content-center justify-content-lg-start">
                  <Button
                    variant="light"
                    size="lg"
                    className="d-flex align-items-center gap-3 rounded-3 px-4"
                  >
                    <GooglePlay size={28} />
                    <div className="text-start lh-1">
                      <small
                        className="d-block text-muted"
                        style={{ fontSize: "0.7rem" }}
                      >
                        GET IT ON
                      </small>
                      <span className="fw-bold">Google Play</span>
                    </div>
                  </Button>
                  <Button
                    variant="light"
                    size="lg"
                    className="d-flex align-items-center gap-3 rounded-3 px-4"
                  >
                    <Apple size={28} />
                    <div className="text-start lh-1">
                      <small
                        className="d-block text-muted"
                        style={{ fontSize: "0.7rem" }}
                      >
                        DOWNLOAD ON
                      </small>
                      <span className="fw-bold">App Store</span>
                    </div>
                  </Button>
                </div>
              </Col>

              {/* Phone Mockup Simplified */}
              <Col lg={6} className="d-flex justify-content-center">
                <div
                  className="bg-white rounded-4 p-3 shadow-lg"
                  style={{ maxWidth: "300px", transform: "rotate(-3deg)" }}
                >
                  <div className="bg-danger text-white p-3 rounded-top-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="fw-bold">CourierXpress</small>
                      <Bell size={16} />
                    </div>
                    <h5 className="mt-3 mb-0 fw-bold">Hello, Alex!</h5>
                    <small className="opacity-75">3 packages on the way</small>
                  </div>
                  <div className="p-3 bg-light rounded-bottom-4">
                    <div className="bg-white p-2 rounded shadow-sm mb-2 border-start border-4 border-danger">
                      <div className="d-flex justify-content-between">
                        <small className="fw-bold text-muted">CX-883921</small>
                        <Badge
                          bg="danger"
                          className="bg-opacity-10 text-danger"
                        >
                          In Transit
                        </Badge>
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <Truck className="text-danger" />
                        <div>
                          <div className="fw-bold small text-dark">
                            MacBook Pro M3
                          </div>
                          <div
                            className="text-muted"
                            style={{ fontSize: "0.7rem" }}
                          >
                            Arriving tomorrow
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default App;
