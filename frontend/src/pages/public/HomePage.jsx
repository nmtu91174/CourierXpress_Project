import React, { useState, useEffect, useRef } from "react";
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
  ShieldLock, // ISO/Security
  Clock, // SLA
  Headset, // 24/7 Support
  FileEarmarkCheck, // Insurance
  Calculator, // Estimate
  Building, // Enterprise/Trust
} from "react-bootstrap-icons";
import HeroVideo from "../../components/HeroVideo";
import { initEnterpriseLogoCarousel } from "../../animations/enterpriseLogoCarousel";
import { initEnterpriseTrustAnimations, initWhyChooseAnimation, initProcessAnimation, initServicesAnimation } from "../../animations/enterpriseTrustAnimations";
import { initHeroTimeline } from "../../animations/heroTimeline";
import "../../assets/styles/enterprise-logo-carousel.css";
import "../../assets/styles/hero-introduction.css";
import "../../assets/styles/HomePage.css";


// Style tùy chỉnh nhỏ để giữ màu sắc cam chủ đạo (Burnt Orange - Enterprise)
const styles = {
  textOrange: { color: "#D04A02" }, // Burnt Orange
  bgOrangeLight: { backgroundColor: "rgba(208, 74, 2, 0.15)" },
  btnOrange: {
    backgroundColor: "#D04A02",
    borderColor: "#D04A02",
    color: "white",
    fontWeight: "bold",
  },
  sectionBg: { backgroundColor: "#f8f9fa" },
  appSection: { backgroundColor: "#1a1a1a", color: "white" }, // Dark background
};

