// src/pages/shipper/HomePageShipper.jsx 

import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Dropdown } from "react-bootstrap";
import { FaMotorcycle, FaTasks, FaCheckCircle, FaClock, FaUserCircle, FaRedo, FaCaretDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../../assets/styles/shipper/HomePageShipper.css"; 

const API_BASE = "http://localhost:8889/CourierXpress_Project/backend/api";

// Hàm ánh xạ trạng thái đơn hàng sang hiển thị tiếng Việt và màu sắc
const getStatusDisplay = (status) => {
    switch (status) {
        case 'pending': return { text: 'Chờ nhận hàng', variant: 'secondary' };
        case 'picked_up': return { text: 'Đã nhận hàng', variant: 'info' };
        case 'in_transit': return { text: 'Đang giao', variant: 'warning' };
        case 'delivered': return { text: 'Đã hoàn thành', variant: 'success' };
        case 'delivery_failed': return { text: 'Thất bại', variant: 'danger' };
        default: return { text: status, variant: 'light' };
    }
};

const ShipperHome = () => {
    const navigate = useNavigate();
    const [isLoadingProfile, setIsLoadingProfile] = useState(true); 
    const [orders, setOrders] = useState([]); // ❌ STATE MỚI: Danh sách đơn hàng
    const [ordersLoading, setOrdersLoading] = useState(false); // Loading cho Orders
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.id;

    // =======================================================================
    // 1. LOGIC LẤY ĐƠN HÀNG
    // =======================================================================
    const fetchOrders = async () => {
        if (!userId) return;
        setOrdersLoading(true);
        try {
            const res = await fetch(`${API_BASE}/shipper/get_orders.php`);
            
            if (!res.ok) throw new Error("Failed to fetch orders");
            
            const data = await res.json();
            
            if (data.status === "success") {
                setOrders(data.orders);
            } else {
                console.error("API Error fetching orders:", data.message);
                setOrders([]);
            }
        } catch (error) {
            console.error("Fetch orders error:", error);
            setOrders([]);
        } finally {
            setOrdersLoading(false);
        }
    };
    
    // =======================================================================
    // 2. LOGIC CẬP NHẬT TRẠNG THÁI
    // =======================================================================
    const handleUpdateStatus = async (orderId, newStatus) => {
        if (!window.confirm(`Bạn có chắc chắn muốn chuyển đơn hàng #${orderId} sang trạng thái: ${getStatusDisplay(newStatus).text}?`)) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/shipper/update_order_status.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, new_status: newStatus }),
            });

            const data = await res.json();

            if (res.ok && data.status === "success") {
                alert(data.message);
                fetchOrders(); // Tải lại danh sách đơn hàng sau khi cập nhật
            } else {
                alert(`Cập nhật thất bại: ${data.message}`);
            }
        } catch (error) {
            alert("Lỗi kết nối khi cập nhật trạng thái.");
        }
    };

    // =======================================================================
    // LOGIC CHECK PROFILE (Đã sửa để gọi fetchOrders sau khi kiểm tra xong)
    // =======================================================================
    useEffect(() => {
        if (!user || user.role !== "shipper") {
            navigate("/login");
            return;
        }

        const checkProfileAndFetchOrders = async () => {
            try {
                // Check Profile Logic (Giữ nguyên)
                const res = await fetch(`${API_BASE}/shipper/get_shipper_info.php?id=${userId}`);
                const data = await res.json();

                if (data.status === "success" && data.shipper) {
                    const { phone, citizen_id, vehicle_plate } = data.shipper;
                    
                    if (!phone || !citizen_id || !vehicle_plate) {
                        alert("Vui lòng hoàn thiện hồ sơ để bắt đầu nhận đơn hàng.");
                        navigate("/shipper/profile/edit");
                        return; // Dừng lại nếu chưa hoàn thiện
                    }
                }
                
                // ❌ GỌI API LẤY ĐƠN HÀNG SAU KHI XÁC MINH PROFILE THÀNH CÔNG
                await fetchOrders(); 

            } catch (error) {
                console.error("Lỗi tải profile hoặc đơn hàng:", error);
                if (error.message.includes('401') || error.message.includes('403')) {
                     navigate("/login");
                }
            } finally {
                setIsLoadingProfile(false);
            }
        };
        
        checkProfileAndFetchOrders();
    // Thêm userId vào dependencies để tránh lỗi warning ESLint
    }, [navigate, userId]); 

    // Tính toán thống kê dựa trên orders thực tế
    const ordersToPickUp = orders.filter(o => o.status === 'pending').length;
    const ordersInTransit = orders.filter(o => o.status === 'picked_up' || o.status === 'in_transit').length;
    const ordersDelivered = orders.filter(o => o.status === 'delivered').length;

    if (isLoadingProfile) {
        return <div className="text-center mt-5">
            <FaUserCircle size={50} className="text-info mb-3"/>
            <p className="fw-bold">Đang kiểm tra hồ sơ Shipper...</p>
        </div>;
    }

    return (
        <div className="shipper-home-page">
            <Container className="py-4">
                {/* ... Header giữ nguyên ... */}
                <h2 className="fw-bold mb-3 shipper-heading">
                    👋 Chào Shipper, chúc bạn một ngày giao hàng thuận lợi!
                </h2>
                <p className="text-muted mb-4">
                    Dưới đây là tổng quan công việc của bạn hôm nay.
                </p>

                {/* 1. ROW THỐNG KÊ (Dùng dữ liệu thực) */}
                <Row className="mb-4">
                    <Col md={4}>
                        <Card className="shadow-sm p-3 stat-card stat-card-primary">
                            <FaTasks size={35} className="mb-2" />
                            <h5 className="fw-bold">Đơn chờ nhận</h5>
                            <p className="text-muted">{ordersToPickUp} đơn cần đi nhận</p>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="shadow-sm p-3 stat-card stat-card-warning">
                            <FaClock size={35} className="mb-2" />
                            <h5 className="fw-bold">Đang giao</h5>
                            <p className="text-muted">{ordersInTransit} đơn đang vận chuyển</p>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="shadow-sm p-3 stat-card stat-card-success">
                            <FaCheckCircle size={35} className="mb-2" />
                            <h5 className="fw-bold">Đã hoàn thành</h5>
                            <p className="text-muted">{ordersDelivered} đơn giao thành công</p>
                        </Card>
                    </Col>
                </Row>

                {/* ... CARD NHẬN ĐƠN MỚI giữ nguyên ... */}
                <Card className="p-4 shadow-sm mb-4 search-order-card">
                    <h5 className="fw-bold mb-3">🚀 Nhận đơn mới</h5>
                    <Button variant="danger" className="px-4 py-2 custom-danger-btn">
                        <FaMotorcycle className="me-2" />
                        Tìm đơn giao ngay
                    </Button>
                </Card>

                {/* 3. DANH SÁCH ĐƠN HÀNG (Dùng dữ liệu thực) */}
                <Card className="shadow-sm p-4 order-list-card">
                    <h5 className="fw-bold mb-3">
                        📦 Đơn hàng của tôi 
                        <Button variant="light" size="sm" onClick={fetchOrders} className="ms-3">
                            <FaRedo className={ordersLoading ? 'fa-spin' : ''} /> Tải lại
                        </Button>
                    </h5>

                    {ordersLoading ? (
                        <p className="text-center">Đang tải đơn hàng...</p>
                    ) : orders.length === 0 ? (
                        <p className="text-center text-muted">🎉 Hiện chưa có đơn hàng nào được gán cho bạn.</p>
                    ) : (
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Mã đơn</th>
                                    <th>Khách nhận</th>
                                    <th>Địa chỉ</th>
                                    <th>Phí thu</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => {
                                    const statusInfo = getStatusDisplay(order.status);
                                    
                                    // Xác định các trạng thái tiếp theo có thể cập nhật
                                    const nextStatuses = {
                                        'pending': ['picked_up'],
                                        'picked_up': ['in_transit'],
                                        'in_transit': ['delivered', 'delivery_failed'],
                                        // Không cho phép cập nhật nếu đã hoàn thành/thất bại
                                    }[order.status] || [];

                                    return (
                                        <tr key={order.id}>
                                            <td>{order.order_code}</td>
                                            <td>{order.receiver_name}</td>
                                            <td>{order.receiver_address}</td>
                                            <td>{order.total_fee.toLocaleString('vi-VN')} VNĐ</td>
                                            <td>
                                                <Badge bg={statusInfo.variant}>{statusInfo.text}</Badge>
                                            </td>
                                            <td>
                                                {order.status !== 'delivered' && order.status !== 'delivery_failed' ? (
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant="primary" size="sm" id={`dropdown-status-${order.id}`}>
                                                            Cập nhật <FaCaretDown />
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            {nextStatuses.map(nextStatus => (
                                                                <Dropdown.Item 
                                                                    key={nextStatus}
                                                                    onClick={() => handleUpdateStatus(order.id, nextStatus)}
                                                                >
                                                                    {getStatusDisplay(nextStatus).text}
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                ) : (
                                                    <Button size="sm" variant="outline-success" disabled>Đã xong</Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                </Card>

            </Container>
        </div>
    );
};

export default ShipperHome;