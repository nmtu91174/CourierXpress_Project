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
    BsGeoAltFill,
    BsCheckCircleFill,
    BsBoxSeam,
    BsCamera,
    BsTruck
} from "react-icons/bs";
import Swal from "sweetalert2";
import axios from "axios";

// API base khớp với HomePageShipper
const API_BASE = "http://localhost:8888/api/shipper";

const OrderDetailShipper = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // ==========================
    // STATE CHUNG
    // ==========================
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ==========================
    // PICKUP STATES
    // ==========================
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [actualWeight, setActualWeight] = useState("");
    const [pickupImage, setPickupImage] = useState(null);

    // Checklist xác nhận nghiệp vụ
    const [checkOrder, setCheckOrder] = useState(false);
    const [checkSender, setCheckSender] = useState(false);
    const [checkPackage, setCheckPackage] = useState(false);

    // ==========================
    // DELIVERY STATES
    // ==========================
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveryImage, setDeliveryImage] = useState(null);

    // ==========================
    // FETCH ORDER DETAIL
    // ==========================
    useEffect(() => {
        const fetchOrderDetail = async () => {
            setLoading(true);
            try {
                const res = await axios.get(
                    `${API_BASE}/order_detail.php?order_id=${id}`,
                    { withCredentials: true }
                );

                if (res.data.status === "success") {
                    setOrder(res.data.data);
                    setError(null);
                } else {
                    setError(res.data.message);
                }
            } catch {
                setError("Cannot connect to server");
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
        if (!window.confirm("Xác nhận nhận đơn này?")) return;

        setIsSubmitting(true);
        try {
            const res = await axios.post(
                `${API_BASE}/accept_assignment.php`,
                { order_id: order.id },
                { withCredentials: true }
            );

            if (res.data.status === "success") {
                Swal.fire("Success", "Đã nhận đơn", "success")
                    .then(() => navigate("/shipper"));
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
    // CONFIRM PICKUP (3 → 4)
    // ==========================
    const canConfirmPickup =
        checkOrder &&
        checkSender &&
        checkPackage &&
        actualWeight &&
        pickupImage;

    const handleConfirmPickupSubmit = async () => {
        if (!canConfirmPickup) return;

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
                Swal.fire("Success", "Đã xác nhận lấy hàng", "success");
                setShowPickupModal(false);
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
        if (!deliveryImage) return;

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
                Swal.fire("Success", "Giao hàng thành công", "success");
                setShowDeliveryModal(false);
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
    // RENDER
    // ==========================
    if (loading) return <Container className="py-5 text-center"><Spinner /></Container>;
    if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!order) return null;

    const status = parseInt(order.status);

    return (
        <Container className="py-4">

            <h5 className="fw-bold mb-3">
                📦 Order #{order.order_code}
            </h5>

            {/* ==========================
                ORDER INFO
            ========================== */}
            <Card className="mb-3 shadow-sm">
                <Card.Body>
                    <div className="mb-2">
                        <BsGeoAltFill className="me-2 text-danger" />
                        <strong>Pickup:</strong> {order.sender_address}
                    </div>
                    <div>
                        <strong>Receiver:</strong> {order.receiver_name}
                    </div>
                </Card.Body>
            </Card>

            {/* ==========================
                ACTIONS
            ========================== */}
            {status === 2 && (
                <Button
                    className="w-100 mb-2"
                    onClick={handleAcceptOrder}
                    disabled={isSubmitting}
                >
                    Nhận đơn
                </Button>
            )}

            {status === 3 && (
                <Button
                    variant="warning"
                    className="w-100 mb-2"
                    onClick={() => setShowPickupModal(true)}
                >
                    Xác nhận lấy hàng
                </Button>
            )}

            {status === 4 && (
                <Button
                    variant="success"
                    className="w-100 mb-2"
                    onClick={() => setShowDeliveryModal(true)}
                >
                    Xác nhận giao hàng
                </Button>
            )}

            {/* ==========================
                CONFIRM PICKUP MODAL
            ========================== */}
            <Modal show={showPickupModal} onHide={() => setShowPickupModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <BsBoxSeam className="me-2" />
                        Checklist trước khi lấy hàng
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    {/* ORDER SUMMARY */}
                    <Card className="mb-3">
                        <Card.Body className="p-2">
                            <div><strong>#{order.order_code}</strong></div>
                            <div className="small">{order.sender_address}</div>
                        </Card.Body>
                    </Card>

                    {/* CHECKLIST */}
                    <Form.Check
                        className="mb-2"
                        label="Đã kiểm tra đúng mã đơn hàng"
                        checked={checkOrder}
                        onChange={(e) => setCheckOrder(e.target.checked)}
                    />
                    <Form.Check
                        className="mb-2"
                        label="Đã xác nhận đúng người gửi & địa chỉ"
                        checked={checkSender}
                        onChange={(e) => setCheckSender(e.target.checked)}
                    />
                    <Form.Check
                        className="mb-3"
                        label="Đã kiểm tra đầy đủ kiện hàng"
                        checked={checkPackage}
                        onChange={(e) => setCheckPackage(e.target.checked)}
                    />

                    {/* WEIGHT */}
                    <Form.Group className="mb-3">
                        <Form.Label>Cân nặng thực tế (gram)</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            value={actualWeight}
                            onChange={(e) => setActualWeight(e.target.value)}
                        />
                    </Form.Group>

                    {/* IMAGE */}
                    <Form.Group>
                        <Form.Label>
                            <BsCamera className="me-1" />
                            Ảnh xác nhận lấy hàng
                        </Form.Label>
                        <Form.Control
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setPickupImage(e.target.files[0])}
                        />
                    </Form.Group>

                    <Alert variant="warning" className="small mt-3">
                        ⚠️ Sau khi xác nhận, không thể chỉnh sửa.
                    </Alert>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPickupModal(false)}>
                        Hủy
                    </Button>
                    <Button
                        variant="warning"
                        disabled={!canConfirmPickup || isSubmitting}
                        onClick={handleConfirmPickupSubmit}
                    >
                        Xác nhận lấy hàng
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ==========================
                CONFIRM DELIVERY MODAL
            ========================== */}
            <Modal show={showDeliveryModal} onHide={() => setShowDeliveryModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <BsTruck className="me-2" />
                        Xác nhận giao hàng
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Ảnh giao hàng</Form.Label>
                        <Form.Control
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setDeliveryImage(e.target.files[0])}
                        />
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeliveryModal(false)}>
                        Hủy
                    </Button>
                    <Button
                        variant="success"
                        disabled={!deliveryImage || isSubmitting}
                        onClick={handleConfirmDeliverySubmit}
                    >
                        Xác nhận giao hàng
                    </Button>
                </Modal.Footer>
            </Modal>

        </Container>
    );
};

export default OrderDetailShipper;
