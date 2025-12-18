// frontend/src/components/orders/OrderFilterBar.jsx
import React from "react";
import { Row, Col, Form, Button } from "react-bootstrap";
import { FaSearch, FaTimes } from "react-icons/fa";
import { STATUS_GROUP_OPTIONS } from "../../constants/orderStatusGroups";

import "../../assets/styles/orderFilterBar.css";

/**
 * Enterprise Order Filter Bar
 * - Status groups (pending, handling, completed, exception)
 * - Workflow filters (no agent, no shipper, assigned not picked)
 * - Finance filters (payment status, COD)
 * - Advanced search
 */
export default function OrderFilterBar({
  filterStatus,
  filterStatusGroup,     // NEW: Filter theo nhóm trạng thái
  filterBranch,          // dùng như filterAgentId
  filterShipper,
  filterPayment,
  filterPaymentStatus,   // NEW: unpaid/paid/cancelled
  filterCOD,             // NEW: has_cod / no_cod
  filterNoAgent,        // NEW: Chưa có agent
  filterNoShipper,      // NEW: Chưa có shipper
  filterAssignedNotPicked, // NEW: Đã assign chưa pickup
  filterDateFrom,
  filterDateTo,
  searchText,
  agents = [],           // Danh sách agents từ API
  shippers = [],         // Danh sách shippers từ API
  onStatusChange,
  onStatusGroupChange,   // NEW
  onBranchChange,        // thực chất là onAgentChange
  onShipperChange,
  onPaymentChange,
  onPaymentStatusChange, // NEW
  onCODChange,           // NEW
  onNoAgentChange,       // NEW
  onNoShipperChange,     // NEW
  onAssignedNotPickedChange, // NEW
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onResetFilters,
}) {
  return (
    <div className="filter-card-lux mb-3 p-3 order-filter-bar">
      <Form>
        {/* DÒNG 1: Trạng thái, Đại lý, Shipper, Phương thức, Thanh toán */}
        <Row className="g-2 align-items-end mb-2">
          <Col md={2}>
            <Form.Label className="lux-label">Trạng thái</Form.Label>
            <Form.Select
              size="sm"
              className="lux-select"
              value={filterStatusGroup || "all"}
              onChange={(e) => onStatusGroupChange && onStatusGroupChange(e.target.value)}
            >
              {STATUS_GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={2}>
            <Form.Label className="lux-label">Đại lý phụ trách</Form.Label>
            <Form.Select
              size="sm"
              className="lux-select"
              value={filterBranch}
              onChange={(e) => onBranchChange(e.target.value)}
            >
              <option value="all">Tất cả đại lý</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.email ? `(${agent.email})` : ""}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={2}>
            <Form.Label className="lux-label">Shipper</Form.Label>
            <Form.Select
              size="sm"
              className="lux-select"
              value={filterShipper}
              onChange={(e) => onShipperChange(e.target.value)}
            >
              <option value="all">Tất cả shipper</option>
              {shippers.map((shipper) => (
                <option key={shipper.id} value={shipper.id}>
                  {shipper.name} {shipper.email ? `(${shipper.email})` : ""}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={2}>
            <Form.Label className="lux-label">Phương thức</Form.Label>
            <Form.Select
              size="sm"
              className="lux-select"
              value={filterPayment}
              onChange={(e) => onPaymentChange(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="1">Tiền mặt</option>
              <option value="2">Chuyển khoản</option>
              <option value="3">Ví MoMo</option>
            </Form.Select>
          </Col>

          <Col md={2}>
            <Form.Label className="lux-label">Thanh toán</Form.Label>
            <Form.Select
              size="sm"
              className="lux-select"
              value={filterPaymentStatus || "all"}
              onChange={(e) => onPaymentStatusChange && onPaymentStatusChange(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="cancelled">Đã hủy</option>
            </Form.Select>
          </Col>
        </Row>
        
        {/* DÒNG 2: Từ ngày, Đến ngày, Bộ lọc vận hành, Bộ lọc tài chính */}
        <Row className="g-2 align-items-start mb-2">
          {/* Từ ngày */}
          <Col md={2}>
            <Form.Label className="lux-label">Từ ngày</Form.Label>
            <Form.Control
              size="sm"
              type="date"
              className="lux-input"
              value={filterDateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </Col>

          {/* Đến ngày */}
          <Col md={2}>
            <Form.Label className="lux-label">Đến ngày</Form.Label>
            <Form.Control
              size="sm"
              type="date"
              className="lux-input"
              value={filterDateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </Col>

          {/* Bộ lọc tài chính và vận hành - sát nhau */}
          <Col md={8}>
            <div className="d-flex gap-2 align-items-start">
              {/* Bộ lọc tài chính */}
              <div className="flex-shrink-0">
                <Form.Label className="lux-label">Bộ lọc tài chính</Form.Label>
                <div className="d-flex align-items-center gap-2">
                  <Form.Label className="mb-0 small">COD:</Form.Label>
                  <Form.Select
                    size="sm"
                    className="lux-select"
                    style={{ width: "auto", minWidth: "150px" }}
                    value={filterCOD || "all"}
                    onChange={(e) => onCODChange && onCODChange(e.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="has_cod">Có COD</option>
                    <option value="no_cod">Không COD</option>
                  </Form.Select>
                </div>
              </div>

              {/* Bộ lọc vận hành */}
              <div className="flex-grow-1">
                <Form.Label className="lux-label">Bộ lọc vận hành</Form.Label>
                <div className="d-flex flex-wrap mb-0 vanhanh">
                  <Form.Check
                    type="checkbox"
                    id="filter-no-agent"
                    label="Chưa có đại lý"
                    checked={filterNoAgent || false}
                    onChange={(e) => onNoAgentChange && onNoAgentChange(e.target.checked)}
                  />
                  <Form.Check
                    type="checkbox"
                    id="filter-no-shipper"
                    label="Chưa có shipper"
                    checked={filterNoShipper || false}
                    onChange={(e) => onNoShipperChange && onNoShipperChange(e.target.checked)}
                  />
                  <Form.Check
                    type="checkbox"
                    id="filter-assigned-not-picked"
                    label="Đã assign chưa pickup"
                    checked={filterAssignedNotPicked || false}
                    onChange={(e) => onAssignedNotPickedChange && onAssignedNotPickedChange(e.target.checked)}
                  />
                </div>
              </div>
            </div>
          </Col>
        </Row>


        {/* DÒNG 3: Tìm kiếm và nút xóa bộ lọc */}
        <Row className="g-2">
          <Col md={9}>
            <Form.Label className="lux-label">Tìm kiếm</Form.Label>
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <Form.Control
                size="sm"
                type="text"
                className="lux-input-search"
                placeholder="Tìm theo mã vận đơn, SĐT, mã hóa đơn..."
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <Form.Text className="text-muted small d-block mt-1">
              Tìm kiếm: order_code, sender_phone, receiver_phone, invoice_number
            </Form.Text>
          </Col>

          <Col md={3} className="d-flex flex-column">
            <Form.Label className="lux-label">&nbsp;</Form.Label>
            <Button
              variant="light"
              size="sm"
              className="btn-lux-outline d-flex align-items-center justify-content-center gap-1"
              onClick={onResetFilters}
              type="button"
              style={{ marginTop: '5px' }}
            >
              <FaTimes /> Xóa bộ lọc
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
