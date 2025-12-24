import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Container,
    Card,
    Button,
    Spinner,
    Alert,
    Modal,
    Form,
    Row,
    Col,
    Badge,
    Table
} from "react-bootstrap";
// Import các icon cần thiết từ react-bootstrap-icons
import {
    GeoAltFill,
    BoxSeam,
    CameraFill,
    Truck,
    CheckCircleFill,
    PersonFill,
    ArrowLeft,
    ExclamationTriangleFill,
    TelephoneFill,
    CalendarEvent,
    CashStack,
    Rulers
} from "react-bootstrap-icons";
import Swal from "sweetalert2";
import axios from "axios";

// Cấu hình API Base (Bỏ dấu / ở cuối để nối chuỗi cho đẹp)
const API_BASE = "http://localhost:8888/api/shipper";

const OrderDetailShipper = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // ==========================
    // STATE & VARIABLES
    // ==========================
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // States cho Pickup Modal
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [actualWeight, setActualWeight] = useState("");
    const [pickupImage, setPickupImage] = useState(null);
    const [pickupPreview, setPickupPreview] = useState(null); // State riêng cho preview
    const [checkOrder, setCheckOrder] = useState(false);
    const [checkSender, setCheckSender] = useState(false);
    const [checkPackage, setCheckPackage] = useState(false);

    // States cho Delivery Modal
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveryImage, setDeliveryImage] = useState(null);
    const [deliveryPreview, setDeliveryPreview] = useState(null); // State riêng cho preview

    // GPS when confirming delivery
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [gpsError, setGpsError] = useState(null);

    // ==========================
    // HÀM TIỆN ÍCH (HELPERS)
    // ==========================

    // [FIX] Hàm lấy vị trí GPS (Quan trọng: Đã được thêm vào)
    // [FIX] Hàm lấy vị trí GPS (Đã tinh chỉnh để tránh Timeout)
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser"));
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                        });
                    },
                    (error) => {
                        let msg = "Unknown GPS error";
                        switch (error.code) {
                            case error.PERMISSION_DENIED: msg = "Bạn đã từ chối cấp quyền vị trí."; break;
                            case error.POSITION_UNAVAILABLE: msg = "Không thể xác định vị trí hiện tại."; break;
                            case error.TIMEOUT: msg = "Hết thời gian chờ lấy vị trí (Timeout)."; break;
                        }
                        reject(new Error(msg));
                    },
                    // 👇 CẤU HÌNH QUAN TRỌNG ĐỂ KHẮC PHỤC LỖI:
                    {
                        enableHighAccuracy: false, // Đặt là FALSE để dùng định vị qua Wi-Fi/Network (Nhanh hơn, không cần ra ngoài trời)
                        timeout: 20000,            // Tăng thời gian chờ lên 20 giây
                        maximumAge: 5000           // Chấp nhận vị trí lưu đệm (cache) trong 5 giây gần nhất
                    }
                );
            }
        });
    };

    // Định dạng tiền tệ VND
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    // Định dạng ngày tháng
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-GB');
    };

    // Hiển thị người trả phí
    const getPayerLabel = (type) => {
        return parseInt(type) === 1 ? "Sender (Người gửi)" : "Receiver (Người nhận)";
    };

    // ========================== new nmtu 15:38 24-12
    // ==========================
    // [ADDED] DELIVERY FAILED HELPERS
    // ==========================
    const getFailedReasonLabel = (reason) => {
        switch (reason) {
            case "receiver_unreachable":
                return "Receiver unreachable (Không liên lạc được người nhận)";
            case "receiver_not_available":
                return "Receiver not available (Người nhận không có mặt)";
            case "wrong_address":
                return "Wrong address (Sai địa chỉ)";
            case "receiver_refused":
                return "Receiver refused (Người nhận từ chối)";
            case "force_majeure":
                return "Force majeure (Sự cố bất khả kháng)";
            default:
                return reason || "Unknown reason";
        }
    };
    // ==========================
    // Xử lý preview ảnh pickup
    useEffect(() => {
        if (!pickupImage) {
            setPickupPreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(pickupImage);
        setPickupPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [pickupImage]);

    // Xử lý preview ảnh delivery
    useEffect(() => {
        if (!deliveryImage) {
            setDeliveryPreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(deliveryImage);
        setDeliveryPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [deliveryImage]);

    // ==========================
    // FETCH DATA
    // ==========================
    useEffect(() => {
        const fetchOrderDetail = async () => {
            setLoading(true);
            try {
                // Đã có withCredentials: true -> Tốt
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
            } catch (err) {
                console.error(err);
                // Check lỗi 401 để logout nếu cần
                if (err.response && err.response.status === 401) {
                    setError("Session expired. Please login again.");
                } else {
                    setError("Cannot connect to server");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetail();
    }, [id]);

    // ==========================
    // HANDLERS (LOGIC NGHIỆP VỤ)
    // ==========================

    // Xử lý nhận đơn (Accept)
    const handleAcceptOrder = async () => {
        const result = await Swal.fire({
            title: "Confirm Acceptance",
            text: "Are you sure you want to accept this order?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, Accept",
            cancelButtonText: "Cancel"
        });

        if (!result.isConfirmed) return;

        setIsSubmitting(true);
        try {
            const res = await axios.post(
                `${API_BASE}/accept_assignment.php`,
                { order_id: order.id },
                { withCredentials: true }
            );

            if (res.data.status === "success") {
                await Swal.fire("Success", "Order accepted successfully", "success");
                navigate("/shipper");
            } else {
                Swal.fire("Error", res.data.message, "error");
            }
        } catch {
            Swal.fire("Error", "Server error", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Điều kiện kích hoạt nút xác nhận lấy hàng
    const canConfirmPickup =
        checkOrder &&
        checkSender &&
        checkPackage &&
        actualWeight &&
        pickupImage;

    // Xử lý xác nhận lấy hàng (Confirm Pickup)
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
                Swal.fire("Success", "Pickup confirmed successfully", "success");
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

    // Xử lý xác nhận giao hàng (Confirm Delivery)
    const handleConfirmDeliverySubmit = async () => {
        if (!deliveryImage) return;

        setIsSubmitting(true);
        setGpsError(null); // Reset lỗi cũ

        try {
            // 1️⃣ Lấy GPS hiện tại (Đã có hàm)
            const location = await getCurrentLocation();
            setDeliveryLocation(location);

            // 2️⃣ Build FormData
            const formData = new FormData();
            formData.append("order_id", order.id);
            formData.append("image", deliveryImage);
            formData.append("latitude", location.latitude);
            formData.append("longitude", location.longitude);
            formData.append("accuracy", location.accuracy);

            // 3️⃣ Gửi lên backend
            const res = await axios.post(
                `${API_BASE}/confirm_delivery.php`,
                formData,
                { withCredentials: true }
            );

            if (res.data.status === "success") {
                Swal.fire(
                    "Success",
                    "Delivery confirmed successfully with GPS location",
                    "success"
                );
                setShowDeliveryModal(false);
                window.location.reload();
            } else {
                Swal.fire("Error", res.data.message, "error");
            }
        } catch (err) {
            console.error(err);
            // ❌ Lỗi GPS hoặc server
            setGpsError(err.message); // Hiển thị lỗi lên Modal
            Swal.fire(
                "GPS Error",
                "Unable to get location: " + err.message,
                "warning"
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    //new nmtu 15:38 24-12
    // ==========================
    // [ADDED] DELIVERY FAILED HANDLERS
    // ==========================
const [showFailModal, setShowFailModal] = useState(false);
    const handleConfirmDeliveryFail = async () => {
    if (!failReason || !failImage) return;

    try {
        setGpsError(null);
        const location = await getCurrentLocation();

        await submitDeliveryFailed({
            orderId: order.id,
            reason: failReason,
            note: failNote,
            image: failImage,
            location
        });

        await Swal.fire(
            "Recorded",
            "Delivery failure has been recorded successfully",
            "success"
        );

        setShowFailModal(false);
        window.location.reload();

    } catch (err) {
        Swal.fire("Error", err.message, "error");
    }
};


    // ==========================
    // RENDER UI
    // ==========================

    if (loading)
        return (
            <Container className="d-flex justify-content-center align-items-center vh-100">
                <Spinner animation="border" variant="primary" />
            </Container>
        );

    if (error)
        return (
            <Container className="py-5">
                <Alert variant="danger">
                    <ExclamationTriangleFill className="me-2" />
                    {error}
                </Alert>
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    <ArrowLeft className="me-2" /> Back
                </Button>
            </Container>
        );

    if (!order) return null;

    const status = parseInt(order.status);

    return (
        <Container className="py-3 mb-5" fluid="md">
            {/* Nút Back & Tiêu đề */}
            <div className="d-flex align-items-center mb-3">
                <Button
                    variant="light"
                    className="me-3 shadow-sm rounded-circle p-2"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h5 className="fw-bold mb-0">Order Details</h5>
                    <small className="text-muted">
                        <CalendarEvent className="me-1" />
                        Created: {formatDate(order.created_at)}
                    </small>
                </div>
            </div>

            {/* CARD 1: THÔNG TIN CƠ BẢN & LỘ TRÌNH */}
            <Card className="mb-3 shadow-sm border-0">
                <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                    <span className="fw-bold">#{order.order_code}</span>
                    <Badge bg="light" text="dark">
                        {status === 2 && "Assigned"}
                        {status === 3 && "Accepted (Picking up)"}
                        {status === 4 && "Picked Up (Delivering)"}
                        {status === 5 && "Delivered"}
                        {/* === ADDED FOR STATUS = 6 === */}
                        {status === 6 && "Delivery Failed"}
                    </Badge>
                </Card.Header>
                <Card.Body>
                    <Row>
                        {/* Cột thông tin người gửi */}
                        <Col md={6} className="mb-3 mb-md-0 border-end-md">
                            <h6 className="text-uppercase text-muted fw-bold small mb-3">
                                <GeoAltFill className="text-danger me-1" /> Sender Information
                            </h6>
                            <div className="ps-3 border-start border-3 border-danger">
                                <div className="fw-bold fs-5">{order.sender_name || "N/A"}</div>
                                <div className="mb-1 text-primary">
                                    <TelephoneFill className="me-2" size={14} />
                                    <a href={`tel:${order.sender_phone}`} className="text-decoration-none">{order.sender_phone}</a>
                                </div>
                                <div className="text-muted small">{order.sender_address}</div>
                            </div>
                        </Col>

                        {/* Cột thông tin người nhận */}
                        <Col md={6}>
                            <h6 className="text-uppercase text-muted fw-bold small mb-3">
                                <PersonFill className="text-success me-1" /> Receiver Information
                            </h6>
                            <div className="ps-3 border-start border-3 border-success">
                                <div className="fw-bold fs-5">{order.receiver_name || "N/A"}</div>
                                <div className="mb-1 text-primary">
                                    <TelephoneFill className="me-2" size={14} />
                                    <a href={`tel:${order.receiver_phone}`} className="text-decoration-none">{order.receiver_phone}</a>
                                </div>
                                <div className="text-muted small">{order.receiver_address}</div>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* CARD 2: CHI TIẾT KIỆN HÀNG & GHI CHÚ */}
            <Card className="mb-3 shadow-sm border-0">
                <Card.Body>
                    <h6 className="text-uppercase text-muted fw-bold small mb-3">
                        <BoxSeam className="me-1" /> Package Details
                    </h6>

                    <Row className="g-3 mb-3">
                        <Col xs={6} md={3}>
                            <small className="text-muted d-block">Weight</small>
                            <strong>{order.weight} g</strong>
                        </Col>
                        <Col xs={6} md={3}>
                            <small className="text-muted d-block">Dimensions (L-W-H)</small>
                            <strong>
                                <Rulers className="me-1 text-muted" />
                                {order.length ? `${Number(order.length)}x${Number(order.width)}x${Number(order.height)} cm` : "N/A"}
                            </strong>
                        </Col>
                        <Col xs={6} md={3}>
                            <small className="text-muted d-block">Category ID</small>
                            <span>{order.category_id || "N/A"}</span>
                        </Col>
                        <Col xs={6} md={3}>
                            <small className="text-muted d-block">Service Type</small>
                            <span>{order.service_type || "Standard"}</span>
                        </Col>
                    </Row>

                    {order.notes && (
                        <Alert variant="warning" className="d-flex align-items-center mb-0 mt-3">
                            <ExclamationTriangleFill className="me-2 fs-4" />
                            <div>
                                <strong>Notes:</strong> {order.notes}
                            </div>
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            {/* ========================== new nmtu 15:38 24-12
                 [ADDED] DELIVERY FAILED INFORMATION (READ-ONLY)
                 ========================== */}
            {status === 6 && (
                <Card className="mb-3 shadow-sm border-danger">
                    <Card.Header className="bg-danger text-white fw-bold">
                        <ExclamationTriangleFill className="me-2" />
                        Delivery Failed
                    </Card.Header>
                    <Card.Body>
                        <Alert variant="danger">
                            This order was marked as <strong>Delivery Failed</strong>.
                            Further actions will be handled by Agent/Admin.
                        </Alert>

                        <Row className="mb-3">
                            <Col md={6}>
                                <small className="text-muted d-block">Failed Reason</small>
                                <strong className="text-danger">
                                    {getFailedReasonLabel(order.delivery_fail_reason)}
                                </strong>
                            </Col>

                            <Col md={6}>
                                <small className="text-muted d-block">Failed At</small>
                                <strong>{formatDate(order.delivery_fail_at)}</strong>
                            </Col>
                        </Row>

                        {order.delivery_fail_note && (
                            <Alert variant="warning" className="mb-3">
                                <strong>Shipper Note:</strong> {order.delivery_fail_note}
                            </Alert>
                        )}

                        {/* Proof Image (if exists) */}
                        {order.failed_images && order.failed_images.length > 0 && (
                            <>
                                <h6 className="fw-bold mb-2">Failure Proof</h6>
                                <Row>
                                    {order.failed_images.map((img, idx) => (
                                        <Col xs={6} md={4} key={idx} className="mb-2">
                                            <img
                                                src={img.image_url}
                                                alt="Delivery Failed Proof"
                                                className="img-fluid rounded border"
                                            />
                                        </Col>
                                    ))}
                                </Row>
                            </>
                        )}
                    </Card.Body>
                </Card>
            )}


            {/* CARD 3: THÔNG TIN THANH TOÁN (FINANCIALS) */}
            <Card className="mb-3 shadow-sm border-0">
                <Card.Body>
                    <h6 className="text-uppercase text-muted fw-bold small mb-3">
                        <CashStack className="me-1" /> Payment & Fees
                    </h6>

                    <Table bordered hover size="sm" responsive className="mb-0 text-center">
                        <thead className="table-light">
                            <tr>
                                <th>Payer</th>
                                <th>Shipping Fee</th>
                                <th>COD Amount (Collect)</th>
                                <th>Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="align-middle">
                                    <Badge bg="secondary" className="fw-normal">
                                        {getPayerLabel(order.payer_type)}
                                    </Badge>
                                    <div className="small text-muted mt-1">
                                        Method ID: {order.payment_method_id || "Cash"}
                                    </div>
                                </td>
                                <td className="align-middle">{formatCurrency(order.total_shipping_fee)}</td>
                                <td className="align-middle fw-bold text-danger fs-5">
                                    {formatCurrency(order.cod_amount)}
                                </td>
                                <td className="align-middle fw-bold text-primary">
                                    {formatCurrency(order.total_amount)}
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* ==========================
                 CÁC BUTTON HÀNH ĐỘNG (FIXED BOTTOM)
                ========================== */}
            <div className="p-3 bg-white border-top shadow-lg d-md-static bg-md-transparent border-md-0 shadow-md-none">
                <Container fluid="md" className="p-0">
                    {status === 2 && (
                        <Button variant="primary" size="lg" className="w-100 fw-bold shadow-sm" onClick={handleAcceptOrder} disabled={isSubmitting}>
                            <CheckCircleFill className="me-2" /> Accept Order
                        </Button>
                    )}

                    {status === 3 && (
                        <Button variant="warning" size="lg" className="w-100 fw-bold shadow-sm text-dark" onClick={() => setShowPickupModal(true)}>
                            <BoxSeam className="me-2" /> Confirm Pickup
                        </Button>
                    )}

                    {status === 4 && (
    <>
        <Button
            variant="success"
            size="lg"
            className="w-100 fw-bold shadow-sm mb-2"
            onClick={() => setShowDeliveryModal(true)}
        >
            <Truck className="me-2" /> Confirm Delivery
        </Button>

        <Button
            variant="outline-danger"
            size="lg"
            className="w-100 fw-bold"
            onClick={() => setShowFailModal(true)}
        >
            <ExclamationTriangleFill className="me-2" />
            Delivery Failed
        </Button>
    </>
)}

                </Container>
            </div>

            {/* ==========================
                MODAL: CONFIRM PICKUP
                ========================== */}
            <Modal show={showPickupModal} onHide={() => setShowPickupModal(false)} centered backdrop="static">
                <Modal.Header>
                    <Modal.Title><BoxSeam className="me-2" /> Pickup Checklist</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Alert variant="info" className="p-2 mb-3">Order: <strong>#{order.order_code}</strong></Alert>
                    <Form.Group className="mb-3">
                        <div className="d-flex align-items-start mb-2">
                            <Form.Label className="frcheck me-2">Verified Order Code</Form.Label>
                            <Form.Check type="checkbox" checked={checkOrder} onChange={(e) => setCheckOrder(e.target.checked)} className="mb-2" />
                        </div>
                        <div className="d-flex align-items-start mb-2">
                            <Form.Label className="frcheck me-2">Verified Sender & Address</Form.Label>
                            <Form.Check type="checkbox" checked={checkSender} onChange={(e) => setCheckSender(e.target.checked)} className="mb-2" />
                        </div>
                        <div className="d-flex align-items-start mb-2">
                            <Form.Label className="frcheck me-2">Checked Package Integrity</Form.Label>
                            <Form.Check type="checkbox" checked={checkPackage} onChange={(e) => setCheckPackage(e.target.checked)} className="mb-2" />
                        </div>
                    </Form.Group>
                    <hr /><hr />
                    <Form.Group className="mb-3">
                        <div className="mb-3">
                            <Form.Label>Actual Weight (g)</Form.Label>
                            <Form.Control type="number" value={actualWeight} onChange={(e) => setActualWeight(e.target.value)} />
                        </div>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>
                            <CameraFill className="me-1" /> Photo
                        </Form.Label>

                        {!pickupPreview ? (
                            /* ===== CHƯA CÓ ẢNH ===== */
                            <Form.Control
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => setPickupImage(e.target.files[0])}
                            />
                        ) : (
                            /* ===== PREVIEW ẢNH ===== */
                            <div className="text-center">
                                <img
                                    src={pickupPreview}
                                    alt="Pickup Preview"
                                    className="img-fluid rounded mb-2"
                                    style={{ maxHeight: "220px" }}
                                />

                                <div>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setPickupImage(null)}
                                    >
                                        <CameraFill className="me-1" />
                                        Change Photo
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form.Group>


                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPickupModal(false)}>Cancel</Button>
                    <Button variant="warning" disabled={!canConfirmPickup || isSubmitting} onClick={handleConfirmPickupSubmit}>Confirm</Button>
                </Modal.Footer>
            </Modal>

            {/* ==========================
                  MODAL: CONFIRM DELIVERY (PRO UX)
                ========================== */}
            <Modal
                show={showDeliveryModal}
                onHide={() => setShowDeliveryModal(false)}
                centered
                backdrop="static"
            >
                <Modal.Header>
                    <Modal.Title>
                        <Truck className="me-2 text-success" />
                        Delivery Confirmation
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Alert variant="success" className="py-2">
                        Please upload <strong>Proof of Delivery</strong> photo
                    </Alert>

                    <Form.Group>
                        <Form.Label className="fw-semibold">
                            Proof of Delivery (Photo)
                        </Form.Label>

                        {!deliveryPreview ? (
                            /* ===== CHƯA CÓ ẢNH ===== */
                            <Form.Control
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => setDeliveryImage(e.target.files[0])}
                            />
                        ) : (
                            /* ===== PREVIEW ẢNH ===== */
                            <div className="text-center">
                                <img
                                    src={deliveryPreview}
                                    alt="Delivery Proof Preview"
                                    className="img-fluid rounded mb-2"
                                    style={{ maxHeight: "240px" }}
                                />

                                <div>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setDeliveryImage(null)}
                                    >
                                        <CameraFill className="me-1" />
                                        Change Photo
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form.Group>
                    {deliveryLocation && (
                        <Alert variant="info" className="py-2 mt-3">
                            📍 GPS Captured:
                            <div className="small">
                                Lat: {deliveryLocation.latitude.toFixed(6)} <br />
                                Lng: {deliveryLocation.longitude.toFixed(6)}
                            </div>
                        </Alert>
                    )}

                    {gpsError && (
                        <Alert variant="warning" className="py-2 mt-3">
                            <ExclamationTriangleFill className="me-1" />
                            {gpsError}
                        </Alert>
                    )}

                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowDeliveryModal(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="success"
                        disabled={!deliveryImage || isSubmitting}
                        onClick={handleConfirmDeliverySubmit}
                    >
                        {isSubmitting ? "Submitting..." : "Confirm Delivery"}
                    </Button>
                </Modal.Footer>
            </Modal>
            <Modal
    show={showFailModal}
    onHide={() => setShowFailModal(false)}
    centered
    backdrop="static"
>
    <Modal.Header>
        <Modal.Title className="text-danger">
            <ExclamationTriangleFill className="me-2" />
            Delivery Failed
        </Modal.Title>
    </Modal.Header>

    <Modal.Body>
        <Alert variant="danger" className="py-2">
            Please provide a <strong>valid reason</strong> and
            <strong> photo proof</strong>.
        </Alert>

        <Form.Group className="mb-3">
            <Form.Label>Failure Reason *</Form.Label>
            <Form.Select
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
            >
                <option value="">-- Select reason --</option>
                <option value="receiver_unreachable">Receiver unreachable</option>
                <option value="receiver_not_available">Receiver not available</option>
                <option value="wrong_address">Wrong address</option>
                <option value="receiver_refused">Receiver refused</option>
                <option value="force_majeure">Force majeure</option>
            </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
            <Form.Label>Note (optional)</Form.Label>
            <Form.Control
                as="textarea"
                rows={3}
                value={failNote}
                onChange={(e) => setFailNote(e.target.value)}
            />
        </Form.Group>

        <Form.Group>
            <Form.Label>
                <CameraFill className="me-1" />
                Proof Image *
            </Form.Label>

            {!failPreview ? (
                <Form.Control
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setFailImage(e.target.files[0])}
                />
            ) : (
                <div className="text-center">
                    <img
                        src={failPreview}
                        alt="Fail Proof"
                        className="img-fluid rounded mb-2"
                        style={{ maxHeight: 240 }}
                    />
                    <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => setFailImage(null)}
                    >
                        Change Photo
                    </Button>
                </div>
            )}
        </Form.Group>
    </Modal.Body>

    <Modal.Footer>
        <Button
            variant="secondary"
            onClick={() => setShowFailModal(false)}
        >
            Cancel
        </Button>

        <Button
            variant="danger"
            disabled={!failReason || !failImage || failSubmitting}
            onClick={handleConfirmDeliveryFail}
        >
            {failSubmitting ? "Submitting..." : "Confirm Delivery Failed"}
        </Button>
    </Modal.Footer>
</Modal>



        </Container >
    );
};

export default OrderDetailShipper;