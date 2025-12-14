// frontend/src/components/orders/OrderDetailPanel.jsx
import React from "react";
import { FaTimes, FaUserCheck } from "react-icons/fa";
import StatusBadge from "../common/StatusBadge";
import { ORDER_STATUS, canAdminAssignShipper, isTerminalStatus } from "../../constants/orderStatus";

import "../../assets/styles/orderDetailPanel.css";

/**
 * OrderDetailPanel - Enterprise Workflow (Option B)
 * 
 * Role-based actions:
 * - Admin: ASSIGN SHIPPER (chỉ khi status=2 APPROVED && !shipper_id)
 * - Agent: Không có action (chỉ view)
 * - Shipper: Không có action trong panel này (actions ở shipper pages)
 * - Customer: Không có action (chỉ view)
 */
export default function OrderDetailPanel({
  order,
  isOpen,
  onClose,
  onAssign,
  userRole = "admin", // Get from props or localStorage
}) {
  if (!order) return null;

  // Enterprise workflow: Admin chỉ assign khi status=2 (APPROVED) && !shipper_id
  const canAssign = () => {
    if (userRole !== "admin") return false;
    if (isTerminalStatus(order.status)) return false; // Không assign terminal states
    return canAdminAssignShipper(order);
  };

  const agentName =
    order.agentName ||
    order.agent_name ||
    order.agent ||
    "-";

  const paymentLabel =
    order.paymentMethod ||
    order.payment_method_name ||
    order.payment_method_code ||
    "-";

  return (
    <div className={`order-panel ${isOpen ? "open" : ""}`}>
      {/* HEADER */}
      <div className="order-panel-header">
        <h5 className="fw-bold m-0">
          Chi tiết đơn{" "}
          <span className="text-primary">{order.code}</span>
        </h5>

        <div className="d-flex align-items-center gap-2">
          {/* Trạng thái tổng quát */}
          <StatusBadge status={order.status} />

          {/* Enterprise Workflow: Chỉ hiển thị ASSIGN SHIPPER khi đúng điều kiện */}
          {canAssign() && onAssign && (
            <button
              className="btn btn-sm btn-warning text-dark d-flex align-items-center gap-1"
              onClick={() => onAssign(order)}
              type="button"
              title="Phân công shipper (chỉ khi status=APPROVED và chưa có shipper)"
            >
              <FaUserCheck /> Phân công Shipper
            </button>
          )}

          <button
            className="btn-close-panel"
            onClick={onClose}
            type="button"
            title="Đóng"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="order-panel-body">
        {/* THÔNG TIN CHUNG */}
        <section className="panel-section">
          <h6 className="section-title">Thông tin chung</h6>
          <div className="section-content">
            <p>
              <strong>Mã vận đơn:</strong> {order.code}
            </p>
            <p>
              <strong>Ngày tạo:</strong>{" "}
              {order.createdDisplay || order.created_at || order.created}
            </p>
            <p>
              <strong>Phương thức thanh toán:</strong> {paymentLabel}
            </p>
          </div>
        </section>

        {/* NGƯỜI GỬI */}
        <section className="panel-section">
          <h6 className="section-title">Người gửi</h6>
          <div className="section-content">
            <p>
              <strong>Tên:</strong>{" "}
              {order.sender || order.sender_name}
            </p>
            <p>
              <strong>Số điện thoại:</strong>{" "}
              {order.senderPhone || order.sender_phone || "-"}
            </p>
            <p>
              <strong>Địa chỉ:</strong>{" "}
              {order.senderAddress || order.sender_address || "-"}
            </p>
          </div>
        </section>

        {/* NGƯỜI NHẬN */}
        <section className="panel-section">
          <h6 className="section-title">Người nhận</h6>
          <div className="section-content">
            <p>
              <strong>Tên:</strong>{" "}
              {order.receiver || order.receiver_name}
            </p>
            <p>
              <strong>Số điện thoại:</strong>{" "}
              {order.receiverPhone || order.receiver_phone || "-"}
            </p>
            <p>
              <strong>Địa chỉ:</strong>{" "}
              {order.receiverAddress || order.receiver_address || "-"}
            </p>
          </div>
        </section>

        {/* VẬN CHUYỂN */}
        <section className="panel-section">
          <h6 className="section-title">Vận chuyển</h6>
          <div className="section-content">
            <p>
              <strong>Đại lý phụ trách:</strong> {agentName}
            </p>
            <p>
              <strong>Shipper:</strong>{" "}
              {order.shipper ||
                order.shipperName ||
                order.shipper_name ||
                "-"}
            </p>
            <p>
              <strong>Tiền COD:</strong>{" "}
              {order.codAmount || order.cod_amount
                ? (order.codAmount || order.cod_amount).toLocaleString(
                    "vi-VN"
                  ) + " ₫"
                : "-"}
            </p>
            <p>
              <strong>Phí ship:</strong>{" "}
              {order.shippingFee || order.total_shipping_fee
                ? (order.shippingFee ||
                    order.total_shipping_fee
                  ).toLocaleString("vi-VN") + " ₫"
                : "-"}
            </p>
          </div>
        </section>

        {/* GHI CHÚ */}
        <section className="panel-section">
          <h6 className="section-title">Ghi chú</h6>
          <div className="section-content">
            <p>{order.notes || order.note || "Không có ghi chú."}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
  