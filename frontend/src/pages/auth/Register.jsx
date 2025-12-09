import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Alert } from "react-bootstrap";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../../assets/styles/auth/login.css";

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const role = params.get("role") || "customer";

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");

    const handleRegister = async (e) => {
    e.preventDefault();

    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
    });

    // Validate thủ công
    if (!name.trim()) {
        return Toast.fire({ icon: "error", title: "Vui lòng nhập tên!" });
    }

    if (!email.trim()) {
        return Toast.fire({ icon: "error", title: "Vui lòng nhập email!" });
    }

    // Regex kiểm tra email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return Toast.fire({ icon: "error", title: "Email không hợp lệ!" });
    }

    if (!password.trim()) {
        return Toast.fire({ icon: "error", title: "Vui lòng nhập mật khẩu!" });
    }

    if (!confirmPassword.trim()) {
        return Toast.fire({ icon: "error", title: "Vui lòng xác nhận mật khẩu!" });
    }

    if (password !== confirmPassword) {
        return Toast.fire({ icon: "error", title: "Mật khẩu xác nhận không khớp!" });
    }

    // Nếu qua validate → gọi API
    try {
        const res = await fetch("http://localhost:8888/register.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                email,
                password,
                confirmPassword,
                role,
            }),
        });

        const data = await res.json();

        if (data.status === "success") {
            Toast.fire({
                icon: "success",
                title: data.message || "Đăng ký thành công!",
            });

            setTimeout(() => navigate("/login"), 1500);

        } else {
            Toast.fire({
                icon: "error",
                title: data.message || "Đăng ký thất bại!",
            });
        }

    } catch (error) {
        Toast.fire({
            icon: "error",
            title: "Không thể kết nối server!",
        });
    }
};



    return (
        <Container fluid className="login-container">
            <Row className="h-100">

                {/* LEFT BANNER – GIỐNG LOGIN */}
                <Col md={6} lg={7} className="login-banner d-none d-md-block">
                    <div className="banner-content">
                        <h1 className="display-4 fw-bold mb-3">Join Us</h1>
                        <p className="lead fs-4">Fast. Reliable. Worldwide.</p>
                        <p className="mt-4 w-75">
                            Create your account and start managing your deliveries.
                        </p>
                    </div>
                </Col>

                {/* RIGHT FORM SECTION */}
                <Col md={6} lg={5} className="login-form-section">
                    <div className="login-card">

                        <div className="text-center mb-5">
                            <h2 className="fw-bold text-dark">Create Account</h2>
                            <p className="text-muted">Fill in the information below</p>
                        </div>

                        {message && (
                            <Alert
                                variant={status === "success" ? "success" : "danger"}
                                className="text-center"
                            >
                                {message}
                            </Alert>
                        )}

                        <Form onSubmit={handleRegister}>

                        {/* GRID 2 CỘT */}
                        <Row>

                            {/* CỘT TRÁI */}
                            <Col md={6}>

                                {/* FULL NAME */}
                                <Form.Group className="mb-4">
                                    <Form.Label>Full Name</Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white border-end-0 text-muted">
                                            <FaUser />
                                        </span>
                                        <Form.Control
                                            type="text"
                                            placeholder="Enter name"
                                            className="custom-input border-start-0 ps-0"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                </Form.Group>

                                {/* PASSWORD */}
                                <Form.Group className="mb-4">
                                    <Form.Label>Password</Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white border-end-0 text-muted">
                                            <FaLock />
                                        </span>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter password"
                                            className="custom-input border-start-0 ps-0 border-end-0"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            
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

                                {/* EMAIL */}
                                <Form.Group className="mb-4">
                                    <Form.Label>Email</Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white border-end-0 text-muted">
                                            <FaEnvelope />
                                        </span>
                                        <Form.Control
                                            type="text"
                                            placeholder="Enter email"
                                            className="custom-input border-start-0 ps-0"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </Form.Group>

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

                        {/* BUTTON */}
                        <Button type="submit" className="w-100 btn-login text-white mb-4">
                            Create Account
                        </Button>

                        <div className="text-center">
                            <p className="text-muted">
                                Already have an account?{" "}
                                <Link to="/login" className="fw-bold" style={{ color: "#ee4d2d" }}>
                                    Login Now
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

export default Register;
