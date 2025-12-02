// src/components/Header.jsx
import React from 'react';
import { Navbar, Container, Nav, Button, NavDropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaShippingFast } from "react-icons/fa";

const Header = () => {
    return (
        <Navbar bg="white" expand="lg" className="shadow-sm sticky-top">
            <Container>
                {/* <Navbar.Brand as={Link} to="/" className="d-flex flex-column align-items-start">
                    <span className="fw-bold text-spx fs-3 lh-1">CourierXpress</span>
                    <span className="fw-bold fs-10 text-dark lh-1">Logistics</span>
                </Navbar.Brand> */}

                {/* --- BẮT ĐẦU PHẦN LOGO ĐÃ SỬA --- */}
                {/* d-flex align-items-center: Biến Brand thành hàng ngang và căn giữa theo chiều dọc */}
                <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">

                    {/* Phần Icon */}
                    {/* size={38}: Kích thước icon
              me-2: Margin end 2 (khoảng cách bên phải icon)
              text-danger: Màu đỏ (bạn có thể đổi thành text-primary, text-success...) */}
                    <FaShippingFast size={50} style={{ transform: 'scaleX(-1)' }} className="me-2 text-danger" />

                    {/* Phần khối văn bản (Cấu trúc cột dọc như bước trước) */}
                    <div className="d-flex flex-column">
                        <span className="fw-bold text-spx fs-3 lh-1">CourierXpress</span>
                        <span className="fw-bold fs-10 text-dark lh-1" style={{ letterSpacing: '1px' }}>Logistics</span>
                    </div>

                </Navbar.Brand>
                {/* --- KẾT THÚC PHẦN LOGO ĐÃ SỬA --- */}

                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center">

                        <Nav.Link as={Link} to="/" className="fw-bold fs-10 text-dark">Home</Nav.Link>

                        <NavDropdown title="Shipping" id="basic-nav-dropdown" className="fw-bold fs-10 text-dark">
                            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.2">
                                Another action
                            </NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#action/3.4">
                                Separated link
                            </NavDropdown.Item>
                        </NavDropdown>

                        <NavDropdown title="Services" id="basic-nav-dropdown" className="fw-bold fs-10 text-dark">
                            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.2">
                                Another action
                            </NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#action/3.4">
                                Separated link
                            </NavDropdown.Item>
                        </NavDropdown>

                        <NavDropdown title="Become a Partner" id="basic-nav-dropdown" className="fw-bold fs-10 text-dark">
                            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.2">
                                Another action
                            </NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#action/3.4">
                                Separated link
                            </NavDropdown.Item>
                        </NavDropdown>

                        <NavDropdown title="Help Center" id="basic-nav-dropdown" className="fw-bold fs-10 text-dark">
                            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.2">
                                Another action
                            </NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#action/3.4">
                                Separated link
                            </NavDropdown.Item>
                        </NavDropdown>

                        {/* Dùng as={Link} để biến Button thành liên kết, to="/login" là đích đến */}
                        <Button
                            as={Link}
                            to="/login"
                            variant="outline-danger"
                            className="ms-3 rounded-pill px-4 btn-spx-outline" // Class tùy chỉnh nếu có
                        >
                            Login
                        </Button>

                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Header;