import React, { useState } from "react";
import { Table, Spinner, Button } from "react-bootstrap";
import { FaSearch, FaUserCog, FaEdit, FaTimesCircle, FaRedo, FaClone, FaLevelUpAlt, FaUserTie, FaStop } from "react-icons/fa";

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
  focusedOrderId = null, // For highlighting order from Dashboard redirect
  onUserInteraction = null, // Callback to reset highlight when user interacts (ONLY on click, NOT on hover)

  onRowClick,
  onViewDetail,
  onAssignShipper,
  onAssignAgent,
  onEditOrder,
  onCancelOrder,
  onTerminateWorkflow,
  onReopenOrder,
  onCloneOrder,
  onCreateFollowupOrder,
}) {
  // Separate hover state (JS-controlled for smooth scroll)
  const [hoveredOrderId, setHoveredOrderId] = useState(null);

  /* ================================
   * HANDLERS
   * ================================ */
  const handleRowClick = (order) => {
    // Only reset highlight on click, NOT on hover
    if (typeof onUserInteraction === "function") onUserInteraction();
    if (typeof onRowClick === "function") onRowClick(order);
  };

  const handleRowMouseEnter = (orderId) => {
    setHoveredOrderId(orderId);
    // DO NOT call onUserInteraction here - hover should NOT reset highlight
  };

  const handleRowMouseLeave = () => {
    setHoveredOrderId(null);
    // DO NOT call onUserInteraction here - hover should NOT reset highlight
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

  const handleTerminateWorkflow = (e, order) => {
    e.stopPropagation();
    if (typeof onTerminateWorkflow === "function") onTerminateWorkflow(order);
  };

  const handleReopen = (e, order) => {
    e.stopPropagation();
    if (typeof onReopenOrder === "function") onReopenOrder(order);
  };

  const handleClone = (e, order) => {
    e.stopPropagation();
    if (typeof onCloneOrder === "function") onCloneOrder(order);
  };

  const handleCreateFollowup = (e, order) => {
    e.stopPropagation();
    if (typeof onCreateFollowupOrder === "function") onCreateFollowupOrder(order);
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
  // ENTERPRISE RULE: Only AGENT can assign shipper (not admin)
  const canAssign = (order) => {
    // ENTERPRISE: Admin must NEVER assign shipper in normal workflow
    if (userRole === "admin") {
      return false; // Admin cannot assign shipper
    }
    
    // Use backend permission flags if available (enterprise-safe)
    if (order.permissions) {
      // Only show "Assign Shipper" if can_assign_shipper (APPROVED + no shipper)
      // Do NOT show for can_reassign_shipper (that's a different action)
      if (userRole === "agent") {
        return order.permissions.can_assign_shipper === true;
      }
      return false;
    }
    
    // Fallback to legacy logic (backward compatibility)
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

  // Reassign Shipper: Only for ASSIGNED status (before pickup)
  const canReassign = (order) => {
    if (userRole !== "admin" && userRole !== "agent") return false;
    
    // Use backend permission flags if available
    if (order.permissions) {
      return order.permissions.can_reassign_shipper === true;
    }
    
    // Fallback: ASSIGNED (3) with shipper but not picked up
    const status = Number(order.status);
    const hasShipper = order.shipper_id !== null && order.shipper_id !== undefined && Number(order.shipper_id) !== 0;
    
    return status === ORDER_STATUS.ASSIGNED && hasShipper;
  };

  const canAssignAgent = (order) => {
    // ENTERPRISE: Only admin can assign agent, and only in fallback scenarios
    if (userRole !== "admin") return false;
    
    // Use backend permission flags if available (enterprise-safe)
    if (order.permissions) {
      return order.permissions.can_assign_agent;
    }
    
    // Fallback to legacy logic (checks routing_status === 'fallback_admin' OR agent_id IS NULL)
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

  // Enterprise: Reopen Order - Only soft-cancelled orders (status < ASSIGNED before cancel)
  const canReopen = (order) => {
    if (userRole !== "admin" && userRole !== "agent") return false;
    
    // Use backend permission flags if available
    if (order.permissions) {
      return order.permissions.can_reopen === true;
    }
    
    // Fallback to legacy logic
    const status = Number(order.status);
    const previousStatus = order.previous_status ? Number(order.previous_status) : null;
    
    // Only CANCELLED (7) orders with previous_status < ASSIGNED (3) can be reopened
    if (status !== ORDER_STATUS.CANCELLED) return false;
    if (previousStatus !== null && previousStatus < 3) return true;
    
    return false;
  };

  // Enterprise: Clone Order - Only cancelled at ASSIGNED (previous_status = 3, chưa pickup)
  // Enterprise Rule: Clone only when assigned but not yet picked up
  const canClone = (order) => {
    if (userRole !== "admin" && userRole !== "agent") return false;
    
    // Use backend permission flags if available (enterprise-safe)
    if (order.permissions) {
      return order.permissions.can_clone === true;
    }
    
    // Fallback to legacy logic
    const status = Number(order.status);
    const previousStatus = order.previous_status ? Number(order.previous_status) : null;
    
    // Only CANCELLED (7) at ASSIGNED (previous_status = 3) can be cloned
    if (status !== ORDER_STATUS.CANCELLED) return false;
    if (previousStatus !== null && previousStatus === ORDER_STATUS.ASSIGNED) return true;
    
    return false;
  };

  // Enterprise: Terminate Workflow - Only from ASSIGNED (3) onward
  // Enterprise Rule: Workflow Termination (internal close) is separate from Business Cancellation
  // Allowed if:
  // - Current status = ASSIGNED (3) OR IN_PROGRESS (4)
  // - NOT allowed for BOOKED/APPROVED (use Cancel instead)
  // - NOT allowed for terminal statuses
  const canTerminateWorkflow = (order) => {
    if (userRole !== "admin" && userRole !== "agent") return false;
    
    // Use backend permission flags if available (enterprise-safe)
    if (order.permissions) {
      return order.permissions.can_terminate_workflow === true;
    }
    
    // Fallback to legacy logic
    const status = Number(order.status);
    
    // Only ASSIGNED (3) or IN_PROGRESS (4) can be terminated
    return status === ORDER_STATUS.ASSIGNED || status === ORDER_STATUS.IN_PROGRESS;
  };

  // Enterprise: Create Follow-up Order - Only after pickup
  // Enterprise Rule: Follow-up only when real-world operation occurred
  // Allowed if:
  // - Current status >= IN_PROGRESS (4), OR
  // - Current status = CANCELLED (7) AND previous_status >= IN_PROGRESS (4), OR
  // - Current status = FAILED (6) (typically after pickup)
  const canCreateFollowup = (order) => {
    if (userRole !== "admin" && userRole !== "agent") return false;
    
    // Use backend permission flags if available (enterprise-safe)
    if (order.permissions) {
      return order.permissions.can_create_followup === true;
    }
    
    // Fallback to legacy logic
    const status = Number(order.status);
    const previousStatus = order.previous_status ? Number(order.previous_status) : null;
    
    // Current status >= IN_PROGRESS (already picked up)
    if (status >= ORDER_STATUS.IN_PROGRESS) return true;
    
    // CANCELLED after pickup (previous_status >= IN_PROGRESS)
    if (status === ORDER_STATUS.CANCELLED && previousStatus !== null && previousStatus >= ORDER_STATUS.IN_PROGRESS) {
      return true;
    }
    
    // FAILED (typically after pickup)
    if (status === ORDER_STATUS.FAILED) return true;
    
    return false;
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
              orders.map((o) => {
                const isHighlighted = focusedOrderId && Number(o.id) === Number(focusedOrderId);
                const isHovered = hoveredOrderId === o.id;
                
                return (
                  <tr
                    key={o.id || o.order_code}
                    data-order-id={o.id}
                    className={`cursor-pointer order-row ${isHighlighted ? 'highlight' : ''} ${isHovered ? 'hovered' : ''}`}
                    onClick={() => handleRowClick(o)}
                    onMouseEnter={() => handleRowMouseEnter(o.id)}
                    onMouseLeave={handleRowMouseLeave}
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

                      {/* Cancel – admin/agent only, BOOKED/APPROVED only */}
                      {canCancel(o) && onCancelOrder && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          className="order-action-btn"
                          title="Cancel Order (Business Cancellation - only for BOOKED or APPROVED orders)"
                          onClick={(e) => handleCancel(e, o)}
                        >
                          <FaTimesCircle />
                        </Button>
                      )}

                      {/* Terminate Workflow – admin/agent only, ASSIGNED/IN_PROGRESS only */}
                      {canTerminateWorkflow(o) && onTerminateWorkflow && (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          className="order-action-btn"
                          title="Terminate Workflow (Internal Close - only for ASSIGNED or IN_PROGRESS orders, enables clone/follow-up)"
                          onClick={(e) => handleTerminateWorkflow(e, o)}
                        >
                          <FaStop />
                        </Button>
                      )}

                      {/* Reopen – admin/agent only, soft-cancelled orders (previous_status < ASSIGNED) */}
                      {canReopen(o) && onReopenOrder && (
                        <Button
                          size="sm"
                          variant="outline-success"
                          className="order-action-btn"
                          title="Reopen Order (revive soft-cancelled order, restore to previous status)"
                          onClick={(e) => handleReopen(e, o)}
                        >
                          <FaRedo />
                        </Button>
                      )}

                      {/* Clone Order – admin/agent only, cancelled at ASSIGNED (chưa pickup) */}
                      {canClone(o) && onCloneOrder && (
                        <Button
                          size="sm"
                          variant="outline-info"
                          className="order-action-btn"
                          title="Clone Order (only for orders cancelled at ASSIGNED, before pickup - creates new order to restart)"
                          onClick={(e) => handleClone(e, o)}
                        >
                          <FaClone />
                        </Button>
                      )}

                      {/* Create Follow-up Order – admin/agent only, after pickup (cancelled/failed after IN_PROGRESS) */}
                      {canCreateFollowup(o) && onCreateFollowupOrder && (
                        <Button
                          size="sm"
                          variant="outline-warning"
                          className="order-action-btn"
                          title="Create Follow-up Order (only for orders cancelled/failed after pickup - continue real shipment)"
                          onClick={(e) => handleCreateFollowup(e, o)}
                        >
                          <FaLevelUpAlt />
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

                      {/* Assign shipper – ONLY when APPROVED and no shipper */}
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
                      
                      {/* Reassign shipper – ONLY when ASSIGNED and not picked up (optional - can be hidden) */}
                      {/* Note: Reassign is typically done via Edit modal or separate flow, not table action */}
                      {/* Uncomment if you want to show Reassign button in table:
                      {canReassign(o) && onAssignShipper && (
                        <Button
                          size="sm"
                          variant="outline-info"
                          className="order-action-btn"
                          title="Reassign Shipper (only when status=ASSIGNED and not picked up)"
                          onClick={(e) => handleAssign(e, o)}
                        >
                          <FaUserCog /> Reassign
                        </Button>
                      )}
                      */}
                    </div>
                  </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
