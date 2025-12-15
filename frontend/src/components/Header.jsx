import React, { useState, useEffect, useMemo } from "react";
import { Navbar, Container, Nav, Button, NavDropdown } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaShippingFast } from "react-icons/fa";

const Header = ({ className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);

  // ==========================
  // LOAD USER (SAFE)
  // ==========================
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      setUser(parsed);
    } catch (e) {
      console.error("Header: cannot parse user", e);
      setUser(null);
    }
  }, []);

  // ==========================
  // NORMALIZE ROLE (VERY IMPORTANT)
  // ==========================
  const role = useMemo(
    () => user?.role?.toLowerCase()?.trim(),
    [user]
  );

  // ==========================
  // LOGOUT
  // ==========================
  const handleLogout = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "null");

      if (userData?.id) {
        try {
          await fetch("http://localhost:8888/api/auth/logout.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              user_id: userData.id,
              role: userData.role,
            }),
          });
        } catch (apiError) {
          console.error("Logout API error:", apiError);
        }
      }
    } finally {
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  return (
    <Navbar bg="white" expand="lg" className={`shadow-sm ${className}`}>
      <Container>
        {/* BRAND */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <FaShippingFast
            size={46}
            style={{ transform: "scaleX(-1)" }}
            className="me-2 text-danger"
          />
          <div className="d-flex flex-column">
            <span className="fw-bold fs-3 lh-1">CourierXpress</span>
            <span
              className="fw-bold fs-10 text-dark lh-1"
              style={{ letterSpacing: "1px" }}
            >
              Logistics
            </span>
          </div>
        </Navbar.Brand>

        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="ms-auto align-items-center">

            {/* HOME – chỉ customer hoặc chưa login */}
            {(!user || role === "customer") && (
              <Nav.Link as={Link} to="/" className="fw-bold fs-10 text-dark">
                Home
              </Nav.Link>
            )}

            {/* TRACKING – SPA SAFE */}
            <NavDropdown
              title="Tracking"
              id="tracking-nav"
              className="fw-bold fs-10 text-dark"
            >
              <NavDropdown.Item as={Link} to="/tracking">
                Tracking
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/createorder">
                Make An Order
              </NavDropdown.Item>
            </NavDropdown>

            {/* SHIPPER MENU */}
            {role === "shipper" && (
              <NavDropdown
                title="Shipper"
                id="shipper-nav"
                className="fw-bold fs-10 text-dark"
              >
                <NavDropdown.Item as={Link} to="/shipper/home">
                  Shipper Dashboard
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/shipper/about">
                  About Us
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/shipper/contact">
                  Contact
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/shipper/on-the-way">
                 Delivery In Progress
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/shipper/order-history">
                  OrderHistory
                </NavDropdown.Item>
              </NavDropdown>
            )}

            {/* SERVICES (STATIC – NO ROUTE) */}
            <NavDropdown
              title="Services"
              id="services-nav"
              className="fw-bold fs-10 text-dark"
            >
              <NavDropdown.Item>Action</NavDropdown.Item>
              <NavDropdown.Item>Another action</NavDropdown.Item>
              <NavDropdown.Item>Something</NavDropdown.Item>
            </NavDropdown>

            {/* PARTNER – customer hoặc chưa login */}
            {(!user || role === "customer") && (
              <NavDropdown
                title="Become a Partner"
                id="partner-nav"
                className="fw-bold fs-10 text-dark"
              >
                <NavDropdown.Item>Action</NavDropdown.Item>
                <NavDropdown.Item>Another action</NavDropdown.Item>
              </NavDropdown>
            )}

            {/* HELP */}
            <NavDropdown
              title="Help Center"
              id="help-nav"
              className="fw-bold fs-10 text-dark"
            >
              <NavDropdown.Item>Help</NavDropdown.Item>
              <NavDropdown.Item>Support</NavDropdown.Item>
            </NavDropdown>

            {/* USER / LOGIN */}
            {user ? (
              <div className="d-flex align-items-center ms-3">
                <span className="me-2 fw-bold text-dark">{user.name}</span>
                <Button
                  variant="outline-danger"
                  className="rounded-pill px-4"
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
                className="ms-3 rounded-pill px-4"
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
