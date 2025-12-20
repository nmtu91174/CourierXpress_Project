// frontend/src/pages/shipper/OrderDetailShipper.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// [UPDATED] Added Modal and Form for Pickup Dialog
import { Container, Card, Row, Col, Button, Spinner, Alert, ListGroup, Modal, Form } from "react-bootstrap";
import { FaBoxOpen, FaUser, FaMapMarkerAlt, FaRuler, FaWeightHanging, FaMoneyBillWave, FaCheckCircle, FaTruck } from "react-icons/fa";
import Swal from "sweetalert2";
import axios from "axios";

// [UPDATED] Changed API Base URL to match the backend structure created in previous steps
// Make sure this port matches your server (e.g., 8888 or 80)
const API_BASE = "http://localhost:8888/backend/api/shipper";

const OrderDetailShipper = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // [NEW] States for Delivery Modal (Moved inside component)
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveryImage, setDeliveryImage] = useState(null);

    // [NEW] States for Pickup Confirmation Modal
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [actualWeight, setActualWeight] = useState('');
    const [pickupImage, setPickupImage] = useState(null);

    // Fetch Order Detail (2.1.4)
    const fetchOrderDetail = async () => {
        setLoading(true);
        try {
            // [UPDATED] Use specific endpoint for details
            // Assuming you have order_detail.php or reuse getOrder.php
            const res = await axios.get(`http://localhost:8888/getOrder.php?order_code=${id ? id : ''}&id=${id}`, {
                withCredentials: true, // Gửi cookie session
            });

            // Logic to handle different response structures depending on which API is used
            const data = res.data.order || res.data.data;

            if (data) {
                setOrder(data);
                setError(null);
            } else {
                setError(res.data.message || "Cannot load order details");
            }
        } catch (err) {
            console.error("Lỗi khi tải chi tiết đơn hàng:", err);
            const errorMsg = err.response?.data?.message || err.message || "Cannot connect to server";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    // [NEW] Real-time GPS Tracking Logic
    useEffect(() => {
        let intervalId = null;

        // Only track if status is 3 (Picking Up) or 4 (In Transit)
        if (order && (parseInt(order.status) === 3 || parseInt(order.status) === 4)) {
            const sendLocation = (lat, lng) => {
                axios.post(`${API_BASE}/update_location.php`, { lat, lng }, { withCredentials: true })
                    .catch(err => console.error("GPS Error:", err));
            };

            if ("geolocation" in navigator) {
                intervalId = setInterval(() => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const { latitude, longitude } = position.coords;
                            sendLocation(latitude, longitude);
                        },
                        (err) => console.error("GPS Access Denied:", err),
                        { enableHighAccuracy: true }
                    );
                }, 10000); // Send every 10 seconds
            }
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [order]);


    // [NEW] Handle Accept Assignment (Status 2 -> 3)
    const handleAcceptOrder = async () => {
        if (!window.confirm("Are you sure you want to accept this order?")) return;

        setIsSubmitting(true);
        try {
            const res = await axios.post(`${API_BASE}/accept_assignment.php`, {
                order_id: order.id // Send ID, not Code
            }, { withCredentials: true });

            if (res.data.status === 'success' || res.status === 200) {
                Swal.fire('Success', 'Order Accepted. Please proceed to pickup.', 'success');
                fetchOrderDetail(); // Refresh UI
            } else {
                Swal.fire('Error', res.data.message || 'Failed to accept.', 'error');
            }
        } catch (err) {
            console.error(err); // Fix: Log error to use 'err' variable
            Swal.fire('Error', 'Connection failed.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Xử lý xác nhận nhận đơn (2.2.5) -> [UPDATED] Renamed to handleConfirmPickupSubmit
    // This function now sends the weight and image
    const handleConfirmPickupSubmit = async () => {
        if (!actualWeight || !pickupImage) {
            Swal.fire('Warning', 'Please enter actual weight and upload proof image.', 'warning');
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('order_id', order.id);
        formData.append('actual_weight', actualWeight);
        formData.append('image', pickupImage);

        try {
            // Gọi API PUT: action=confirm_pickup (Gói 2.2.4) -> [UPDATED] Use specific POST endpoint
            const res = await axios.post(`${API_BASE}/confirm_pickup.php`, formData, {
                withCredentials: true, // Gửi cookie session
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.status === 'success' || res.status === 200) {
                let msg = 'Pickup Confirmed!';
                if (res.data.data && res.data.data.penalty_fee > 0) {
                    msg += ` Note: Weight penalty of ${res.data.data.penalty_fee} applied.`;
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: msg,
                    timer: 3000,
                    showConfirmButton: true,
                });

                setShowPickupModal(false);
                fetchOrderDetail(); // Refresh to show next status
            } else {
                Swal.fire('Error', res.data.message || 'Pickup confirmation failed.', 'error');
            }
        } catch (err) {
            console.error("Lỗi khi xác nhận nhận đơn:", err);
            Swal.fire('Server Error', 'Cannot connect or invalid order.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // [NEW] Handle Delivery Confirmation (Status 4 -> 5)
    const handleConfirmDeliverySubmit = async () => {
        if (!deliveryImage) {
            Swal.fire('Warning', 'Please upload proof of delivery image.', 'warning');
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('order_id', order.id);
        formData.append('image', deliveryImage);

        try {
            const res = await axios.post(`${API_BASE}/confirm_delivery.php`, formData, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.status === 'success' || res.status === 200) {
                Swal.fire('Success', 'Order Delivered Successfully!', 'success');
                setShowDeliveryModal(false);
                fetchOrderDetail(); // Refresh
            } else {
                Swal.fire('Error', res.data.message || 'Delivery confirmation failed.', 'error');
            }
        } catch (err) {
            console.error(err); // Fix: Log error to use 'err' variable
            Swal.fire('Server Error', 'Cannot connect.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;
    if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!order) return <Container className="py-5"><Alert variant="warning">Order not found.</Alert></Container>;

    // Kiểm tra nếu đơn hàng đã được Shipper này nhận rồi (Status 4 hoặc 5)
    // [UPDATED] Logic for different steps
    const isAssigned = parseInt(order.status) === 2; // Step 1: Assigned
    const isPickingUp = parseInt(order.status) === 3; // Step 2: Picking Up
    const isInTransit = parseInt(order.status) === 4; // Step 3: In Transit
    const isCompleted = parseInt(order.status) === 5; // Step 4: Done


    return (
        <Container className="py-5">
            {/* [UPDATED] Translated to English */}
            <h2 className="fw-bold mb-4">Order Details: {order.order_code}</h2>

            <Row className="g-4">
                {/* CỘT TRÁI: THÔNG TIN GỬI/NHẬN & HÀNH ĐỘNG */}
                <Col md={7}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-danger text-white fw-bold"><FaMapMarkerAlt className="me-2" /> Delivery Info</Card.Header>
                        <Card.Body>
                            <Row>
                                {/* NGƯỜI GỬI */}
                                <Col md={6}>
                                    <h6 className="fw-bold text-primary">Sender</h6>
                                    <p><strong>{order.sender_name}</strong></p>
                                    <p className="small text-muted mb-0">Phone: {order.sender_phone}</p>
                                    <p className="small text-muted">{order.sender_address}</p>
                                </Col>
                                {/* NGƯỜI NHẬN */}
                                <Col md={6}>
                                    <h6 className="fw-bold text-success">Receiver</h6>
                                    <p><strong>{order.receiver_name}</strong></p>
                                    <p className="small text-muted mb-0">Phone: {order.receiver_phone}</p>
                                    <p className="small text-muted">{order.receiver_address}</p>
                                </Col>
                            </Row>
                            <hr />
                            {/* HÀNH ĐỘNG */}
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                {/* [UPDATED] Use status_desc or status ID map if desc is VN */}
                                <h5 className="m-0">Status: <span className="fw-bold text-warning">
                                    {/* Simple mapping if backend returns number */}
                                    {order.status == 2 ? "Assigned" :
                                        order.status == 3 ? "Picking Up" :
                                            order.status == 4 ? "In Transit" : order.status_desc}
                                </span></h5>

                                {/* [UPDATED] Button Logic based on Workflow */}

                                {/* Case 1: Status 2 -> Accept */}
                                {isAssigned && (
                                    <Button
                                        variant="primary"
                                        onClick={handleAcceptOrder}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Processing...' : 'Accept Assignment'}
                                    </Button>
                                )}

                                {/* Case 2: Status 3 -> Confirm Pickup (Open Modal) */}
                                {isPickingUp && (
                                    <Button
                                        variant="warning"
                                        onClick={() => setShowPickupModal(true)}
                                    >
                                        <FaCheckCircle className="me-2" /> Confirm Pickup
                                    </Button>
                                )}

                                {/* Case 3: Status 4 -> Show Confirm Delivery Button */}
                                {isInTransit && (
                                    <Button
                                        variant="success"
                                        onClick={() => setShowDeliveryModal(true)}
                                    >
                                        <FaTruck className="me-2" /> Confirm Delivery
                                    </Button>
                                )}

                                {/* Case 4: Status 5 -> Completed */}
                                {isCompleted && (
                                    <Button variant="secondary" disabled>
                                        <FaCheckCircle className="me-2" /> Completed
                                    </Button>
                                )}
                            </div>
                        </Card.Body>
                    </Card>

                    {/* HÌNH ẢNH BAN ĐẦU (NẾU CÓ) */}
                    {order.images && order.images.length > 0 && (
                        <Card className="shadow-sm border-0">
                            <Card.Header className="fw-bold"><FaBoxOpen className="me-2" /> Order Images (Provided by Customer)</Card.Header>
                            <Card.Body>
                                <Row>
                                    {order.images.map((img, index) => (
                                        <Col key={index} md={6} className="mb-3">
                                            <img
                                                src={img.image_url}
                                                alt={`Order proof ${img.type}`}
                                                style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                                            />
                                            <p className="small text-center mt-1 text-muted">Type: {img.type} | Date: {new Date(img.created_at).toLocaleString()}</p>
                                        </Col>
                                    ))}
                                </Row>
                            </Card.Body>
                        </Card>
                    )}
                </Col>

                {/* CỘT PHẢI: THÔNG TIN HÀNG HÓA & CƯỚC PHÍ */}
                <Col md={5}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="fw-bold"><FaBoxOpen className="me-2" /> Package Details</Card.Header>
                        <ListGroup variant="flush">
                            <ListGroup.Item>
                                {/* [UPDATED] Translated */}
                                <FaBoxOpen className="me-2 text-primary" /> Item Name: <strong>{order.item_name || "Package"}</strong>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <FaWeightHanging className="me-2 text-danger" /> Weight (Declared): <strong>{order.weight} g</strong>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <FaRuler className="me-2 text-secondary" /> Dimensions: {order.length} x {order.width} x {order.height} cm
                            </ListGroup.Item>
                            <ListGroup.Item>
                                Note: <em>{order.notes || "No notes."}</em>
                            </ListGroup.Item>
                        </ListGroup>
                    </Card>

                    <Card className="shadow-sm border-0">
                        <Card.Header className="fw-bold"><FaMoneyBillWave className="me-2" /> Payment & COD</Card.Header>
                        <Card.Body>
                            <p className="d-flex justify-content-between">
                                <span>Shipping Fee</span>
                                <strong className="text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_shipping_fee)}</strong>
                            </p>
                            <p className="d-flex justify-content-between">
                                <span>COD Amount</span>
                                <strong className="text-danger">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.cod_amount)}</strong>
                            </p>
                            <p className="d-flex justify-content-between border-top pt-2">
                                <span>**Total to Collect**</span>
                                <strong className="fs-5 text-success">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(order.cod_amount) + parseFloat(order.total_shipping_fee))}
                                </strong>
                            </p>

                            <h6 className="mt-3 fw-bold">Fee Breakdown:</h6>
                            <ListGroup variant="flush" className="small">
                                {order.fees && order.fees.map((fee, index) => (
                                    <ListGroup.Item key={index} className="d-flex justify-content-between">
                                        <span>{fee.name}</span>
                                        <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(fee.amount)}</span>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* [NEW] PICKUP CONFIRMATION MODAL */}
            <Modal show={showPickupModal} onHide={() => setShowPickupModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Pickup</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Actual Weight (grams)</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="e.g., 1500"
                                value={actualWeight}
                                onChange={(e) => setActualWeight(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                If weight differs by more than 1000g, a penalty will be applied.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Pickup Proof Image (Required)</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPickupImage(e.target.files[0])}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPickupModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleConfirmPickupSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Confirm & Update'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* [NEW] DELIVERY CONFIRMATION MODAL */}
            <Modal show={showDeliveryModal} onHide={() => setShowDeliveryModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delivery</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <p>Take a photo of the package delivered to the customer (POD).</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Proof of Delivery Image (Required)</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={(e) => setDeliveryImage(e.target.files[0])}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeliveryModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleConfirmDeliverySubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Confirm Delivery'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default OrderDetailShipper;