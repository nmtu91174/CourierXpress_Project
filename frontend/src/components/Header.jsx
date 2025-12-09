// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Navbar, Container, Nav, Button, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaShippingFast } from "react-icons/fa";

// THAY ĐỔI: Chấp nhận props className
const Header = ({ className }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Lấy user từ localStorage khi component mount
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) setUser(storedUser);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
        navigate("/"); // Quay về trang chủ sau khi logout
    };

    return (
        // THAY ĐỔI: Loại bỏ sticky-top và dùng className từ props
        <Navbar bg="white" expand="lg" className={`shadow-sm ${className}`}>
            <Container>
                <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
                    <FaShippingFast size={50} style={{ transform: 'scaleX(-1)' }} className="me-2 text-danger" />
                    <div className="d-flex flex-column">
                        <span className="fw-bold text-spx fs-3 lh-1">CourierXpress</span>
                        <span className="fw-bold fs-10 text-dark lh-1" style={{ letterSpacing: '1px' }}>Logistics</span>
                    </div>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center">

                        {/* Home chỉ hiển thị cho customer hoặc khi chưa login */}
                        {(!user || user.role === 'customer') && (
                            <Nav.Link as={Link} to="/" className="fw-bold fs-10 text-dark">Home</Nav.Link>
                        )}

                        {/* Tracking luôn hiển thị */}
                        <NavDropdown title="Tracking" id="services-nav-dropdown" className="fw-bold fs-10 text-dark">
                            <NavDropdown.Item href="/tracking">Tracking</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="/createorder">Make An Order</NavDropdown.Item>
                        </NavDropdown>

                        {/* Menu Shipper chỉ hiển thị khi role = 'shipper' */}
                        {user?.role === 'shipper' && (
                            <NavDropdown title="Shipper" id="shipper-nav-dropdown" className="fw-bold fs-10 text-dark">
                                <NavDropdown.Item as={Link} to="/shipper/home" className="fw-semibold">Shipper Dashboard</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item as={Link} to="/shipper/about">About Us</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/shipper/contact">Contact</NavDropdown.Item>
                            </NavDropdown>
                        )}

                        {/* Services luôn hiển thị */}
                        <NavDropdown title="Services" id="services-nav-dropdown" className="fw-bold fs-10 text-dark">
                            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
                        </NavDropdown>

                        {/* Become a Partner chỉ customer hoặc chưa login */}
                        {(!user || user.role === 'customer') && (
                            <NavDropdown title="Become a Partner" id="partner-nav-dropdown" className="fw-bold fs-10 text-dark">
                                <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                                <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
                                <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
                            </NavDropdown>
                        )}

                        {/* Help Center luôn hiển thị */}
                        <NavDropdown title="Help Center" id="help-nav-dropdown" className="fw-bold fs-10 text-dark">
                            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
                        </NavDropdown>

                        {/* LOGIN / USER INFO */}
                        {user ? (
                            <div className="d-flex align-items-center ms-3">
                                <span className="me-2 fw-bold text-dark">{user.name}</span>
                                <Button
                                    variant="outline-danger"
                                    className="rounded-pill px-4 btn-spx-outline"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </Button>
                            </div>
                        ) : (
                            <Button
                                as={Link}
                                to="/login"
                                variant="outline-danger"
                                className="ms-3 rounded-pill px-4 btn-spx-outline"
                            >
                                Login
                            </Button>
                        )}

                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Header;