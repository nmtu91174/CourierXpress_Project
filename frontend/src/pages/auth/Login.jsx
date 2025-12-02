// frontend/src/pages/auth/Login.jsx

import React, { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle, FaFacebookF } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import '../../assets/styles/login.css'; // Import file CSS vừa tạo

const Login = () => {
    // State giả lập cho giao diện (xử lý ẩn hiện password)
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Hàm submit giả (chưa xử lý data)
    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Login button clicked! Logic will be implemented later.");
    };

    return (
        <Container fluid className="login-container">
            <Row className="h-100">

                {/* LEFT SIDE: Banner Image & Slogan */}
                <Col md={6} lg={7} className="login-banner d-none d-md-block">
                    <div className="banner-content">
                        <h1 className="display-4 fw-bold mb-3">CourierXpress</h1>
                        <p className="lead fs-4">Fast. Reliable. Worldwide.</p>
                        <p className="mt-4 w-75">
                            Manage your shipments, track deliveries in real-time, and connect with your customers seamlessly.
                            Join the future of logistics management today.
                        </p>
                    </div>
                </Col>

                {/* RIGHT SIDE: Login Form */}
                <Col md={6} lg={5} className="login-form-section">
                    <div className="login-card">
                        <div className="text-center mb-5">
                            <h2 className="fw-bold text-dark">Welcome Back</h2>
                            <p className="text-muted">Please enter your details to sign in.</p>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            {/* Username / Email Input */}
                            <Form.Group className="mb-4" controlId="formBasicEmail">
                                <Form.Label className="fw-medium text-secondary">Username or Email</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0 text-muted">
                                        <FaEnvelope />
                                    </span>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter your username"
                                        className="custom-input border-start-0 ps-0"
                                        required
                                    />
                                </div>
                            </Form.Group>

                            {/* Password Input */}
                            <Form.Group className="mb-4" controlId="formBasicPassword">
                                <div className="d-flex justify-content-between">
                                    <Form.Label className="fw-medium text-secondary">Password</Form.Label>
                                    <Link to="/forgot-password" style={{ textDecoration: 'none', fontSize: '0.9rem', color: '#ee4d2d' }}>
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0 text-muted">
                                        <FaLock />
                                    </span>
                                    <Form.Control
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        className="custom-input border-start-0 ps-0 border-end-0"
                                        required
                                    />
                                    <span
                                        className="input-group-text bg-white border-start-0 text-muted"
                                        style={{ cursor: 'pointer' }}
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                            </Form.Group>

                            {/* Remember Me Checkbox */}
                            <Form.Group className="mb-4" controlId="formBasicCheckbox">
                                <Form.Check type="checkbox" label="Remember me for 30 days" className="text-muted small" />
                            </Form.Group>

                            {/* Submit Button */}
                            <Button variant="primary" type="submit" className="w-100 btn-login mb-4 text-white">
                                Log In
                            </Button>

                            {/* Divider */}
                            <div className="d-flex align-items-center mb-4">
                                <hr className="flex-grow-1" />
                                <span className="mx-3 text-muted small">OR CONTINUE WITH</span>
                                <hr className="flex-grow-1" />
                            </div>

                            {/* Social Buttons (Optional UI) */}
                            <div className="d-flex gap-2 mb-4">
                                <Button variant="light" className="w-50 social-btn d-flex align-items-center justify-content-center">
                                    <FaGoogle className="me-2" /> Google
                                </Button>
                                <Button variant="light" className="w-50 social-btn d-flex align-items-center justify-content-center">
                                    <FaFacebookF className="me-2" style={{ color: '#1877F2' }} /> Facebook
                                </Button>
                            </div>

                            {/* Footer Link */}
                            <div className="text-center mt-3">
                                <p className="text-muted">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="fw-bold" style={{ color: '#ee4d2d', textDecoration: 'none' }}>
                                        Create an account
                                    </Link>
                                </p>
                            </div>
                        </Form>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default Login;