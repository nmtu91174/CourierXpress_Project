// frontend/src/pages/shipper/OrderDetailShipper.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// [UPDATED] Added Modal and Form for Pickup Dialog
import {
    Container,
    Card,
    Row,
    Col,
    Button,
    Spinner,
    Alert,
    ListGroup,
    Modal,
    Form
} from "react-bootstrap";
import {
    FaBoxOpen,
    FaUser,
    FaMapMarkerAlt,
    FaRuler,
    FaWeightHanging,
    FaMoneyBillWave,
    FaCheckCircle,
    FaTruck
} from "react-icons/fa";
import Swal from "sweetalert2";
import axios from "axios";

// [UPDATED] Changed API Base URL to match the backend structure created in previous steps
const API_BASE = "http://localhost:8888/backend/api/shipper";

const OrderDetailShipper = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // [NEW] States for Delivery Modal
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveryImage, setDeliveryImage] = useState(null);

    // [NEW] States for Pickup Confirmation Modal
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [actualWeight, setActualWeight] = useState("");
    const [pickupImage, setPickupImage] = useState(null);

    // ==========================
    // FETCH ORDER DETAIL
    // ==========================
    const fetchOrderDetail = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `http://localhost:8888/getOrder.php?id=${id}`,
                { withCredentials: true }
            );

            const data = res.data.order || res.data.data;

            if (data) {
                setOrder(data);
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

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    // ==========================
    // ACCEPT ASSIGNMENT (STATUS 2 -> 3)
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

            // ✅ FIX 1: Chỉ coi thành công khi backend trả status === success
            if (res.data.status === "success") {
                Swal.fire(
                    "Success",
                    "Order accepted. Please proceed to pickup.",
                    "success"
                ).then(() => {
                    // ✅ FIX 2: Redirect về dashboard để tránh hiểu nhầm trạng thái
                    navigate("/shipper");
                });
            } else {
                Swal.fire("Error", res.data.message || "Failed to accept.", "error");
            }
        } catch (err) {
            Swal.fire("Error", "Connection failed.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================
    // CONFIRM PICKUP (STATUS 3 -> 4)
    // ==========================
    const handleConfirmPickupSubmit = async () => {
        if (!actualWeight || !pickupImage) {
            Swal.fire(
                "Warning",
                "Please enter actual weight and upload proof image.",
                "warning"
            );
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
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" }
                }
            );

            if (res.data.status === "success") {
                Swal.fire("Success", "Pickup confirmed!", "success");
                setShowPickupModal(false);
                fetchOrderDetail();
            } else {
                Swal.fire("Error", res.data.message, "error");
            }
        } catch (err) {
            Swal.fire("Error", "Server error.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================
    // CONFIRM DELIVERY (STATUS 4 -> 5)
    // ==========================
    const handleConfirmDeliverySubmit = async () => {
        if (!deliveryImage) {
            Swal.fire("Warning", "Please upload delivery proof.", "warning");
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
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" }
                }
            );

            if (res.data.status === "success") {
                Swal.fire("Success", "Order delivered!", "success");
                setShowDeliveryModal(false);
                fetchOrderDetail();
            } else {
                Swal.fire("Error", res.data.message, "error");
            }
        } catch (err) {
            Swal.fire("Error", "Server error.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading)
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" />
            </Container>
        );

    if (error)
        return (
            <Container className="py-5">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );

    if (!order)
        return (
            <Container className="py-5">
                <Alert variant="warning">Order not found.</Alert>
            </Container>
        );

    // ==========================
    // STATUS FLAGS (FIXED)
    // ==========================
    // ✅ FIX 3: Chỉ cho phép Accept khi đơn thuộc về shipper đang đăng nhập
    const isAssigned =
        parseInt(order.status) === 2 &&
        parseInt(order.shipper_id) === parseInt(order.auth_shipper_id);

    const isPickingUp = parseInt(order.status) === 3;
    const isInTransit = parseInt(order.status) === 4;
    const isCompleted = parseInt(order.status) === 5;

    return (
        <Container className="py-5">
            <h2 className="fw-bold mb-4">
                Order Details: {order.order_code}
            </h2>

            <Row className="g-4">
                <Col md={7}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-danger text-white fw-bold">
                            <FaMapMarkerAlt className="me-2" /> Delivery Info
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <h5>
                                    Status:{" "}
                                    <strong>
                                        {order.status === 2
                                            ? "Assigned"
                                            : order.status === 3
                                                ? "Picking Up"
                                                : order.status === 4
                                                    ? "In Transit"
                                                    : "Completed"}
                                    </strong>
                                </h5>

                                {/* ACTION BUTTONS */}
                                {isAssigned && (
                                    <Button
                                        variant="primary"
                                        disabled={isSubmitting}
                                        onClick={handleAcceptOrder}
                                    >
                                        {isSubmitting
                                            ? "Processing..."
                                            : "Accept Assignment"}
                                    </Button>
                                )}

                                {isPickingUp && (
                                    <Button
                                        variant="warning"
                                        onClick={() => setShowPickupModal(true)}
                                    >
                                        Confirm Pickup
                                    </Button>
                                )}

                                {isInTransit && (
                                    <Button
                                        variant="success"
                                        onClick={() => setShowDeliveryModal(true)}
                                    >
                                        Confirm Delivery
                                    </Button>
                                )}

                                {isCompleted && (
                                    <Button variant="secondary" disabled>
                                        Completed
                                    </Button>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default OrderDetailShipper;