function HomePage() {
  const [trackingId, setTrackingId] = useState("");
  const [estimateForm, setEstimateForm] = useState({
    from: "",
    to: "",
    weight: "",
  });
  const logoTrackRef = useRef(null);

  // Enterprise partner logos from public/images/logo
  const logos = [
    "/images/logo/Aeon.png",
    "/images/logo/Bosch.png",
    "/images/logo/Decathlon.png",
    "/images/logo/Foxconn.png",
    "/images/logo/Ikea.webp",
    "/images/logo/LG.webp",
    "/images/logo/Nestle.png",
    "/images/logo/Nike.png",
    "/images/logo/Panasonic.png",
    "/images/logo/PG.png",
    "/images/logo/Samsung.png",
    "/images/logo/Unilever.webp",
  ];

  useEffect(() => {
    // Initialize Hero Timeline (runs once on load)
    const heroTimer = setTimeout(() => {
      initHeroTimeline();
    }, 100);

    // Initialize logo carousel
    if (logoTrackRef.current) {
      initEnterpriseLogoCarousel(logoTrackRef.current, 40);
    }

    // Initialize GSAP animations for Enterprise Trust section
    // Delay slightly to ensure DOM is ready
    const trustTimer = setTimeout(() => {
      initEnterpriseTrustAnimations();
    }, 200);

    // Initialize GSAP animations for Why Choose Us section
    const whyChooseTimer = setTimeout(() => {
      initWhyChooseAnimation();
    }, 250);

    // Initialize GSAP animations for Process section (4-Step Shipping)
    const processTimer = setTimeout(() => {
      initProcessAnimation();
    }, 300);

    // Initialize GSAP animations for Services section
    const servicesTimer = setTimeout(() => {
      initServicesAnimation();
    }, 350);

    // Cleanup on unmount
    return () => {
      clearTimeout(heroTimer);
      clearTimeout(trustTimer);
      clearTimeout(whyChooseTimer);
      clearTimeout(processTimer);
      clearTimeout(servicesTimer);
      // ScrollTrigger cleanup is handled in the animation file
    };
  }, []);

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
      {/* --- Introduction SECTION --- */}
      <section id="home" className="position-relative overflow-hidden" style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
        {/* Background blobs giả lập bằng div rỗng nếu cần, ở đây giữ đơn giản */}
        <Container fluid="xl" className="position-relative z-1">
          <Row className="align-items-end gy-5">
            <Col lg={6} className="text-center text-lg-start d-flex flex-column">
              <div>
              <Badge
                bg="light"
                text="danger"
                  className="hero-eyebrow mb-3 px-3 py-2 border border-danger border-opacity-25 rounded-pill"
              >
                <LightningCharge className="me-1" /> Modern Logistics Platform
              </Badge>
              <h1 className="display-3 fw-bolder mb-4 lh-sm">
                  <span className="hero-title-line">Shipping</span> <br />
                <span
                    className="hero-title-highlight position-relative d-inline-block"
                  style={styles.textOrange}
                >
                  Fast, Safe
                    {/* SVG underline */}
                  <svg
                      className="hero-underline position-absolute w-100 start-0"
                    style={{
                      bottom: "-5px",
                      height: "8px",
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
                  <br /> <span className="hero-title-line">& On Time</span>
              </h1>
                <p className="hero-description lead text-muted mb-4">
                Global logistics solutions built on reliable systems and real-time visibility.
                We help shipments move safely, efficiently, and on schedule.
              </p>
              </div>

              <div className="hero-actions d-flex gap-3 justify-content-center justify-content-lg-start mt-auto">
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
                <div className="hero-cards-wrapper">
                <Row className="g-3">
                  <Col md={6}>
                    <div
                        className="hero-card bg-danger text-white p-4 rounded-4 shadow position-relative overflow-hidden h-100"
                        style={{ backgroundColor: "#D04A02" }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-4 position-relative z-1">
                        <div className="bg-white bg-opacity-25 p-2 rounded-3">
                          <BoxSeam size={24} />
                        </div>
                          <ArrowRight className="hero-card-arrow" />
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
                      <div className="hero-card hero-card-dark bg-dark text-white p-4 rounded-4 shadow position-relative overflow-hidden h-100">
                      <div className="d-flex justify-content-between align-items-start mb-4 position-relative z-1">
                        <div className="bg-white bg-opacity-10 border border-white border-opacity-10 p-2 rounded-3">
                          <ShieldCheck size={24} />
                        </div>
                          <ArrowRight className="hero-card-arrow" />
                      </div>
                      <div className="position-relative z-1">
                        <h5 className="fw-bold">Cargo Insurance</h5>
                        <small className="text-white-50 fw-bold text-uppercase">
                          Full Protection
                        </small>
                      </div>
                    </div>
                  </Col>
                    {/* Enterprise Card - Full Width */}
                    <Col md={12}>
                      <div className="hero-card hero-card-wide bg-dark text-white p-4 rounded-4 shadow position-relative overflow-hidden">
                        <div className="d-flex justify-content-between align-items-start mb-3 position-relative z-1">
                          <div className="hero-card-icon">
                            <Building size={22} />
                          </div>
                          <ArrowRight className="hero-card-arrow" />
                        </div>
                        <div className="position-relative z-1">
                          <h5 className="fw-bold mb-2 text-white">
                            Trusted by Growing Businesses
                          </h5>
                          <p className="text-white-50 small mb-3">
                            Reliable logistics solutions used by fast-growing and established companies.
                          </p>
                          {/* Pills */}
                          <div className="d-flex flex-wrap gap-2">
                            <span className="hero-pill">✓ Proven reliability</span>
                            <span className="hero-pill">✓ Standards-aligned operations</span>
                            <span className="hero-pill">✓ Scalable delivery network</span>
                            <span className="hero-pill">✓ Dedicated support</span>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* --- 3. WHY CHOOSE US --- */}
<section className="why-choose-section">
  <Container fluid="xl">
    {/* ===== Header ===== */}
          <div
      className="text-center mb-5 mx-auto"
      style={{ maxWidth: "720px" }}
          >
      <small
        className="fw-semibold text-uppercase d-block mb-2"
        style={styles.textOrange}
      >
        Why Businesses Trust CourierXpress
      </small>

      <h2 className="fw-bold display-6 mb-3">
        Designed for Speed, Safety, and Operational Reliability
      </h2>

      <p className="text-muted mt-3 lead">
        From express delivery to real-time tracking, our logistics
        systems are designed to support businesses of all sizes.
            </p>
          </div>

    {/* ===== Cards ===== */}
          <Row className="g-4">
            {[
              {
          icon: <LightningCharge size={28} />,
                title: "Express Delivery",
                desc: "Guaranteed next-day delivery for urgent shipments with priority handling.",
              },
              {
          icon: <ShieldCheck size={28} />,
                title: "Secure Packaging",
                desc: "Tamper-proof packaging and comprehensive insurance options.",
              },
              {
          icon: <GeoAlt size={28} />,
                title: "Live GPS Tracking",
                desc: "Real-time updates on your shipment's location 24/7 via our app.",
              },
            ].map((item, idx) => (
              <Col md={4} key={idx}>
          <Card className="why-choose-card h-100 rounded-4">
                  <Card.Body>
              {/* Icon */}
                    <div
                className="why-choose-icon"
                style={{
                  background: styles.bgOrangeLight.background,
                  color: styles.textOrange.color,
                }}
                    >
                      {item.icon}
                    </div>

              {/* Content */}
              <Card.Title className="fs-4 mb-3">
                      {item.title}
                    </Card.Title>

              <Card.Text>
                {item.desc}
              </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

    {/* ===== Soft Trust Signal ===== */}
    <div className="trust-signal mt-5 pt-4 border-top text-center">
      <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 gap-md-5 text-muted small">
        <span>✓ 99.9% on-time delivery</span>
        <span>✓ ISO-aligned operational workflows</span>
        <span>✓ Real-time tracking and audit visibility</span>
      </div>
    </div>
  </Container>
</section>


      {/* --- 3.5. ENTERPRISE TRUST SECTION --- */}
      <section id="enterprise-trust" className="py-5 enterprise-trust">
        <Container fluid="xl">
          <div
            className="p-5 rounded-5 position-relative overflow-hidden"
            style={styles.appSection}
          >
            <div className="position-relative z-1">
              <div
                className="text-center mb-5 mx-auto"
                style={{ maxWidth: "700px" }}
              >
                <Badge
                  bg="white"
                  text="dark"
                  className="enterprise-eyebrow bg-opacity-10 text-white border border-white border-opacity-25 rounded-pill mb-3 px-3"
                >
                  TRUSTED BY BUSINESS
                </Badge>
                <h2 className="enterprise-title fw-bold display-6 mb-3 text-white">
                  Trusted by 500+ Businesses Worldwide
                </h2>
                <p className="enterprise-subtitle text-white-50 lead">
                  A logistics platform built for scale, consistency, and long-term reliability.
                </p>
              </div>

              {/* --- TRUST METRICS --- */}
              <div className="trust-metrics d-flex justify-content-center gap-5 mb-5">
                <div className="metric text-center">
                  <div className="d-flex align-items-baseline justify-content-center gap-1">
                    <span
                      className="metric-value fw-bold display-5 text-white"
                      data-count="500"
                    >
                      0
                    </span>
                    <span className="text-white-50 fw-bold">K+</span>
                  </div>
                  <p className="text-white-50 small mb-0 mt-2">Monthly Orders</p>
                </div>
                <div className="metric text-center">
                  <div className="d-flex align-items-baseline justify-content-center gap-1">
                    <span
                      className="metric-value fw-bold display-5 text-white"
                      data-count="99.8"
                    >
                      0
                    </span>
                    <span className="text-white-50 fw-bold">%</span>
                  </div>
                  <p className="text-white-50 small mb-0 mt-2">On-Time Delivery</p>
                </div>
              </div>

              {/* --- ENTERPRISE LOGO CAROUSEL --- */}
              <div className="enterprise-logo-wrapper">
                <div className="enterprise-logo-track" ref={logoTrackRef}>
                  {logos.concat(logos).map((logo, idx) => (
                    <div className="enterprise-logo-item" key={idx}>
                      <img src={logo} alt="Enterprise Partner" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* --- PROCESS SECTION --- */}
      <section className="process-section bg-white">
        <Container fluid="xl">
          <div className="text-center mb-5">
            <small className="fw-bold text-uppercase text-danger">
              How it works
            </small>
            <h2 className="fw-bold display-6">Simple 4-Step Shipping</h2>
            <p className="text-muted mt-2">
              A clear and transparent logistics process designed for speed and reliability.
            </p>
          </div>

          <div className="process-grid">
            {[
              {
                step: "01",
                title: "Book Online",
                desc: "Schedule pickup in seconds via website or app.",
                icon: BoxSeam,
              },
              {
                step: "02",
                title: "We Pack",
                desc: "Our professionals handle and secure your items.",
                icon: Truck,
              },
              {
                step: "03",
                title: "In Transit",
                desc: "Track your shipment in real time across the network.",
                icon: Map,
              },
              {
                step: "04",
                title: "Delivered",
                desc: "Safe and confirmed delivery to the recipient.",
                icon: GeoAlt,
              },
            ].map((item, idx) => (
              <div key={idx} className="process-card">
                <div className="process-step-number">{item.step}</div>

                <div className="process-content text-center">
                  <div className="process-icon mb-3">
                    <item.icon size={32} className="text-white" />
                  </div>
                  <h5 className="fw-bold mb-2">{item.title}</h5>
                  <p className="process-desc">{item.desc}</p>
                </div>
                </div>
            ))}
          </div>
        </Container>
      </section>

      {/* --- 5. SERVICES SECTION --- */}
      <section id="services" className="py-5">
        <Container fluid="xl">
          <div
            className="p-5 rounded-5 position-relative overflow-hidden"
            style={styles.appSection}
          >
            <div className="position-relative z-1">
          <div className="d-flex justify-content-between align-items-end mb-5">
            <div>
              <small
                    className="fw-bold text-uppercase text-white-50"
                    style={{ letterSpacing: "0.1em" }}
              >
                What we do
              </small>
                  <h2 className="fw-bold display-6 text-white mt-2">Our Services</h2>
            </div>
            <Button
              variant="link"
                  className="service-view-all text-decoration-none fw-bold d-none d-md-block text-white-50"
                  style={{ color: "rgba(255, 255, 255, 0.7)" }}
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
                useCase: "Enterprise",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdJGZTNfPKG2MdkRtA3jEW54T2APo207qC2Ve5TB9UE4MC1ZRqoORsPDkPL5ch5XaMmVwFBK3_NeGysw2yNBhJh6nn2Cr__mAyzH2JFYdsDAx02tVNrm0G0oyML69qn9ENhnlg-6ODITVTYbWHZH4MtRY0JL4A-zyQi6XP0E181ZNkOkQeMAi1C2JlMFGoGgjLK-IZ8JWaUUoBnf3l8ILf7baaDu9VVNZ4wzE0-qzfeuEPDIuT4RRYUGVVjTt1-D5lbVJdjkVTWDH8",
              },
              {
                title: "Ocean Cargo",
                desc: "Cost-effective solutions for large bulk shipments. FCL and LCL options available globally.",
                icon: <Tsunami />,
                color: "info",
                useCase: "Enterprise",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB8F2nZPPpmc-_qzsyrPYWTUDFlN1n6QcIK6XnxMnxT9VSME1GoM-dUiB-3XMAtpxQ-Dqbx6T2YjE-QWDYvS1BaB6Pw1okMEAbtRt5ZvOvBZ0c5ZIJn2GBrodYA5Gl8CZ5H8gBZqo6H8yrD8lquHY_3VROsZJQ7Tev7UnaoL6Lkj88JG_XujfzcFuxQ6w9HeTpN6pI6q36p9ucbX32jSzyGdLKFY4Ow5D6UO-s22r73Nic6M0SMo5BR4veD43sbC9zQTx_x-6hH1DYb",
              },
              {
                title: "Road Transport",
                desc: "Reliable domestic and cross-border trucking. Flexible fleet options for every cargo size.",
                icon: <Truck />,
                color: "warning",
                useCase: "E-commerce",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWFPnVDDEv_oGrpXrmTJxB1pViedY59X5Kiqm2JvxWT8LVHW8gSoZTCNgGZYoUkWtceuc5NTJ3PZCm7V99O1L31PgoveO64OmtJjREYy9396eW4cqP0oIoixNIkWSzIj0M_QqVQRcpxqAVBZSDXk7aSKkOckIf4IhreknjJYQgBafFIgKY4gYacfT82apOVZQ2MEnIBTSpatfyF65kgCRZd3fDxttS4w6WcDIDLVvhaWxglsAJ009Pnkf-6w5mkGobW8JmqgZ1U5yR",
              },
              {
                title: "Warehousing",
                desc: "Secure storage solutions with modern inventory management systems. Short and long-term.",
                icon: <BoxSeam />,
                color: "secondary",
                useCase: "SME",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZusvrDQZUMQHyU6iKgj7aTYUDQC2hq904obUqbEMZ1Q_A4S5zUon43TEwJzHKAIFWqmrmfECRLkKdym41idOU1k3uPDxKzJrX1xF_dxXVDv0kkS0H-TY2nNU11WwOqmuTlUvpquHZBaRxx3yDrG0ButfpCkpPNqCTZMw3eBnDUGBkVoO0gutz1_96BJB5TLGD4B3AzE2mNW3C9JAOPGJWNA6m6O1ebh0kFSxqQS5_3p3ju8xKkWDw84_aig20jh4dW1TA7tdjsqZm",
              },
            ].map((svc, idx) => {
              const isFeatured = idx < 2; // Air Freight & Ocean Cargo are featured
              return (
              <Col lg={6} key={idx}>
                  <Card
                    className={`service-card h-100 border-0 rounded-4 overflow-hidden ${
                      isFeatured ? "service-card--featured" : ""
                    }`}
                  >
                  <Row className="g-0 h-100">
                    <Col md={5}>
                        <div className="service-card__image position-relative h-100">
                      <img
                        src={svc.img}
                        alt={svc.title}
                        className="w-100 h-100 object-fit-cover"
                        style={{ minHeight: "200px" }}
                      />
                        </div>
                    </Col>
                    <Col md={7}>
                        <Card.Body
                          className="d-flex flex-column justify-content-center h-100 p-4"
                          style={{ backgroundColor: "#2a2a2a" }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-3">
                        <div
                              className={`service-icon-wrapper service-icon--${svc.title.toLowerCase().replace(/\s+/g, '-')} p-2 rounded d-inline-block w-auto`}
                        >
                          {svc.icon}
                        </div>
                            {svc.useCase && (
                              <Badge
                                className={`service-badge service-badge--${svc.useCase.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')} rounded-pill`}
                                style={{ 
                                  backgroundColor: svc.useCase === "Enterprise" ? "#4c6fff" : 
                                                  svc.useCase === "E-commerce" ? "#8b5cf6" : 
                                                  svc.useCase === "SME" ? "#059669" : "transparent",
                                  color: "#ffffff",
                                  border: svc.useCase === "Enterprise" ? "1px solid rgba(76, 111, 255, 0.35)" :
                                         svc.useCase === "E-commerce" ? "1px solid rgba(139, 92, 246, 0.35)" :
                                         svc.useCase === "SME" ? "1px solid rgba(5, 150, 105, 0.35)" : "none"
                                }}
                              >
                                {svc.useCase}
                              </Badge>
                            )}
                          </div>
                          <Card.Title className="fw-bold text-white mb-2">
                            {svc.title}
                          </Card.Title>
                          <Card.Text className="text-white-50 small mb-3">
                          {svc.desc}
                        </Card.Text>
                        <a
                          href="#"
                            className="service-card__cta mt-auto d-flex align-items-center gap-1"
                        >
                            Explore service details <ChevronRight size={14} />
                        </a>
                      </Card.Body>
                    </Col>
                  </Row>
                </Card>
              </Col>
              );
            })}
          </Row>
            </div>
          </div>
        </Container>
      </section>

      {/* --- Section Divider --- */}
      <div className="text-center my-5">
        <small
          className="text-uppercase fw-semibold text-muted"
          style={{ letterSpacing: "0.18em", fontSize: "0.85rem" }}
        >
          From Logistics Services to Digital Experience
        </small>
      </div>

      {/* --- 6. APP DOWNLOAD SECTION --- */}
      <section className="py-5">
        <Container fluid="xl">
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

export default HomePage;
