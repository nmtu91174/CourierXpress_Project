import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle, FaFacebookF } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";
import "../../assets/styles/auth/login.css";


const Login = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };
    

    const handleSubmit = async (e) => {
    e.preventDefault();

    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
    });

    // --- VALIDATE THỦ CÔNG ---

    if (!email.trim()) {
        return Toast.fire({ icon: "error", title: "Vui lòng nhập email!" });
    }

    // regex kiểm tra email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return Toast.fire({ icon: "error", title: "Email không hợp lệ!" });
    }

    if (!password.trim()) {
        return Toast.fire({ icon: "error", title: "Vui lòng nhập mật khẩu!" });
    }

    // --- GỌI API ---
    try {
        const res = await fetch("http://localhost:8888/login.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (data.status === "success") {
            Toast.fire({
                icon: "success",
                title: "Đăng nhập thành công!"
            });

            localStorage.setItem("user", JSON.stringify(data.user));

            setTimeout(() => {
                if (data.user.role === "admin") {
                    navigate("/admin");     
                } else if (data.user.role === "shipper") {
                    navigate("/shipper/home");     
                } else {
                    navigate("/");       
                }
            }, 1500);

        } else {
            Toast.fire({
                icon: "error",
                title: data.message || "Đăng nhập thất bại!"
            });
        }

    } catch (error) {
        Toast.fire({
            icon: "error",
            title: "Không thể kết nối server!"
        });
    }
};





    return (
        <Container fluid className="login-container">
            <Row className="h-100">

                {/* LEFT BANNER */}
                <Col md={6} lg={7} className="login-banner d-none d-md-block">
                    <div className="banner-content">
                        <h1 className="display-4 fw-bold mb-3">CourierXpress</h1>
                        <p className="lead fs-4">Fast. Reliable. Worldwide.</p>
                        <p className="mt-4 w-75">
                            Manage shipments and track deliveries with ease.
                        </p>
                    </div>
                </Col>

                {/* FORM */}
                <Col md={6} lg={5} className="login-form-section">
                    <div className="login-card">

                        <div className="text-center mb-5">
                            <h2 className="fw-bold text-dark">Welcome Back</h2>
                            <p className="text-muted">Please login to continue</p>
                        </div>

            


                        <Form onSubmit={handleSubmit}>

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
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                            </Form.Group>

                            <Button type="submit" className="w-100 btn-login mb-4 text-white">
                                Log In
                            </Button>

                            <div className="text-center">
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

export default Login;
