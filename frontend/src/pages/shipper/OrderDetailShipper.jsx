// frontend/src/pages/shipper/OrderDetailShipper.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Container,
    Card,
    Row,
    Col,
    Button,
    Spinner,
    Alert,
    Modal,
    Form
} from "react-bootstrap";
import {
    FaMapMarkerAlt
} from "react-icons/fa";
import Swal from "sweetalert2";
import axios from "axios";

// [FIX] API base phải khớp với HomePageShipper
const API_BASE = "http://localhost:8888/api/shipper";

const OrderDetailShipper = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pickup
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [actualWeight, setActualWeight] = useState("");
    const [pickupImage, setPickupImage] = useState(null);

    // Delivery
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveryImage, setDeliveryImage] = useState(null);

    // ==========================
    // FETCH ORDER DETAIL
    // ==========================
    useEffect(() => {
        const fetchOrderDetail = async () => {
            setLoading(true);
            try {
                // [FIX QUAN TRỌNG] Gọi đúng API backend
                const res = await axios.get(
                    `${API_BASE}/order_detail.php?order_id=${id}`,
                    { withCredentials: true }
                );

                if (res.data.status === "success") {
                    setOrder(res.data.data);
                    setError(null);
                } else {
                    setError(res.data.message || "Cannot load order details");
                }
            } catch (err) {
                setError(err.response?.data?.message || "Cannot connect to server");
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetail();
    }, [id]);

    // ==========================
    // ACCEPT ASSIGNMENT (2 → 3)
    // ==========================
    const handleAcceptOrder = async () => {
        if (!window.confirm("Are you sure you want to accept this order?")) return;

        setIsSubmitting(true);
        try {
            const res = await axios.post(
                `${API_BASE}/accept_assignment.php`,
                { order_id: order.id },
                { withCredentials: true }
            );

            if (res.data.status === "success") {
                Swal.fire("Success", "Order accepted.", "success")
                    .then(() => navigate("/shipper"));
            } else {
                Swal.fire("Error", res.data.message, "error");
            }
        } catch {
            Swal.fire("Error", "Cannot connect to server", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================
    // CONFIRM PICKUP (3 → 4)
    // ==========================
    const handleConfirmPickupSubmit = async () => {
        if (!actualWeight || !pickupImage) {
            Swal.fire("Warning", "Missing data", "warning");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("order_id", order.id);
        formData.append("actual_weight", actualWeight);
        formData.append("image", pickupImage);

        try {
            const res = await axios.post(
                `${API_BASE}/confirm_pickup.php`,
                formData,
                { withCredentials: true }
            );

            if (res.data.status === "success") {
                Swal.fire("Success", "Pickup confirmed", "success");
                setShowPickupModal(false);
                // Re-fetch order details after pickup confirmation
                window.location.reload();
            } else {
                Swal.fire("Error", res.data.message, "error");
            }
        } catch {
            Swal.fire("Error", "Server error", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================
    // CONFIRM DELIVERY (4 → 5)
    // ==========================
    const handleConfirmDeliverySubmit = async () => {
        if (!deliveryImage) {
            Swal.fire("Warning", "Upload proof image", "warning");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("order_id", order.id);
        formData.append("image", deliveryImage);

        try {
            const res = await axios.post(
                `${API_BASE}/confirm_delivery.php`,
                formData,
                { withCredentials: true }
            );

            if (res.data.status === "success") {
                Swal.fire("Success", "Delivered", "success");
                setShowDeliveryModal(false);
                // Re-fetch order details after delivery confirmation
                window.location.reload();
            } else {
                Swal.fire("Error", res.data.message, "error");
            }
        } catch {
            Swal.fire("Error", "Server error", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Container className="py-5 text-center"><Spinner /></Container>;
    if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!order) return null;

    // ==========================
    // STATUS FLAGS (FIXED)
    // ==========================
    // [FIX] Shipper đã được filter ở backend → chỉ cần check status
    const isAssigned = parseInt(order.status) === 2;
    const isPickingUp = parseInt(order.status) === 3;
    const isInTransit = parseInt(order.status) === 4;
    const isCompleted = parseInt(order.status) === 5;

    return (
        <Container className="py-5">
            <h2 className="fw-bold mb-4">
                Order #{order.order_code}
            </h2>

            <Card className="shadow-sm">
                <Card.Header className="bg-danger text-white">
                    <FaMapMarkerAlt className="me-2" />
                    Delivery Info
                </Card.Header>
                <Card.Body className="d-flex justify-content-between align-items-center">

                    <strong>Status: {order.status}</strong>

                    {isAssigned && (
                        <Button onClick={handleAcceptOrder} disabled={isSubmitting}>
                            Accept Assignment
                        </Button>
                    )}

                    {isPickingUp && (
                        <Button variant="warning" onClick={() => setShowPickupModal(true)}>
                            Confirm Pickup
                        </Button>
                    )}

                    {isInTransit && (
                        <Button variant="success" onClick={() => setShowDeliveryModal(true)}>
                            Confirm Delivery
                        </Button>
                    )}

                    {isCompleted && (
                        <Button variant="secondary" disabled>
                            Completed
                        </Button>
                    )}
                </Card.Body>
            </Card>
            {/* ==========================
    CONFIRM PICKUP MODAL
    ========================== */}
            <Modal
                show={showPickupModal}
                onHide={() => setShowPickupModal(false)}
                backdrop="static"
                centered
            >
                {/* ==========================
        HEADER
        ========================== */}
                <Modal.Header closeButton>
                    <Modal.Title>
                        📦 Confirm Pickup
                    </Modal.Title>
                </Modal.Header>

                {/* ==========================
        BODY
        ========================== */}
                <Modal.Body>
                    {/* Nhập cân nặng thực tế */}
                    <Form.Group className="mb-3">
                        <Form.Label>
                            Actual Weight (grams)
                        </Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            placeholder="Enter actual weight"
                            value={actualWeight}
                            onChange={(e) => setActualWeight(e.target.value)}
                        />
                        {/* Giải thích cho shipper */}
                        <Form.Text className="text-muted">
                            Cân nặng thực tế sẽ được dùng để tính phí nếu có chênh lệch.
                        </Form.Text>
                    </Form.Group>

                    {/* Upload ảnh bằng chứng lấy hàng */}
                    <Form.Group className="mb-3">
                        <Form.Label>
                            Pickup Proof Image
                        </Form.Label>
                        <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPickupImage(e.target.files[0])}
                        />
                        <Form.Text className="text-muted">
                            Vui lòng chụp rõ kiện hàng và địa điểm lấy.
                        </Form.Text>
                    </Form.Group>

                    {/* Cảnh báo nghiệp vụ */}
                    <Alert variant="warning" className="small mb-0">
                        ⚠️ Sau khi xác nhận lấy hàng, bạn sẽ không thể chỉnh sửa thông tin này.
                    </Alert>
                </Modal.Body>

                {/* ==========================
        FOOTER
        ========================== */}
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowPickupModal(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="warning"
                        onClick={handleConfirmPickupSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Processing..." : "Confirm Pickup"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ==========================
    CONFIRM DELIVERY MODAL
    ========================== */}
            <Modal
                show={showDeliveryModal}
                onHide={() => setShowDeliveryModal(false)}
                backdrop="static"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        🚚 Confirm Delivery
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>
                            Delivery Proof Image
                        </Form.Label>
                        <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={(e) => setDeliveryImage(e.target.files[0])}
                        />
                        <Form.Text className="text-muted">
                            Vui lòng chụp rõ kiện hàng tại nơi nhận hàng.
                        </Form.Text>
                    </Form.Group>

                    <Alert variant="warning" className="small mb-0">
                        ⚠️ Sau khi xác nhận giao hàng, đơn hàng sẽ được đánh dấu là hoàn thành.
                    </Alert>
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowDeliveryModal(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="success"
                        onClick={handleConfirmDeliverySubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Processing..." : "Confirm Delivery"}
                    </Button>
                </Modal.Footer>
            </Modal>

        </Container>
    );
};

export default OrderDetailShipper;
