import { FaTruck, FaCheckCircle, FaTimesCircle, FaEye, FaBox } from "react-icons/fa";
import { Card, Row, Col } from "react-bootstrap";
import orders from "../../data/userOrders.json";
import "../../assets/styles/user_profile.css";

export default function UserOrdersPagePro() {
  const getStatusMeta = (status) => {
    switch (status) {
      case "Delivered":
        return { className: "order-status success", icon: <FaCheckCircle /> };
      case "In Delivery":
        return { className: "order-status warning", icon: <FaTruck /> };
      case "Failed":
        return { className: "order-status danger", icon: <FaTimesCircle /> };
      default:
        return { className: "order-status", icon: null };
    }
  };

  return (
    <div className="profile-layout">
      <main className="profile-main">
        {/* Header */}
        <div className="orders-header">
          <h2>My Orders</h2>
          <p className="text-muted">Track your complete delivery history</p>
        </div>

        {/* Stats KPI - White Cards */}
        <Row className="mb-4 g-3">
          <Col md={3}>
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#ffffff" }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-uppercase small fw-semibold text-muted mb-2" style={{ letterSpacing: "0.5px" }}>
                      Total Orders
                    </div>
                    <h2 className="fw-bold mb-1" style={{ color: "#1e293b", fontSize: "32px" }}>
                      {orders.length}
                    </h2>
                  </div>
                  <FaBox size={40} className="text-primary" style={{ opacity: 0.8 }} />
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#ffffff" }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-uppercase small fw-semibold text-muted mb-2" style={{ letterSpacing: "0.5px" }}>
                      Delivered
                    </div>
                    <h2 className="fw-bold mb-1" style={{ color: "#1e293b", fontSize: "32px" }}>
                      {orders.filter(o => o.status === "Delivered").length}
                    </h2>
                  </div>
                  <FaCheckCircle size={40} className="text-success" style={{ opacity: 0.8 }} />
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#ffffff" }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-uppercase small fw-semibold text-muted mb-2" style={{ letterSpacing: "0.5px" }}>
                      In Delivery
                    </div>
                    <h2 className="fw-bold mb-1" style={{ color: "#1e293b", fontSize: "32px" }}>
                      {orders.filter(o => o.status === "In Delivery").length}
                    </h2>
                  </div>
                  <FaTruck size={40} className="text-warning" style={{ opacity: 0.8 }} />
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#ffffff" }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-uppercase small fw-semibold text-muted mb-2" style={{ letterSpacing: "0.5px" }}>
                      Failed
                    </div>
                    <h2 className="fw-bold mb-1" style={{ color: "#1e293b", fontSize: "32px" }}>
                      {orders.filter(o => o.status === "Failed").length}
                    </h2>
                  </div>
                  <FaTimesCircle size={40} className="text-danger" style={{ opacity: 0.8 }} />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Orders Table */}
        <div className="profile-card mt-4">
          <table className="table table-hover align-middle orders-table">
            <thead>
              <tr>
                <th>Order Code</th>
                <th>Receiver</th>
                <th>Area</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const meta = getStatusMeta(order.status);
                return (
                  <tr key={order.id}>
                    <td className="fw-bold">{order.id}</td>
                    <td>{order.receiver}</td>
                    <td>{order.area}</td>
                    <td>{order.date}</td>
                    <td>
                      <span className={meta.className}>
                        {meta.icon} {order.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-primary">
                        <FaEye /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
