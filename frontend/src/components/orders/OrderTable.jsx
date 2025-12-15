import React from "react";
import { Table, Spinner, Button } from "react-bootstrap";
import { FaSearch, FaUserCog, FaEdit, FaTrash, FaUserTie } from "react-icons/fa";

import StatusBadge from "../common/StatusBadge";
import { canAdminAssignShipper, canAdminAssignAgent, isTerminalStatus } from "../../constants/orderStatus";

import "../../assets/styles/order-table.css";
import "../../assets/styles/order.css";

/**
 * ORDER TABLE – ENTERPRISE WORKFLOW (OPTION B)
 *
 * Role-based actions:
 * - Admin   : View + Edit + Delete + Assign shipper (ONLY status=APPROVED && !shipper_id)
 * - Agent   : View
 * - Shipper : View
 * - Customer: View
 */
export default function OrderTable({
  loading = false,
  orders = [],
  userRole = "admin",

  onRowClick,
  onViewDetail,
  onAssignShipper,
  onAssignAgent,
  onEditOrder,
  onDeleteOrder,
}) {
  /* ================================
   * HANDLERS
   * ================================ */
  const handleRowClick = (order) => {
    if (typeof onRowClick === "function") onRowClick(order);
  };

  const handleView = (e, order) => {
    e.stopPropagation();
    if (typeof onViewDetail === "function") onViewDetail(order);
  };

  const handleAssign = (e, order) => {
    e.stopPropagation();
    if (typeof onAssignShipper === "function") onAssignShipper(order);
  };

  const handleAssignAgent = (e, order) => {
    e.stopPropagation();
    if (typeof onAssignAgent === "function") onAssignAgent(order);
  };

  const handleEdit = (e, order) => {
    e.stopPropagation();
    if (typeof onEditOrder === "function") onEditOrder(order);
  };

  const handleDelete = (e, order) => {
    e.stopPropagation();
    if (typeof onDeleteOrder === "function") onDeleteOrder(order);
  };

  /* ================================
   * HELPERS
   * ================================ */
  const formatDateTime = (raw) => {
    if (!raw) return "-";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;

    const pad = (n) => String(n).padStart(2, "0");
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return (
      <div style={{ lineHeight: 1.4 }}>
        <div>{date}</div>
        <div className="text-muted small" style={{ fontSize: "0.8rem" }}>{time}</div>
      </div>
    );
  };

  const canAssign = (order) => {
    if (userRole !== "admin") return false;
    return canAdminAssignShipper(order);
  };

  const canAssignAgent = (order) => {
    if (userRole !== "admin") return false;
    return canAdminAssignAgent(order);
  };

  // Admin có thể edit/delete khi không phải terminal status
  const canEdit = (order) => {
    if (userRole !== "admin") return false;
    return !isTerminalStatus(order.status);
  };

  const canDelete = (order) => {
    if (userRole !== "admin") return false;
    // Có thể delete bất kỳ status nào (soft delete)
    return true;
  };

  /* ================================
   * RENDER
   * ================================ */
  return (
    <div className="card-lux mb-4">
      <div className="lux-table-wrapper">
        <Table hover responsive className="lux-table align-middle mb-0">
          <thead>
            <tr>
              <th>Mã vận đơn</th>
              <th>Người gửi</th>
              <th>Người nhận</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
              <th className="text-start">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {/* ================= Loading ================= */}
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang tải dữ liệu đơn hàng...
                </td>
              </tr>
            )}

            {/* ================= Empty ================= */}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  Không có đơn hàng phù hợp.
                </td>
              </tr>
            )}

            {/* ================= Data ================= */}
            {!loading &&
              orders.map((o) => (
                <tr
                  key={o.id || o.order_code}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(o)}
                >
                  {/* Order code */}
                  <td className="fw-semibold text-primary">
                    {o.order_code || o.code}
                  </td>

                  {/* Sender */}
                  <td>
                    <div className="fw-bold">
                      {o.sender_name || o.sender || "-"}
                    </div>
                    <div className="order-meta-line">
                      {o.sender_phone || "Chưa có SĐT"}
                    </div>
                    <div className="order-meta-line text-muted small">
                      {o.sender_address || "-"}
                    </div>
                  </td>

                  {/* Receiver */}
                  <td>
                    <div className="fw-bold">
                      {o.receiver_name || o.receiver || "-"}
                    </div>
                    <div className="order-meta-line">
                      {o.receiver_phone || "Chưa có SĐT"}
                    </div>
                    <div className="order-meta-line text-muted small">
                      {o.receiver_address || "-"}
                    </div>
                  </td>

                  {/* Created */}
                  <td>{formatDateTime(o.created_at)}</td>

                  {/* Status */}
                  <td>
                    <StatusBadge status={o.status} />
                  </td>

                  {/* Actions */}
                  <td className="text-start">
                    <div className="d-flex gap-1 justify-content-start">
                      {/* View – all roles */}
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="order-action-btn"
                        title="Xem chi tiết"
                        onClick={(e) => handleView(e, o)}
                      >
                        <FaSearch />
                      </Button>

                      {/* Edit – admin only, không phải terminal status */}
                      {canEdit(o) && onEditOrder && (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="order-action-btn"
                          title="Sửa đơn hàng"
                          onClick={(e) => handleEdit(e, o)}
                        >
                          <FaEdit />
                        </Button>
                      )}

                      {/* Delete – admin only */}
                      {canDelete(o) && onDeleteOrder && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          className="order-action-btn"
                          title="Xóa đơn hàng"
                          onClick={(e) => handleDelete(e, o)}
                        >
                          <FaTrash />
                        </Button>
                      )}

                      {/* Assign agent – admin only, status=BOOKED/APPROVED && !agent_id */}
                      {canAssignAgent(o) && onAssignAgent && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          className="order-action-btn"
                          title="Phân công agent (chỉ khi status=BOOKED/APPROVED và chưa có agent)"
                          onClick={(e) => handleAssignAgent(e, o)}
                        >
                          <FaUserTie />
                        </Button>
                      )}

                      {/* Assign shipper – admin only, status=APPROVED && !shipper_id */}
                      {canAssign(o) && onAssignShipper && (
                        <Button
                          size="sm"
                          variant="outline-warning"
                          className="order-action-btn"
                          title="Phân công shipper (chỉ khi status=APPROVED và chưa có shipper)"
                          onClick={(e) => handleAssign(e, o)}
                        >
                          <FaUserCog />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
