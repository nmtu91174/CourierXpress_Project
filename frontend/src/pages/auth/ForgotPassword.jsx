// frontend/src/pages/auth/ForgotPassword.jsx
// Forgot Password - DQN Luxury Design
// Học tập giao diện từ Register.jsx

import React, { useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import emailjs from "emailjs-com";
import { EMAILJS_AUTH_CONFIG } from "../../config/emailjs.auth.config";
import "../../assets/styles/auth/login.css";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

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
        if (!email.trim()) {
            return Toast.fire({ icon: "error", title: "Please enter your email!" });
        }

        // Email regex validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return Toast.fire({ icon: "error", title: "Invalid email format!" });
        }

        setLoading(true);

        try {
            const res = await fetch("http://localhost:8888/api/auth/forgot_password.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("API Error:", res.status, errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    return Toast.fire({
                        icon: "error",
                        title: errorData.message || "Failed to send reset email!"
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

            if (data.status === "success" && data.reset_link) {
                // Frontend sends email via EmailJS (Option B)
                try {
                    // Calculate expiration time (15 minutes from now)
                    const expirationTime = new Date();
                    expirationTime.setMinutes(expirationTime.getMinutes() + 15);
                    const timeString = expirationTime.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });

                    // Prepare email data for EmailJS template
                    const emailData = {
                        to: data.email || email, // EmailJS routing variable
                        user_name: data.user_name || email.split("@")[0], // User name
                        reset_link: data.reset_link, // Reset link
                        company_name: "CourierXpress",
                        time: timeString // Expiration time
                    };

                    // Send email via EmailJS (DQN's account)
                    await emailjs.send(
                        EMAILJS_AUTH_CONFIG.SERVICE_ID,
                        EMAILJS_AUTH_CONFIG.TEMPLATE_ID,
                        emailData,
                        EMAILJS_AUTH_CONFIG.PUBLIC_KEY
                    );

                    console.log("✅ Password reset email sent successfully via EmailJS");

                    Toast.fire({
                        icon: "success",
                        title: "Password reset link has been sent to your email."
                    });

                    // In development, also log reset link
                    if (process.env.NODE_ENV === "development") {
                        console.log("🔗 Password Reset Link (DEV ONLY):", data.reset_link);
                        console.log("📧 Email sent to:", data.email || email);
                    }

                } catch (emailError) {
                    console.error("❌ EmailJS sending failed:", emailError);
                    // Still show success to user (security best practice)
                    Toast.fire({
                        icon: "success",
                        title: "If the email exists, a reset link has been sent."
                    });
                }

                // Redirect to login after 2 seconds
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else if (data.status === "success") {
                // Backend returned success but no reset_link (shouldn't happen, but handle gracefully)
                Toast.fire({
                    icon: "success",
                    title: data.message || "If the email exists, a reset link has been sent."
                });

                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else {
                Toast.fire({
                    icon: "error",
                    title: data.message || "Failed to send reset email!"
                });
            }

        } catch (error) {
            console.error("Forgot password error:", error);
            Toast.fire({
                icon: "error",
                title: error.message || "Cannot connect to server!"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="login-container">
            <Row className="h-100">
                {/* LEFT BANNER – GIỐNG LOGIN/REGISTER */}
                <Col md={6} lg={7} className="login-banner d-none d-md-block">
                    <div className="banner-content">
                        <h1 className="display-4 fw-bold mb-3">Reset Password</h1>
                        <p className="lead fs-4">Fast. Reliable. Worldwide.</p>
                        <p className="mt-4 w-75">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>
                </Col>

                {/* RIGHT FORM SECTION */}
                <Col md={6} lg={5} className="login-form-section">
                    <div className="login-card">
                        <div className="text-center mb-5">
                            <h2 className="fw-bold text-dark">Forgot Password</h2>
                            <p className="text-muted">Enter your email to reset password</p>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            {/* EMAIL */}
                            <Form.Group className="mb-4">
                                <Form.Label>Email Address</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0 text-muted">
                                        <FaEnvelope />
                                    </span>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter your email"
                                        className="custom-input border-start-0 ps-0"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </Form.Group>

                            {/* SUBMIT BUTTON */}
                            <Button 
                                type="submit" 
                                className="w-100 btn-login text-white mb-4"
                                disabled={loading}
                            >
                                {loading ? "Sending..." : "Send Reset Link"}
                            </Button>

                            {/* BACK TO LOGIN */}
                            <div className="text-center">
                                <Link 
                                    to="/login" 
                                    className="d-inline-flex align-items-center text-decoration-none text-muted"
                                    style={{ fontSize: "0.9rem" }}
                                >
                                    <FaArrowLeft className="me-2" />
                                    Back to Login
                                </Link>
                            </div>

                            <div className="text-center mt-3">
                                <p className="text-muted">
                                    Don't have an account?{" "}
                                    <Link to="/option" className="fw-bold" style={{ color: "#ee4d2d" }}>
                                        Create one
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

export default ForgotPassword;

