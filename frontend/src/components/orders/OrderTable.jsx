import React from "react";
import { Table, Spinner, Button } from "react-bootstrap";
import { FaSearch, FaUserCog, FaEdit, FaTimes, FaRedo, FaUserTie } from "react-icons/fa";

import StatusBadge from "../common/StatusBadge";
import { canAdminAssignShipper, canAdminAssignAgent, isTerminalStatus, ORDER_STATUS } from "../../constants/orderStatus";

import "../../assets/styles/order-table.css";
import "../../assets/styles/order-table-agent.css";
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
  showAgentColumn = false, // For agent dashboard to show "Assigned Agent" column

  onRowClick,
  onViewDetail,
  onAssignShipper,
  onAssignAgent,
  onEditOrder,
  onCancelOrder,
  onReopenOrder,
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

  const handleCancel = (e, order) => {
    e.stopPropagation();
    if (typeof onCancelOrder === "function") onCancelOrder(order);
  };

  const handleReopen = (e, order) => {
    e.stopPropagation();
    if (typeof onReopenOrder === "function") onReopenOrder(order);
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

  // Enterprise: State-driven actions using backend permission flags
  // If permissions exist, use them; otherwise fallback to legacy logic
  const canAssign = (order) => {
    // Use backend permission flags if available (enterprise-safe)
    if (order.permissions) {
      if (userRole === "admin") {
        return order.permissions.can_assign_shipper || order.permissions.can_reassign_shipper;
      }
      if (userRole === "agent") {
        return order.permissions.can_assign_shipper || order.permissions.can_reassign_shipper;
      }
      return false;
    }
    
    // Fallback to legacy logic (backward compatibility)
    if (userRole === "admin") {
      return canAdminAssignShipper(order);
    }
    // Agent can assign shipper if APPROVED and no shipper
    if (userRole === "agent") {
      return (
        Number(order.status) === ORDER_STATUS.APPROVED &&
        (order.shipper_id === null ||
          order.shipper_id === undefined ||
          Number(order.shipper_id) === 0)
      );
    }
    return false;
  };

  const canAssignAgent = (order) => {
    if (userRole !== "admin") return false;
    
    // Use backend permission flags if available (enterprise-safe)
    if (order.permissions) {
      return order.permissions.can_assign_agent;
    }
    
    // Fallback to legacy logic
    return canAdminAssignAgent(order);
  };

  // Admin có thể edit khi không phải terminal status
  const canEdit = (order) => {
    if (userRole !== "admin") return false;
    
    // Use backend permission flags if available
    if (order.permissions) {
      return order.permissions.can_edit;
    }
    
    // Fallback to legacy logic
    return !isTerminalStatus(order.status);
  };

  // Enterprise: Cancel Order - Admin/Agent can cancel non-terminal orders
  const canCancel = (order) => {
    if (userRole !== "admin" && userRole !== "agent") return false;
    
    // Use backend permission flags if available
    if (order.permissions) {
      return order.permissions.can_cancel;
    }
    
    // Fallback to legacy logic
    const status = Number(order.status);
    return !isTerminalStatus(status);
  };

  // Enterprise: Reopen Order - Only soft-cancelled orders (status = CANCELLED = 7)
  // Frontend: Check status = CANCELLED AND previous_status IN (1,2)
  // Backend will validate: soft cancel, no shipper, previous status <= APPROVED
  const canReopen = (order) => {
    if (userRole !== "admin" && userRole !== "agent") return false;
    
    // Use backend permission flags if available
    if (order.permissions) {
      return order.permissions.can_reopen;
    }
    
    // Fallback to legacy logic
    const status = Number(order.status);
    const previousStatus = order.previous_status ? Number(order.previous_status) : null;
    
    // Only CANCELLED (7) orders can be reopened
    if (status !== ORDER_STATUS.CANCELLED) return false;
    
    // Enterprise: Only soft cancels (previous_status = BOOKED or APPROVED) can be reopened
    // If previous_status is null, backend will validate from order_history
    if (previousStatus !== null) {
      return previousStatus === ORDER_STATUS.BOOKED || previousStatus === ORDER_STATUS.APPROVED;
    }
    
    // If previous_status is null, still show button (backend will validate)
    return true;
  };

  /* ================================
   * RENDER
   * ================================ */
  return (
    <div className="card-lux mb-4">
      <div className="lux-table-wrapper">
        <Table hover responsive className={`lux-table align-middle mb-0 ${showAgentColumn ? 'agent-table-with-agent-column' : ''}`}>
          <thead>
            <tr>
              <th>Order Code</th>
              <th>Sender</th>
              <th>Receiver</th>
              {showAgentColumn && <th>Assigned Agent</th>}
              <th>Created Date</th>
              <th>Status</th>
              <th className="text-start">Actions</th>
            </tr>
          </thead>

          <tbody>
            {/* ================= Loading ================= */}
            {loading && (
              <tr>
                <td colSpan={showAgentColumn ? 7 : 6} className="text-center py-4">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading orders...
                </td>
              </tr>
            )}

            {/* ================= Empty ================= */}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={showAgentColumn ? 7 : 6} className="text-center text-muted py-4">
                  No orders found.
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
                  <td className="fw-semibold text-primary" data-label="">
                    <span className="order-code">{o.order_code || o.code}</span>
                  </td>

                  {/* Sender */}
                  <td data-label="Sender">
                    <div className="fw-bold">
                      {o.sender_name || o.sender || "-"}
                    </div>
                    <div className="order-meta-line">
                      {o.sender_phone || "No phone"}
                    </div>
                    <div className="order-meta-line text-muted small">
                      {o.sender_address || "-"}
                    </div>
                  </td>

                  {/* Receiver */}
                  <td data-label="Receiver">
                    <div className="fw-bold">
                      {o.receiver_name || o.receiver || "-"}
                    </div>
                    <div className="order-meta-line">
                      {o.receiver_phone || "No phone"}
                    </div>
                    <div className="order-meta-line text-muted small">
                      {o.receiver_address || "-"}
                    </div>
                  </td>

                  {/* Assigned Agent (only shown if showAgentColumn is true) */}
                  {showAgentColumn && (
                    <td data-label="Assigned Agent">
                      {o.agent_name ? (
                        <div>
                          <div className="fw-semibold">{o.agent_name}</div>
                          {o.agent_id && (
                            <small className="text-muted">ID: {o.agent_id}</small>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted small">Unassigned</span>
                      )}
                    </td>
                  )}

                  {/* Created */}
                  <td data-label="Created">{formatDateTime(o.created_at)}</td>

                  {/* Status */}
                  <td data-label="Status">
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
                        title="View Details"
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
                          title="Edit Order"
                          onClick={(e) => handleEdit(e, o)}
                        >
                          <FaEdit />
                        </Button>
                      )}

                      {/* Cancel – admin/agent only, non-terminal */}
                      {canCancel(o) && onCancelOrder && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          className="order-action-btn"
                          title="Cancel Order (Soft Cancel - can be reopened if before assignment)"
                          onClick={(e) => handleCancel(e, o)}
                        >
                          <FaTimes />
                        </Button>
                      )}

                      {/* Reopen – admin/agent only, cancelled orders */}
                      {canReopen(o) && onReopenOrder && (
                        <Button
                          size="sm"
                          variant="outline-success"
                          className="order-action-btn"
                          title="Reopen Order (only for soft-cancelled orders)"
                          onClick={(e) => handleReopen(e, o)}
                        >
                          <FaRedo />
                        </Button>
                      )}

                      {/* Assign agent – admin only, status=BOOKED/APPROVED && !agent_id */}
                      {canAssignAgent(o) && onAssignAgent && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          className="order-action-btn"
                          title="Assign Agent (only when status=BOOKED/APPROVED and no agent assigned)"
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
                          title="Assign Shipper (only when status=APPROVED and no shipper assigned)"
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
