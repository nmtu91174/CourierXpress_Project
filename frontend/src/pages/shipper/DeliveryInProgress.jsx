import { useState, useEffect } from "react";
import { FaCamera, FaCheckCircle, FaMapMarkerAlt } from "react-icons/fa";
import { Container, Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../assets/styles/shipper/DeliveryInProgress.css";

const API_BASE = "http://localhost:8888/api/shipper/";

export default function DeliveryInProgress() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [images, setImages] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}list_in_progress.php`, {
        withCredentials: true,
      });

      if (res.data.status === "success") {
        setOrders(res.data.data || []);
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

  const handleImageChange = (orderId, file) => {
    if (file) {
      setImages((prev) => ({
        ...prev,
        [orderId]: URL.createObjectURL(file),
      }));
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
    <div className="delivery-wrapper container my-5">
      <h2 className="delivery-title mb-4">🚚 Đơn hàng đang giao</h2>

      {orders.length === 0 ? (
        <Alert variant="info">Hiện không có đơn hàng nào đang giao.</Alert>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="delivery-block mb-5">
            {/* ORDER INFO */}
            <div className="delivery-card mb-3">
              <p>
                <strong>Mã đơn:</strong> #{order.order_code}
              </p>
              <p>
                <FaMapMarkerAlt /> <strong>Địa chỉ:</strong> {order.receiver_address}
              </p>
              <p>
                <strong>Người nhận:</strong> {order.receiver_name}
              </p>
              <p>
                <strong>SĐT:</strong> {order.receiver_phone}
              </p>
              <p>
                <strong>Trạng thái:</strong> Đang giao
              </p>
            </div>

            {/* UPLOAD IMAGE */}
            <div className="delivery-upload mb-3">
              <label className="upload-box">
                <FaCamera size={28} />
                <span>Chụp ảnh xác nhận giao hàng</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleImageChange(order.id, e.target.files[0])}
                />
              </label>

              {images[order.id] && (
                <div className="preview mt-3">
                  <img src={images[order.id]} alt="Preview" />
                </div>
              )}
            </div>

            {/* COMPLETE BUTTON */}
            <button
              className="btn btn-success delivery-btn"
              onClick={() => navigate(`/shipper/order/${order.id}`)}
            >
              <FaCheckCircle /> Chi tiết & Xác nhận giao hàng
            </button>
          </div>
        ))
      )}
    </div>
  );
}
