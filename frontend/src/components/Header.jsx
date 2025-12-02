// src/components/Header.jsx
import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <Navbar bg="white" expand="lg" className="shadow-sm sticky-top">
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold text-spx fs-3">
                    CourierXpress <span className="fs-6 text-dark">Logistics</span>
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center">
                        <Nav.Link as={Link} to="/" className="fw-medium">Trang chủ</Nav.Link>
                        <Nav.Link as={Link} to="/about" className="fw-medium">Về chúng tôi</Nav.Link>
                        <Nav.Link as={Link} to="/tracking" className="fw-medium">Tra cứu</Nav.Link>

                        {/* Nút đăng nhập/đăng ký cho Admin/Agent/User */}
                        <Button as={Link} to="/login" variant="outline-danger" className="ms-3 rounded-pill px-4">
                            Đăng nhập
                        </Button>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Header;