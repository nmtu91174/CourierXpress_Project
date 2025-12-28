import { useState, useEffect } from "react";
import { FaBox, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaPhone } from "react-icons/fa";
import { Container, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import "../../assets/styles/shipper/OrderHistoryShipper.css";

const API_BASE = "http://localhost:8888/api/shipper/";

export default function OrderHistoryShipper() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}get_dashboard.php`, {
        withCredentials: true,
      });

      if (res.data.status === "success") {
        const data = res.data.data;
        
        // Lấy completed orders (status = 5)
        const completed = (data.completed_orders || []).map((o) => ({
          id: o.order_code || `ORD${o.id}`,
          order_id: o.id,
          customerName: o.receiver_name || "N/A",
          phone: o.receiver_phone || "",
          from: o.sender_address || "",
          to: o.receiver_address || "",
          status: "Delivered",
          statusCode: 5,
          date: o.created_at ? new Date(o.created_at).toLocaleDateString("vi-VN") : "",
          createdAt: o.created_at,
        }));

        // Lấy failed orders (status = 6)
        const failed = (data.failed_orders || []).map((o) => ({
          id: o.order_code || `ORD${o.id}`,
          order_id: o.id,
          customerName: o.receiver_name || "N/A",
          phone: o.receiver_phone || "",
          from: o.sender_address || "",
          to: o.receiver_address || "",
          status: "Failed",
          statusCode: 6,
          reason: o.failed_reason || "Unknown",
          date: o.failed_at ? new Date(o.failed_at).toLocaleDateString("vi-VN") : (o.created_at ? new Date(o.created_at).toLocaleDateString("vi-VN") : ""),
          createdAt: o.failed_at || o.created_at,
        }));

        // Gộp cả hai loại và sắp xếp theo ngày (mới nhất trước)
        const allOrders = [...completed, ...failed].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        setOrders(allOrders);
        setError(null);
      } else {
        setError(res.data.message || "Failed to load orders");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders =
    filter === "all"
      ? orders
      : filter === "Delivered"
      ? orders.filter((order) => order.status === "Delivered")
      : orders.filter((order) => order.status === "Failed");

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("vi-VN");
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <div className="order-history container my-5">
      <h2 className="title">📦 Order History</h2>

      {/* FILTER BUTTONS */}
      <div className="filter-group">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={filter === "Delivered" ? "active" : ""}
          onClick={() => setFilter("Delivered")}
        >
          Delivered
        </button>
        <button
          className={filter === "Failed" ? "active" : ""}
          onClick={() => setFilter("Failed")}
        >
          Failed
        </button>
      </div>

      {orders.length === 0 ? (
        <Alert variant="info" className="mt-4">
          No orders in history yet.
        </Alert>
      ) : (
        <>
          <div className="row g-4">
            {filteredOrders.map((order) => (
              <div key={order.order_id || order.id} className="col-md-4">
                <div
                  className="history-card"
                  onClick={() => setSelectedOrder(order)}
                >
                  <h5>#{order.id}</h5>
                  <p>{order.to}</p>
                  <span className={`status ${order.status === "Delivered" ? "done" : "cancel"}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* MODAL */}
          {selectedOrder && (
            <div className="order-modal" onClick={() => setSelectedOrder(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h4>Order Details #{selectedOrder.id}</h4>

                <p>
                  <strong>Customer:</strong> {selectedOrder.customerName}
                </p>
                <p>
                  <strong>Phone:</strong> {selectedOrder.phone}
                </p>
                <p>
                  <strong>Sender Address:</strong> {selectedOrder.from}
                </p>
                <p>
                  <strong>Receiver Address:</strong> {selectedOrder.to}
                </p>
                <p>
                  <strong>Date:</strong> {selectedOrder.date}
                </p>
                <p>
                  <strong>Status:</strong> {selectedOrder.status}
                </p>

                {selectedOrder.status === "Failed" && selectedOrder.reason && (
                  <p className="cancel-reason">
                    <strong>Failure Reason:</strong> {selectedOrder.reason}
                  </p>
                )}

                <button onClick={() => setSelectedOrder(null)}>Close</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
