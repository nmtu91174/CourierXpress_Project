import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";


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

  const handleSearch = async () => {
    if (!trackingid.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Tracking code not entered",
        text: "Please enter a tracking code to search.",
      });
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8888/checkTracking.php",
        { trackingid }
      );

      if (response.data.exists) {
        Swal.fire({
          icon: "success",
          title: "Valid tracking code!",
          text: "Redirecting to order details...",
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          allowOutsideClick: false
        }).then(() => {
          navigate(`/tracking/${trackingid}`);
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Not found",
          text: response.data.message || "Tracking code does not exist.",
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Server error",
        text: "An error occurred while checking the tracking code.",
      });
    }
  };

  return (
    <div className="tracking-page">
      <HeroVideo />
      <section className="hero-section">
        <div className="tracking-box tracking-box-lux">
          <h3 className="fw-bold mb-4 text-center tracking-title">
            Track Order
          </h3>
          <p className="text-muted text-center mb-4 tracking-subtitle">
            Enter your tracking code to check the journey (e.g., ORD1234)
          </p>

          <Form className="d-flex gap-2 tracking-form">
            <Form.Control
              type="text"
              placeholder="Enter tracking code..."
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
      <section className="py-5 features-section">
        <Container>
          <h2 className="text-center fw-bold mb-5 section-title-lux">
            Why choose CourierXpress?
          </h2>
          <Row>
            <Col md={4} className="mb-4">
              <Card className="h-100 border-0 text-center p-4 feature-card">
                <div className="feature-icon-wrap mb-3">
                  <FaShippingFast className="feature-icon" />
                </div>
                <Card.Title className="fw-semibold">Super fast delivery</Card.Title>
                <Card.Text className="text-muted">
                  Commitment to on-time delivery with a wide logistics network.
                </Card.Text>
              </Card>
            </Col>

            <Col md={4} className="mb-4">
              <Card className="h-100 border-0 text-center p-4 feature-card">
                <div className="feature-icon-wrap mb-3">
                  <FaUserShield className="feature-icon" />
                </div>
                <Card.Title className="fw-semibold">Absolute safety</Card.Title>
                <Card.Text className="text-muted">
                  100% cargo insurance and professional handling process.
                </Card.Text>
              </Card>
            </Col>

            <Col md={4} className="mb-4">
              <Card className="h-100 border-0 text-center p-4 feature-card">
                <div className="feature-icon-wrap mb-3">
                  <FaGlobeAsia className="feature-icon" />
                </div>
                <Card.Title className="fw-semibold">Real-time tracking</Card.Title>
                <Card.Text className="text-muted">
                  Tracking System helps you know where your order is.
                </Card.Text>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
      <section className="bg-light py-4 sitemap-section">
        <Container>
          <h5 className="mb-3 fw-semibold">Sitemap</h5>
          <Row className="small">
            <Col>
              <a href="/" className="text-decoration-none text-secondary">
                Home
              </a>
            </Col>
            <Col>
              <a href="/tracking" className="text-decoration-none text-secondary">
                Track Order
              </a>
            </Col>
            <Col>
              <a href="/login" className="text-decoration-none text-secondary">
                Login Admin/Agent
              </a>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;
