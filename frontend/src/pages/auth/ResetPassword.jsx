// frontend/src/pages/auth/ResetPassword.jsx
// Reset Password - DQN Luxury Design
// Học tập giao diện từ Register.jsx

import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import "../../assets/styles/auth/login.css";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tokenValid, setTokenValid] = useState(null); // null = checking, true = valid, false = invalid

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            console.warn("No token in URL");
            setTokenValid(false);
            return;
        }

        console.log("Validating token:", token);
        console.log("Token length:", token.length);

        const validateToken = async () => {
            try {
                // URL encode token to handle special characters
                const encodedToken = encodeURIComponent(token);
                const url = `http://localhost:8888/api/auth/validate_reset_token.php?token=${encodedToken}`;
                
                console.log("Validation URL:", url);
                
                const res = await fetch(url, {
                    method: "GET",
                    credentials: "include",
                });

                console.log("Validation response status:", res.status);

                if (res.ok) {
                    const text = await res.text();
                    console.log("Validation response text:", text);
                    
                    try {
                        const data = JSON.parse(text);
                        console.log("Validation response data:", data);
                        setTokenValid(data.status === "success");
                    } catch (parseError) {
                        console.error("Failed to parse validation response:", parseError);
                        setTokenValid(false);
                    }
                } else {
                    const errorText = await res.text();
                    console.error("Validation failed:", res.status, errorText);
                    setTokenValid(false);
                }
            } catch (error) {
                console.error("Token validation error:", error);
                setTokenValid(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
        });

        // Validation
        if (!password.trim()) {
            return Toast.fire({ icon: "error", title: "Please enter new password!" });
        }

        if (password.length < 6) {
            return Toast.fire({ icon: "error", title: "Password must be at least 6 characters!" });
        }

        if (!confirmPassword.trim()) {
            return Toast.fire({ icon: "error", title: "Please confirm your password!" });
        }

        if (password !== confirmPassword) {
            return Toast.fire({ icon: "error", title: "Passwords do not match!" });
        }

        if (!token) {
            return Toast.fire({ icon: "error", title: "Invalid reset token!" });
        }

        setLoading(true);

        try {
            const res = await fetch("http://localhost:8888/api/auth/reset_password.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    token,
                    new_password: password,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("API Error:", res.status, errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    return Toast.fire({
                        icon: "error",
                        title: errorData.message || "Failed to reset password!"
                    });
                } catch {
                    return Toast.fire({
                        icon: "error",
                        title: `Server error (${res.status}): ${errorText.substring(0, 50)}`
                    });
                }
            }

            let data;
            try {
                const text = await res.text();
                data = JSON.parse(text);
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                return Toast.fire({
                    icon: "error",
                    title: "Invalid server response format!"
                });
            }

            if (data.status === "success") {
                Toast.fire({
                    icon: "success",
                    title: data.message || "Password reset successfully!"
                });

                // Redirect to login after 2 seconds
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else {
                Toast.fire({
                    icon: "error",
                    title: data.message || "Failed to reset password!"
                });
            }

        } catch (error) {
            console.error("Reset password error:", error);
            Toast.fire({
                icon: "error",
                title: error.message || "Cannot connect to server!"
            });
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (tokenValid === null) {
        return (
            <Container fluid className="login-container">
                <Row className="h-100">
                    <Col md={6} lg={7} className="login-banner d-none d-md-block">
                        <div className="banner-content">
                            <h1 className="display-4 fw-bold mb-3">Reset Password</h1>
                            <p className="lead fs-4">Fast. Reliable. Worldwide.</p>
                        </div>
                    </Col>
                    <Col md={6} lg={5} className="login-form-section">
                        <div className="login-card">
                            <div className="text-center">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mt-3 text-muted">Validating reset token...</p>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }

    // Invalid token
    if (tokenValid === false) {
        return (
            <Container fluid className="login-container">
                <Row className="h-100">
                    <Col md={6} lg={7} className="login-banner d-none d-md-block">
                        <div className="banner-content">
                            <h1 className="display-4 fw-bold mb-3">Reset Password</h1>
                            <p className="lead fs-4">Fast. Reliable. Worldwide.</p>
                        </div>
                    </Col>
                    <Col md={6} lg={5} className="login-form-section">
                        <div className="login-card">
                            <div className="text-center">
                                <FaCheckCircle className="text-danger mb-3" style={{ fontSize: "3rem" }} />
                                <h3 className="fw-bold mb-3">Invalid or Expired Link</h3>
                                <p className="text-muted mb-4">
                                    This password reset link is invalid or has expired. Please request a new one.
                                </p>
                                <Link to="/forgot-password" className="btn btn-login text-white mb-3">
                                    Request New Reset Link
                                </Link>
                                <div>
                                    <Link to="/login" className="text-decoration-none text-muted">
                                        Back to Login
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }

    // Valid token - show reset form
    return (
        <Container fluid className="login-container">
            <Row className="h-100">
                {/* LEFT BANNER */}
                <Col md={6} lg={7} className="login-banner d-none d-md-block">
                    <div className="banner-content">
                        <h1 className="display-4 fw-bold mb-3">Reset Password</h1>
                        <p className="lead fs-4">Fast. Reliable. Worldwide.</p>
                        <p className="mt-4 w-75">
                            Enter your new password below. Make sure it's strong and secure.
                        </p>
                    </div>
                </Col>

                {/* RIGHT FORM SECTION */}
                <Col md={6} lg={5} className="login-form-section">
                    <div className="login-card">
                        <div className="text-center mb-5">
                            <h2 className="fw-bold text-dark">Set New Password</h2>
                            <p className="text-muted">Enter your new password</p>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            {/* GRID 2 CỘT - GIỐNG REGISTER */}
                            <Row>
                                {/* CỘT TRÁI */}
                                <Col md={6}>
                                    {/* PASSWORD */}
                                    <Form.Group className="mb-4">
                                        <Form.Label>New Password</Form.Label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white border-end-0 text-muted">
                                                <FaLock />
                                            </span>
                                            <Form.Control
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter new password"
                                                className="custom-input border-start-0 ps-0 border-end-0"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={loading}
                                            />
                                            <span
                                                className="input-group-text bg-white border-start-0 text-muted"
                                                style={{ cursor: "pointer" }}
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                                            </span>
                                        </div>
                                    </Form.Group>
                                </Col>

                                {/* CỘT PHẢI */}
                                <Col md={6}>
                                    {/* CONFIRM PASSWORD */}
                                    <Form.Group className="mb-4">
                                        <Form.Label>Confirm Password</Form.Label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white border-end-0 text-muted">
                                                <FaLock />
                                            </span>
                                            <Form.Control
                                                type={showConfirm ? "text" : "password"}
                                                placeholder="Confirm password"
                                                className="custom-input border-start-0 ps-0 border-end-0"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                disabled={loading}
                                            />
                                            <span
                                                className="input-group-text bg-white border-start-0 text-muted"
                                                style={{ cursor: "pointer" }}
                                                onClick={() => setShowConfirm(!showConfirm)}
                                            >
                                                {showConfirm ? <FaEyeSlash /> : <FaEye />}
                                            </span>
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* SUBMIT BUTTON */}
                            <Button 
                                type="submit" 
                                className="w-100 btn-login text-white mb-4"
                                disabled={loading}
                            >
                                {loading ? "Resetting..." : "Reset Password"}
                            </Button>

                            {/* BACK TO LOGIN */}
                            <div className="text-center">
                                <Link 
                                    to="/login" 
                                    className="text-decoration-none text-muted"
                                    style={{ fontSize: "0.9rem" }}
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </Form>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default ResetPassword;

