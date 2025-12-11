// frontend/src/pages/admin/OrderManagement.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, Table, Button, Row, Col, Modal, Form, Badge } from "react-bootstrap";
import { FaSearch, FaPlus, FaEdit, FaTrash, FaUserCog, FaBox, FaShippingFast, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import Swal from "sweetalert2";
import "../../assets/styles/order.css";

// Đăng ký ChartJS (Giữ nguyên để hiển thị biểu đồ)
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);

  // --- STATE MỚI: DANH SÁCH ĐẠI LÝ ---
  const [agents, setAgents] = useState([]);

  // --- API BASE URL ---
  const API_BASE = "http://localhost:8888/api/admin";

  // --- STATE CÁC MODAL ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false); // Modal Phân công mới

  // --- STATE DATA ---
  const [createData, setCreateData] = useState({
    sender_name: "", sender_phone: "", sender_address: "",
    receiver_name: "", receiver_phone: "", receiver_address: "",
    item_name: "", weight: "", delivery_date: ""
  });
  const [editData, setEditData] = useState({ order_id: "", receiver_address: "", status: 1 });
  const [assignData, setAssignData] = useState({ order_id: "", agent_id: "" }); // Data phân công mới

  // --- DỮ LIỆU BIỂU ĐỒ (Giữ nguyên) ---
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

  // ==================== 1. FETCH DATA (Đã thêm fetchAgents) ====================
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/get_orders.php`);
      const data = await res.json();
      if (data.status === "success") setOrders(data.data);
    } catch (error) { console.error("Lỗi tải đơn:", error); }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/get_agents.php`);
      const data = await res.json();
      if (data.status === "success") setAgents(data.data);
    } catch (error) { console.error("Lỗi tải agents:", error); }
  };

  useEffect(() => {
    fetchOrders();
    fetchAgents(); // Gọi API lấy đại lý khi vào trang
  }, []);

  // ==================== 2. HANDLE CREATE (Giữ nguyên) ====================
  const handleCreateChange = (e) => setCreateData({ ...createData, [e.target.name]: e.target.value });
  const handleCreateSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE}/create_order.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      });
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Thành công", `Đã tạo đơn: ${data.tracking_id}`, "success");
        setShowCreateModal(false);
        setCreateData({ sender_name: "", sender_phone: "", sender_address: "", receiver_name: "", receiver_phone: "", receiver_address: "", item_name: "", weight: "", delivery_date: "" });
        fetchOrders();
      } else Swal.fire("Lỗi", data.message, "error");
    } catch (error) { Swal.fire("Lỗi", "Lỗi kết nối server", "error"); }
  };

  // ==================== 3. HANDLE UPDATE (Giữ nguyên) ====================
  const openEditModal = (o) => {
    setEditData({ order_id: o.id, receiver_address: o.address || "", status: o.status });
    setShowEditModal(true);
  };
  const handleEditChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });
  const handleUpdateSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE}/update_order.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Đã cập nhật", "", "success");
        setShowEditModal(false);
        fetchOrders();
      } else Swal.fire("Lỗi", data.message, "error");
    } catch (error) { Swal.fire("Lỗi", error.message, "error"); }
  };

  // ==================== 4. HANDLE DELETE (Tích hợp từ bước trước) ====================
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Xóa đơn hàng?', text: "Hành động này không thể hoàn tác!", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Xóa ngay'
    });
    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_BASE}/delete_order.php`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: id }),
        });
        const data = await res.json();
        if (data.status === "success") {
          Swal.fire('Đã xóa!', '', 'success');
          fetchOrders();
        } else Swal.fire('Lỗi', data.message, 'error');
      } catch (error) { Swal.fire('Lỗi', 'Lỗi kết nối server', 'error'); }
    }
  };

  // ==================== 5. HANDLE ASSIGN (Tính năng MỚI) ====================
  const openAssignModal = (o) => {
    setAssignData({ order_id: o.id, agent_id: "" }); // Reset agent selection
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async () => {
    if (!assignData.agent_id) return Swal.fire("Chú ý", "Vui lòng chọn đại lý", "warning");
    try {
      const res = await fetch(`${API_BASE}/assign_order.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignData),
      });
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Thành công", "Đã phân công đại lý!", "success");
        setShowAssignModal(false);
        fetchOrders();
      } else Swal.fire("Lỗi", data.message, "error");
    } catch (error) { Swal.fire("Lỗi", error.message, "error"); }
  };

  // Helper render status
  const renderStatus = (status) => {
    if (status === 1) return <Badge bg="primary">Booked</Badge>;
    if (status === 2) return <Badge bg="info">Approved</Badge>;
    if (status === 7) return <Badge bg="success">Delivered</Badge>;
    return <Badge bg="secondary">Status {status}</Badge>;
  };

  // 1. Khai báo hook
  const location = useLocation();

  // 2. useEffect để bắt tín hiệu từ Dashboard
  useEffect(() => {
    if (location.state?.action === "create") {
      setShowCreateModal(true);
      // Xóa state để tránh mở lại khi refresh (tùy chọn)
      window.history.replaceState({}, document.title);
    }

    // Với tác vụ "Phân công shipper" (assign), vì cần chọn cụ thể một đơn hàng 
    // nên ta không thể mở modal ngay. Thay vào đó, bạn có thể cuộn chuột xuống bảng 
    // hoặc lọc danh sách đơn hàng cần phân công (nếu có logic lọc).
    if (location.state?.action === "assign") {
      // Ví dụ: Cuộn xuống bảng danh sách
      const tableElement = document.querySelector('.lux-table-wrapper');
      if (tableElement) tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location]);

  return (
    <div className="admin-page">
      <div className="page-header d-flex justify-content-between mb-4">
        <h3 className="fw-bold">Quản lý Đơn hàng</h3>
        <Button className="btn-lux-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus className="me-2" /> Tạo vận đơn
        </Button>
      </div>

      {/* --- KPI CARDS (ĐƯỢC GIỮ NGUYÊN) --- */}
      <Row className="g-3 mb-4">
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">{orders.length}</h2><small>Tổng đơn</small></div><FaBox className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">7</h2><small>Đang vận chuyển</small></div><FaShippingFast className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">18</h2><small>Đã giao</small></div><FaCheckCircle className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">2</h2><small>Huỷ đơn</small></div><FaExclamationTriangle className="fs-1 opacity-50" /></Card.Body></Card></Col>
      </Row>

      {/* --- CHARTS (ĐƯỢC GIỮ NGUYÊN) --- */}
      <Row className="g-4 mb-4">
        <Col md={6}><Card className="card-lux p-3"><h6 className="fw-bold mb-3">Thống kê tuần</h6><div style={{ height: 200 }}><Bar data={chartDailyStatus} /></div></Card></Col>
        <Col md={6}><Card className="card-lux p-3"><h6 className="fw-bold mb-3">Tỷ lệ trạng thái</h6><div style={{ height: 200 }}><Pie data={chartPie} /></div></Card></Col>
      </Row>

      {/* TABLE (CẬP NHẬT THÊM NÚT) */}
      <Card className="card-lux shadow-sm">
        <div className="lux-table-wrapper">
          <Table hover responsive className="lux-table align-middle mb-0">
            <thead className="bg-light">
              <tr><th>Mã đơn</th><th>Người gửi</th><th>Người nhận</th><th>Ngày tạo</th><th>Trạng thái</th><th className="text-center">Hành động</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="fw-bold text-primary">{o.order_code}</td>
                  <td>{o.sender}</td>
                  <td>{o.receiver}<br /><small className="text-muted">{o.address}</small></td>
                  <td>{o.created_at}</td>
                  <td>{renderStatus(o.status)}</td>
                  <td className="text-center">
                    {/* NÚT PHÂN CÔNG (MỚI) */}
                    <Button variant="light" size="sm" title="Phân công" className="me-1" onClick={() => openAssignModal(o)}>
                      <FaUserCog className="text-primary" />
                    </Button>
                    {/* NÚT SỬA */}
                    <Button variant="light" size="sm" title="Sửa" className="me-1" onClick={() => openEditModal(o)}>
                      <FaEdit className="text-warning" />
                    </Button>
                    {/* NÚT XÓA */}
                    <Button variant="light" size="sm" title="Xóa" onClick={() => handleDelete(o.id)}>
                      <FaTrash className="text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan="6" className="text-center py-4">Chưa có đơn hàng nào</td></tr>}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* --- 1. MODAL TẠO (Giữ nguyên) --- */}
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

      {/* --- 2. MODAL SỬA (Giữ nguyên) --- */}
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

      {/* --- 3. MODAL PHÂN CÔNG (MỚI THÊM) --- */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
        <Modal.Header closeButton><Modal.Title>Phân công Đại lý</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Chọn Đại lý phụ trách:</Form.Label>
              <Form.Select
                value={assignData.agent_id}
                onChange={(e) => setAssignData({ ...assignData, agent_id: e.target.value })}
              >
                <option value="">-- Chọn Agent --</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Hủy</Button>
          <Button variant="success" onClick={handleAssignSubmit}>Xác nhận Phân công</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}