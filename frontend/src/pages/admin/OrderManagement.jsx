// frontend/src/pages/admin/OrderManagement.jsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, Table, Button, Row, Col, Modal, Form, Badge } from "react-bootstrap";
import { FaSearch, FaPlus, FaEdit, FaBox, FaShippingFast, FaCheckCircle, FaExclamationTriangle, FaTrash } from "react-icons/fa";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import Swal from "sweetalert2";
import "../../assets/styles/order.css";

// Đăng ký ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);

  // --- STATE MODAL TẠO ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    sender_name: "", sender_phone: "", sender_address: "",
    receiver_name: "", receiver_phone: "", receiver_address: "",
    item_name: "", weight: "", delivery_date: ""
  });

  // --- STATE MODAL SỬA ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ order_id: "", receiver_address: "", status: 1 });

  // --- DỮ LIỆU BIỂU ĐỒ (MOCK) ---
  const chartDailyStatus = {
    labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    datasets: [
      { label: "Đã giao", backgroundColor: "#36c689", data: [6, 3, 4, 5, 7, 8, 6] },
      { label: "Đang vận chuyển", backgroundColor: "#ffc107", data: [1, 2, 1, 2, 3, 1, 1] },
      { label: "Đã tạo đơn", backgroundColor: "#4098ff", data: [3, 5, 4, 6, 3, 2, 4] },
    ]
  };

  const chartPie = {
    labels: ["Đã giao", "Đang vận chuyển", "Huỷ"],
    datasets: [{ backgroundColor: ["#36c689", "#ffc107", "#ff4d6d"], data: [18, 7, 2] }]
  };

  // --- 1. Load danh sách đơn từ API ---
  const fetchOrders = async () => {
    try {
      // Thay đường dẫn này nếu bạn dùng /backend/api/...
      const res = await fetch("http://localhost:8888/api/admin/get_orders.php");
      const data = await res.json();
      if (data.status === "success") {
        setOrders(data.data);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // --- 2. Xử lý Tạo đơn ---
  const handleCreateChange = (e) => setCreateData({ ...createData, [e.target.name]: e.target.value });

  const handleCreateSubmit = async () => {
    try {
      const res = await fetch("http://localhost:8888/api/admin/create_order.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      });
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Thành công", `Đã tạo đơn: ${data.tracking_id}`, "success");
        setShowCreateModal(false);
        setCreateData({ sender_name: "", sender_phone: "", sender_address: "", receiver_name: "", receiver_phone: "", receiver_address: "", item_name: "", weight: "", delivery_date: "" });
        fetchOrders();
      } else {
        Swal.fire("Lỗi", data.message, "error");
      }
    } catch (error) { Swal.fire("Lỗi", "Không thể kết nối server", "error"); }
  };

  // --- 3. Xử lý Sửa đơn ---
  const openEditModal = (order) => {
    setEditData({
      order_id: order.id,
      receiver_address: order.address || "",
      status: order.status
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdateSubmit = async () => {
    try {
      const payload = { ...editData, status: parseInt(editData.status) };
      const res = await fetch("http://localhost:8888/api/admin/update_order.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.status === "success") {
        Swal.fire("Cập nhật thành công", "", "success");
        setShowEditModal(false);
        setOrders(orders.map(o => o.id === editData.order_id ? { ...o, status: payload.status, address: payload.receiver_address } : o));
        fetchOrders();
      } else {
        Swal.fire("Lỗi", data.message, "error");
      }
    } catch (error) { Swal.fire("Lỗi kết nối", error.message, "error"); }
  };
  // --- 4. Xử lý Xóa đơn ---
  const handleDelete = async (id) => {
    // Hỏi xác nhận trước khi xóa
    const result = await Swal.fire({
      title: 'Bạn có chắc chắn?',
      text: "Dữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Vâng, xóa nó!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("http://localhost:8888/api/admin/delete_order.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: id }),
        });
        const data = await res.json();

        if (data.status === "success") {
          Swal.fire('Đã xóa!', 'Đơn hàng đã được xóa.', 'success');
          // Cập nhật lại giao diện bằng cách loại bỏ đơn vừa xóa khỏi state
          setOrders(orders.filter(order => order.id !== id));
        } else {
          Swal.fire('Lỗi!', data.message, 'error');
        }
      } catch (error) {
        Swal.fire('Lỗi!', 'Không thể kết nối server.', 'error');
      }
    }
  };

  const renderStatus = (status) => {
    if (status === 1) return <Badge bg="primary">Booked</Badge>;
    if (status === 2) return <Badge bg="info">Approved</Badge>;
    if (status === 7) return <Badge bg="success">Delivered</Badge>;
    return <Badge bg="secondary">Unknown</Badge>;
  };

  return (
    <div className="admin-page">
      {/* HEADER */}
      <div className="page-header d-flex justify-content-between mb-4">
        <h3 className="fw-bold">Quản lý Đơn hàng</h3>
        <Button className="btn-lux-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus className="me-2" /> Tạo vận đơn
        </Button>
      </div>

      {/* KPI CARDS (ĐÃ KHÔI PHỤC) */}
      <Row className="g-3 mb-4">
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">27</h2><small>Tổng đơn (tuần)</small></div><FaBox className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">7</h2><small>Đang vận chuyển</small></div><FaShippingFast className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">18</h2><small>Đã giao</small></div><FaCheckCircle className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">2</h2><small>Huỷ đơn</small></div><FaExclamationTriangle className="fs-1 opacity-50" /></Card.Body></Card></Col>
      </Row>

      {/* CHARTS (ĐÃ KHÔI PHỤC) */}
      <Row className="g-4 mb-4">
        <Col md={6}><Card className="card-lux p-3"><h6 className="fw-bold mb-3">Thống kê tuần</h6><div style={{ height: 200 }}><Bar data={chartDailyStatus} /></div></Card></Col>
        <Col md={6}><Card className="card-lux p-3"><h6 className="fw-bold mb-3">Tỷ lệ trạng thái</h6><div style={{ height: 200 }}><Pie data={chartPie} /></div></Card></Col>
      </Row>

      {/* TABLE */}
      <Card className="card-lux shadow-sm">
        <Table hover responsive className="align-middle mb-0">
          <thead className="bg-light">
            <tr><th>Mã đơn</th><th>Người gửi</th><th>Người nhận</th><th>Ngày tạo</th><th>Trạng thái</th><th>Hành động</th></tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td className="fw-bold text-primary">{o.order_code}</td>
                <td>{o.sender}</td>
                <td>{o.receiver}<br /><small className="text-muted">{o.address}</small></td>
                <td>{o.created_at}</td>
                <td>{renderStatus(o.status)}</td>
                <td>
                  <td>
                    <Button variant="light" size="sm" onClick={() => openEditModal(o)} className="me-2">
                      <FaEdit className="text-warning" />
                    </Button>
                    <Button variant="light" size="sm" onClick={() => handleDelete(o.id)}>
                      <FaTrash className="text-danger" />
                    </Button>
                  </td>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* --- MODAL TẠO & SỬA (Giữ nguyên như cũ) --- */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Tạo Vận Đơn Mới</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <h6 className="text-primary">Người Gửi</h6>
                <Form.Control name="sender_name" placeholder="Tên" className="mb-2" onChange={handleCreateChange} />
                <Form.Control name="sender_phone" placeholder="SĐT" className="mb-2" onChange={handleCreateChange} />
                <Form.Control name="sender_address" placeholder="Địa chỉ" onChange={handleCreateChange} />
              </Col>
              <Col md={6}>
                <h6 className="text-success">Người Nhận</h6>
                <Form.Control name="receiver_name" placeholder="Tên" className="mb-2" onChange={handleCreateChange} />
                <Form.Control name="receiver_phone" placeholder="SĐT" className="mb-2" onChange={handleCreateChange} />
                <Form.Control name="receiver_address" placeholder="Địa chỉ" onChange={handleCreateChange} />
              </Col>
            </Row>
            <Row>
              <Col><Form.Control name="item_name" placeholder="Tên hàng hóa" onChange={handleCreateChange} /></Col>
              <Col><Form.Control type="number" name="weight" placeholder="Kg" onChange={handleCreateChange} /></Col>
              <Col><Form.Control type="date" name="delivery_date" onChange={handleCreateChange} /></Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleCreateSubmit}>Lưu</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton><Modal.Title>Cập nhật Đơn hàng</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Địa chỉ người nhận</Form.Label>
              <Form.Control name="receiver_address" value={editData.receiver_address} onChange={handleEditChange} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select name="status" value={editData.status} onChange={handleEditChange}>
                <option value="1">Booked</option>
                <option value="2">Approved</option>
                <option value="7">Delivered</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Đóng</Button>
          <Button variant="warning" onClick={handleUpdateSubmit}>Cập nhật</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}