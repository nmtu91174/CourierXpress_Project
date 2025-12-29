# 🎓 CourierXpress - Master Guide for AI Learning

> **Complete Enterprise Logistics Platform Documentation**  
> **For: ChatGPT 5.2 Pro (DQN)**  
> **Date: 2025-12-28**

---

## 📋 Table of Contents

1. [Enterprise Workflow Architecture](#1-enterprise-workflow-architecture)
2. [RBAC (Role-Based Access Control)](#2-rbac-role-based-access-control)
3. [Order Status Flow & Auto-Routing](#3-order-status-flow--auto-routing)
4. [DQN Luxury CSS Patterns](#4-dqn-luxury-css-patterns)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Component Patterns](#6-frontend-component-patterns)
7. [Best Practices & Conventions](#7-best-practices--conventions)

---

## 1. Enterprise Workflow Architecture

### 1.1 Core Principles

```
┌─────────────────────────────────────────────────────────────┐
│              ENTERPRISE WORKFLOW PRINCIPLES                  │
└─────────────────────────────────────────────────────────────┘

1. ADMIN = Platform Owner / Exception Handler
   - Only intervenes when auto-routing fails (fallback)
   - Does NOT participate in main workflow
   - Can assign agent/shipper ONLY when:
     * routing_status = 'fallback_admin'
     * OR agent_id IS NULL (auto-routing failed)

2. AGENT = Operational Unit (One per District)
   - Receives orders by district (via agent_areas)
   - Assigns shippers belonging to them
   - Responsible for SLA
   - Dashboard = Monitoring only
   - Assign Shipper page = Action queue

3. SHIPPER = Delivery Executor
   - Belongs to an Agent (not fixed by district)
   - Only sees assigned orders
   - No geographical binding
   - Flow: ASSIGNED → PICKED_UP → DELIVERED / FAILED

4. NO Map API for Dispatch
   - No real-time GPS tracking
   - Only records location on failed/dispute
```

### 1.2 Order Creation Flow

```php
// backend/services/OrderService.php

public function create(array $data, array $images = [])
{
    return $this->transaction(function () use ($data, $images) {
        
        // 1. Generate codes
        $orderCode = $this->generateOrderCode();      // ORD0001, ORD0002...
        $invoiceCode = $this->generateInvoiceNumber(); // INV1234, INV5678...
        
        // 2. Extract actor context
        $actorId = (int)($data["actor_id"] ?? 0);
        $actorRole = (string)($data["actor_role"] ?? "");
        
        // 3. Handle guest orders
        if ($actorRole === "guest") {
            $customerId = $this->getGuestCustomerId(); // Dynamic lookup
        }
        
        // 4. Determine initial status
        $status = self::STATUS_BOOKED;  // Default
        $routingStatus = 'auto';
        $assignedBy = 'agent';
        
        // 5. Agent-created orders: auto-approve
        if ($actorRole === "agent") {
            $agentId = $actorId;
            $status = self::STATUS_APPROVED;
        }
        
        // 6. Insert order
        // ... SQL INSERT ...
        
        // 7. AUTO-ROUTING (if not agent-created)
        if ($actorRole !== "agent" && $pickupDistrictId !== null) {
            $routedAgentId = $this->autoRouteAgent($pickupDistrictId);
            if ($routedAgentId !== null) {
                // Update order: agent_id, status = APPROVED
                // Set routing_status = 'auto', assigned_by = 'agent'
                // Log history with role = 'system'
            }
        }
        
        // 8. Create invoice
        // 9. Save fees
        // 10. Log history
        // 11. Emit notifications
        
        return [
            "order_id" => $orderId,
            "order_code" => $orderCode,
            "auto_routed" => ($agentId !== null && $routingStatus === 'auto'),
            "agent_id" => $agentId
        ];
    });
}
```

### 1.3 Auto-Routing Logic

```php
// backend/services/OrderService.php

private function autoRouteAgent(int $districtId): ?int
{
    // Query agent_areas to find active agent for district
    $stmt = $this->prepare("
        SELECT aa.agent_id 
        FROM agent_areas aa
        INNER JOIN users u ON aa.agent_id = u.id
        WHERE aa.district_id = ? 
          AND aa.active = 1 
          AND u.status = 'active'
          AND u.role = 'agent'
        ORDER BY aa.priority ASC 
        LIMIT 1
    ");
    $stmt->bind_param("i", $districtId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        return (int)$row['agent_id'];
    }
    
    return null; // No agent found → Admin fallback
}
```

### 1.4 Status Transition Rules

```
┌─────────────────────────────────────────────────────────────┐
│              ORDER STATUS TRANSITION                         │
└─────────────────────────────────────────────────────────────┘

1. BOOKED (1)
   ├─ Created by: Customer, Admin, Guest
   ├─ Next: Auto-route → APPROVED (2)
   └─ Who can change: System (auto-route), Admin (fallback)

2. APPROVED (2)
   ├─ Created by: Auto-route OR Agent self-create
   ├─ Next: Assign Shipper → ASSIGNED (3)
   └─ Who can change: Agent (assign shipper), Admin (fallback)

3. ASSIGNED (3)
   ├─ Created by: Agent/Admin (assign shipper)
   ├─ Next: Shipper Pickup → IN_PROGRESS (4)
   └─ Who can change: Shipper (confirm pickup)

4. IN_PROGRESS (4)
   ├─ Created by: Shipper (confirm pickup)
   ├─ Next: Delivery → DELIVERED (5) OR FAILED (6)
   └─ Who can change: Shipper (delivery/failed)

5. DELIVERED (5) ✅ TERMINAL
   └─ Cannot change

6. FAILED (6) ❌ TERMINAL
   └─ Cannot change

7. CANCELLED (7) ❌ TERMINAL
   └─ Cannot change
```

---

## 2. RBAC (Role-Based Access Control)

### 2.1 Role Matrix

| Action | Admin | Agent | Shipper | Customer |
|--------|-------|-------|---------|----------|
| **Create Order** | ✅ All | ✅ Self | ❌ | ✅ Self |
| **View Orders** | ✅ All | ✅ Own | ✅ Own | ✅ Own |
| **Edit Orders** | ✅ All | ✅ Own | ❌ | ❌ |
| **Delete Orders** | ✅ | ❌ | ❌ | ❌ |
| **Assign Agent** | ✅ (fallback only) | ❌ | ❌ | ❌ |
| **Assign Shipper** | ✅ (fallback only) | ✅ Own | ❌ | ❌ |
| **Update Status** | ✅ Any | ✅ Own* | ✅ Own** | ❌ |
| **Pickup** | ❌ | ❌ | ✅ Own | ❌ |
| **Delivery** | ❌ | ❌ | ✅ Own | ❌ |

\* Agent: Cannot update terminal states  
\*\* Shipper: Only 3→4 and 4→5

### 2.2 Ownership Rules

```php
// Order Ownership
- Customer: order.customer_id = current_user.id
- Agent: order.agent_id = current_user.id
- Shipper: order.shipper_id = current_user.id
- Admin: NO ownership check (can see all)

// User Ownership
- Admin: Can view/edit any user
- Others: Can only view/edit themselves
```

### 2.3 Admin Fallback Rules

```php
// Admin can ONLY assign agent when:
if ($order->routing_status === 'fallback_admin' || $order->agent_id === null) {
    // Allow admin to assign
} else {
    // BLOCK: Order already has agent (main workflow)
}

// Admin can ONLY assign shipper when:
if ($order->routing_status === 'fallback_admin' || $order->agent_id === null) {
    // Allow admin to assign shipper directly
} else {
    // BLOCK: Agent must assign shipper (main workflow)
}
```

### 2.4 Middleware Pattern

```php
// backend/middleware/require_login.php
require_login();  // Check session/token

// backend/middleware/require_role.php
require_role(["admin"]);        // Only admin
require_role(["admin", "agent"]); // Admin OR agent

// Usage in API
$userId = $GLOBALS['auth_user']['id'];
$role = $GLOBALS['auth_user']['role'];
```

---

## 3. Order Status Flow & Auto-Routing

### 3.1 Status Constants

```php
// backend/services/OrderService.php

public const STATUS_BOOKED    = 1;  // Đã tạo đơn
public const STATUS_APPROVED  = 2;  // Đã duyệt
public const STATUS_ASSIGNED  = 3;  // Đã phân công shipper
public const STATUS_PICKED    = 4;  // Đã lấy hàng (in progress)
public const STATUS_DELIVERED = 5;  // Đã giao hàng ✅ TERMINAL
public const STATUS_FAILED    = 6;  // Giao thất bại ❌ TERMINAL
public const STATUS_CANCELLED = 7;  // Đã hủy ❌ TERMINAL
```

### 3.2 Status Update Flow

```php
// backend/services/OrderService.php

public function updateStatus(int $orderId, int $newStatus, int $actorId, string $actorRole, string $note)
{
    return $this->transaction(function () use ($orderId, $newStatus, $actorId, $actorRole, $note) {
        
        // 1. Get current order state
        $currentOrder = $this->getOrderById($orderId);
        
        // 2. Check terminal states
        $terminalStates = [5, 6, 7]; // DELIVERED, FAILED, CANCELLED
        if (in_array($currentOrder['status'], $terminalStates)) {
            throw new Exception("Order is in terminal state, cannot update");
        }
        
        // 3. Check ownership (based on role)
        if ($actorRole === "agent" && $currentOrder['agent_id'] !== $actorId) {
            throw new Exception("Agent can only update own orders");
        }
        
        if ($actorRole === "shipper" && $currentOrder['shipper_id'] !== $actorId) {
            throw new Exception("Shipper can only update own orders");
        }
        
        // 4. Update status
        $stmt = $this->prepare("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param("ii", $newStatus, $orderId);
        $stmt->execute();
        
        // 5. Log history
        $this->logHistory($orderId, $newStatus, $actorId, $actorRole, $note);
        
        // 6. Emit notifications
        $notificationService = new NotificationService($this->conn);
        if ($newStatus === self::STATUS_DELIVERED) {
            $notificationService->emit('shipper_delivered', $orderId, $actorId, $actorRole);
        }
        
        return true;
    });
}
```

### 3.3 Agent Assignment Flow

```php
// backend/services/OrderService.php

public function assignAgentByAdmin(int $orderId, int $agentId, int $adminId, string $note = "Assign agent")
{
    return $this->transaction(function () use ($orderId, $agentId, $adminId, $note) {
        
        // 1. Check order exists
        $order = $this->getOrderById($orderId);
        
        // 2. ENTERPRISE RULE: Admin can only assign in fallback
        if ($order['agent_id'] !== null) {
            throw new Exception("Order already has agent. Admin can only assign in fallback scenarios.");
        }
        
        // 3. Update order
        $stmt = $this->prepare("
            UPDATE orders 
            SET agent_id = ?, status = ?, routing_status = 'fallback_admin', assigned_by = 'admin'
            WHERE id = ? AND agent_id IS NULL
        ");
        $statusApproved = self::STATUS_APPROVED;
        $stmt->bind_param("iii", $agentId, $statusApproved, $orderId);
        $stmt->execute();
        
        // 4. Log history (role = 'system' for admin actions)
        $this->logHistory($orderId, self::STATUS_APPROVED, $adminId, 'system', $note);
        
        // 5. Emit notifications
        $notificationService = new NotificationService($this->conn);
        $notificationService->emit('agent_assigned', $orderId, $adminId, 'admin');
        $notificationService->emit('agent_approved', $orderId, $adminId, 'admin');
        
        return true;
    });
}
```

### 3.4 Shipper Assignment Flow

```php
// backend/services/OrderService.php

public function assignShipper(int $orderId, int $shipperId, int $actorId, string $role, string $note = "Assign shipper")
{
    return $this->transaction(function () use ($orderId, $shipperId, $actorId, $role, $note) {
        
        // 1. Check order exists and status
        $order = $this->getOrderById($orderId);
        if ($order['status'] !== self::STATUS_APPROVED) {
            throw new Exception("Order must be APPROVED to assign shipper");
        }
        
        // 2. Check ownership
        if ($role === "agent" && $order['agent_id'] !== $actorId) {
            throw new Exception("Agent can only assign shipper to own orders");
        }
        
        // 3. Check shipper belongs to agent (future enhancement)
        // if ($role === "agent" && $shipper->agent_id !== $actorId) {
        //     throw new Exception("Shipper must belong to agent");
        // }
        
        // 4. Update order
        $stmt = $this->prepare("
            UPDATE orders 
            SET shipper_id = ?, status = ?, assigned_at = NOW()
            WHERE id = ? AND shipper_id IS NULL
        ");
        $statusAssigned = self::STATUS_ASSIGNED;
        $stmt->bind_param("iii", $shipperId, $statusAssigned, $orderId);
        $stmt->execute();
        
        // 5. Log history
        $this->logHistory($orderId, self::STATUS_ASSIGNED, $actorId, $role, $note);
        
        // 6. Emit notifications
        $notificationService = new NotificationService($this->conn);
        $notificationService->emit('shipper_assigned', $orderId, $actorId, $role);
        
        return true;
    });
}
```

---

## 4. DQN Luxury CSS Patterns

### 4.1 Core Design Principles

```
┌─────────────────────────────────────────────────────────────┐
│              DQN LUXURY CSS PRINCIPLES                        │
└─────────────────────────────────────────────────────────────┘

1. GRADIENT BACKGROUNDS
   - Use linear-gradient(135deg, color1, color2)
   - Direction: 135deg (diagonal)
   - Colors: Soft, professional, not too bright

2. SMOOTH TRANSITIONS
   - transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)
   - Hover: translateY(-2px) or translateY(-4px)
   - Filter: brightness(1.1) or brightness(1.15)

3. SHADOW SYSTEM
   - Default: 0 2px 8px rgba(0, 0, 0, 0.08)
   - Hover: 0 4px 16px rgba(0, 0, 0, 0.15)
   - Strong: 0 12px 40px rgba(0, 0, 0, 0.15)

4. BORDER RADIUS
   - Buttons: 8px - 12px
   - Cards: 12px - 16px
   - Badges: 20px (pill shape)

5. SHINE EFFECT (::before)
   - Gradient shine on hover
   - left: -100% → left: 100%
   - transition: left 0.5s ease
```

### 4.2 Status Badge Pattern

```css
/* frontend/src/assets/styles/StatusBadge.css */

.status-badge-lux {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;  /* Pill shape */
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #fff;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15),
              0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

/* Shine effect */
.status-badge-lux::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

/* Hover effect */
.status-badge-lux:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25),
              0 2px 8px rgba(0, 0, 0, 0.15);
  filter: brightness(1.1);
}

.status-badge-lux:hover::before {
  left: 100%;
}

/* Color variants */
.sb-blue {
  background: linear-gradient(135deg, #0d6efd, #3b78ff);
}

.sb-indigo {
  background: linear-gradient(135deg, #6610f2, #7f39fb);
}

.sb-purple {
  background: linear-gradient(135deg, #20c997, #3dd5b3);
}

.sb-orange {
  background: linear-gradient(135deg, #fd7e14, #ff9a3d);
}

.sb-green {
  background: linear-gradient(135deg, #198754, #28a86b);
}

.sb-red {
  background: linear-gradient(135deg, #dc3545, #e85b63);
}
```

### 4.3 Coverage Badge Pattern

```css
/* frontend/src/assets/styles/agents.css */

.badge-coverage-luxury {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 20px;  /* Pill shape */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3),
              0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

/* Shine effect */
.badge-coverage-luxury::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

/* Hover effect */
.badge-coverage-luxury:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.15);
  filter: brightness(1.1);
}

.badge-coverage-luxury:hover::before {
  left: 100%;
}

/* Color variants (nth-child) */
.badge-coverage-luxury:nth-child(2n) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.badge-coverage-luxury:nth-child(3n) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.badge-coverage-luxury:nth-child(4n) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
```

### 4.4 Luxury Button Pattern

```css
/* frontend/src/assets/styles/dashboard.css */

.btn-lux-primary {
  background: linear-gradient(135deg, #007bff, #35a0ff);
  color: #fff !important;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-lux-primary:hover {
  filter: brightness(1.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

/* Color variants */
.btn-lux-primary-blue {
  background: linear-gradient(135deg, #007bff, #35a0ff);
}

.btn-lux-primary-yellow {
  background: linear-gradient(135deg, #ffc107, #ffde59);
  color: #4d3b00 !important;
}

.btn-lux-primary-red {
  background: linear-gradient(135deg, #e53935, #ff5252);
  color: #ffffff !important;
}

.btn-lux-primary-green {
  background: linear-gradient(135deg, #43a047, #8bc34a);
  color: #fff !important;
}
```

### 4.5 Luxury Card Pattern

```css
/* frontend/src/assets/styles/agents.css */

.card-lux {
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08),
              0 12px 32px rgba(0, 0, 0, 0.04);
  border: none;
  background: #ffffff;
  transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.card-lux:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1),
              0 16px 48px rgba(0, 0, 0, 0.06);
}

.card-lux .card-body {
  padding: 24px;
}
```

### 4.6 Luxury Table Pattern

```css
/* frontend/src/assets/styles/agents.css */

.lux-table {
  margin: 0;
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  background: #ffffff;
  table-layout: fixed;
}

.lux-table thead {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
}

.lux-table th {
  padding: 16px 20px;
  color: #6c757d;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  white-space: nowrap;
  border: none;
}

.lux-table td {
  padding: 16px 20px;
  font-size: 0.9rem;
  color: #2d3748;
  vertical-align: middle;
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background-color 0.05s linear;
}

.lux-table tbody tr:hover td {
  background-color: rgba(0, 123, 255, 0.03);
}

/* NO transform on hover (enterprise static look) */
.lux-table tbody td * {
  transform: none !important;
  transition: none !important;
  font-size: inherit !important;
}
```

### 4.7 Luxury Panel Pattern

```css
/* frontend/src/assets/styles/orderDetailPanel.css */

.panel-section.luxury-section {
  margin-bottom: 28px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}

.panel-section.luxury-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 123, 255, 0.2);
}

.section-title.luxury-section-title {
  font-size: 0.85rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #495057;
  margin-bottom: 16px;
  letter-spacing: 0.8px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(0, 123, 255, 0.15);
}

.luxury-info-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.luxury-info-item small {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c757d;
}

.luxury-info-item > div {
  font-size: 0.95rem;
  color: #212529;
  line-height: 1.5;
}
```

### 4.8 KPI Card Pattern

```css
/* frontend/src/assets/styles/agents.css */

.kpi-item {
  border: none !important;
  overflow: hidden;
  position: relative;
}

.kpi-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.kpi-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
}

.kpi-item:hover::before {
  opacity: 1;
}
```

---

## 5. Backend Architecture

### 5.1 Layer Structure

```
backend/
├── core/           # Core utilities
│   ├── Response.php        # JSON response standardization
│   ├── Cors.php            # CORS handling
│   ├── BaseService.php     # Base class for services
│   ├── Logger.php          # Logging helpers
│   └── SessionHelper.php  # Session management
│
├── middleware/     # Authentication & Authorization
│   ├── require_login.php   # Check user logged in
│   ├── require_role.php   # Check user role
│   └── rate_limit.php     # Rate limiting
│
├── services/       # Business logic layer
│   ├── OrderService.php      # Order CRUD, status, routing
│   ├── UserService.php        # User management
│   ├── FeeService.php         # Fee calculation
│   ├── NotificationService.php # Notifications
│   └── TrackingService.php    # Tracking history
│
└── api/            # API endpoints (RESTful)
    ├── admin/      # Admin endpoints
    ├── auth/       # Authentication
    ├── shipper/    # Shipper endpoints
    ├── users/      # User management
    └── tracking/   # Tracking endpoints
```

### 5.2 API Template Pattern

```php
<?php
// backend/api/[module]/[action].php

// =====================================================
// 1. CORS (MUST BE FIRST)
// =====================================================
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// =====================================================
// 2. CORE & DB
// =====================================================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

// =====================================================
// 3. AUTH
// =====================================================
require_login();
require_role(["admin"]);  // Or other roles

$userId = $GLOBALS['auth_user']['id'];
$role = $GLOBALS['auth_user']['role'];

// =====================================================
// 4. METHOD CHECK
// =====================================================
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    Response::error("Method not allowed", 405);
}

// =====================================================
// 5. INPUT VALIDATION
// =====================================================
$param = $_GET["param"] ?? null;
if (!$param) {
    Response::error("Missing parameter");
}

// =====================================================
// 6. BUSINESS LOGIC (Service Layer)
// =====================================================
require_once __DIR__ . "/../../services/OrderService.php";

try {
    $service = new OrderService($conn);
    $result = $service->doSomething($param);
    
    Response::success("Success", $result);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

$conn->close();
```

### 5.3 Service Pattern

```php
<?php
// backend/services/OrderService.php

require_once __DIR__ . "/../core/BaseService.php";

class OrderService extends BaseService
{
    public function __construct($conn)
    {
        parent::__construct($conn);
    }
    
    public function create(array $data, array $images = [])
    {
        return $this->transaction(function () use ($data, $images) {
            // Business logic here
            // Use $this->prepare() for SQL
            // Use $this->logApp() for app logs
            // Use $this->logAudit() for audit logs
            
            return $result;
        });
    }
    
    private function bindParamsChecked($stmt, string $types, array $params): void
    {
        $typeLen = strlen($types);
        $paramCount = count($params);
        
        if ($typeLen !== $paramCount) {
            throw new Exception(
                "bind_param mismatch: type string length ({$typeLen}) != param count ({$paramCount})"
            );
        }
        
        $refs = [];
        foreach ($params as $key => $value) {
            $refs[$key] = &$params[$key];
        }
        
        if (!$stmt->bind_param($types, ...$refs)) {
            throw new Exception("bind_param failed: " . $stmt->error);
        }
    }
}
```

### 5.4 Response Pattern

```php
<?php
// backend/core/Response.php

class Response
{
    public static function success($message, $data = null, $code = 200)
    {
        http_response_code($code);
        echo json_encode([
            "status" => "success",
            "message" => $message,
            "data" => $data
        ]);
        exit;
    }
    
    public static function error($message, $code = 400)
    {
        http_response_code($code);
        echo json_encode([
            "status" => "error",
            "message" => $message
        ]);
        exit;
    }
    
    public static function unauthorized($message = "Unauthorized")
    {
        self::error($message, 401);
    }
    
    public static function forbidden($message = "Forbidden")
    {
        self::error($message, 403);
    }
    
    public static function serverError($message = "Internal Server Error")
    {
        self::error($message, 500);
    }
}
```

---

## 6. Frontend Component Patterns

### 6.1 StatusBadge Component

```jsx
// frontend/src/components/common/StatusBadge.jsx

import React from "react";
import "../../assets/styles/statusBadge.css";
import { ORDER_STATUS, ORDER_STATUS_LABEL } from "../../constants/orderStatus";

export default function StatusBadge({ status }) {
  const statusNum = Number(status);
  const label = ORDER_STATUS_LABEL[statusNum] || "Unknown";
  
  let cls = "sb-default";
  
  switch (statusNum) {
    case ORDER_STATUS.BOOKED: // 1
      cls = "sb-blue";
      break;
    case ORDER_STATUS.APPROVED: // 2
      cls = "sb-indigo";
      break;
    case ORDER_STATUS.ASSIGNED: // 3
      cls = "sb-purple";
      break;
    case ORDER_STATUS.IN_PROGRESS: // 4
      cls = "sb-orange";
      break;
    case ORDER_STATUS.DELIVERED: // 5
      cls = "sb-green";
      break;
    case ORDER_STATUS.FAILED: // 6
      cls = "sb-red";
      break;
    default:
      cls = "sb-default";
  }

  return <span className={`status-badge-lux ${cls}`}>{label}</span>;
}
```

### 6.2 OrderDetailPanel Component Pattern

```jsx
// frontend/src/components/orders/OrderDetailPanel.jsx

<div className={`order-panel luxury-panel ${isOpen ? "open" : ""}`}>
  {/* HEADER */}
  <div className="order-panel-header luxury-panel-header">
    <h5>Order Details</h5>
    <button className="btn-close-panel" onClick={onClose}>×</button>
  </div>
  
  {/* BODY */}
  <div className="order-panel-body luxury-panel-body">
    {/* SECTION */}
    <section className="panel-section luxury-section">
      <h6 className="section-title luxury-section-title">
        <FaUser className="me-2" /> Sender Information
      </h6>
      <div className="section-content luxury-section-content">
        <div className="luxury-info-item">
          <small>Name</small>
          <div className="fw-bold">{order.sender_name}</div>
        </div>
        <div className="luxury-info-item">
          <small>Phone</small>
          <div>{order.sender_phone}</div>
        </div>
      </div>
    </section>
  </div>
</div>
```

### 6.3 Table Component Pattern

```jsx
// frontend/src/components/orders/OrderTable.jsx

<div className="lux-table-wrapper">
  <table className="lux-table">
    <thead>
      <tr>
        <th>Order Code</th>
        <th>Status</th>
        <th>Agent</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {orders.map(order => (
        <tr key={order.id}>
          <td>{order.order_code}</td>
          <td>
            <StatusBadge status={order.status} />
          </td>
          <td>{order.agent_name || "N/A"}</td>
          <td>
            <button className="btn-lux-outline" onClick={() => handleView(order)}>
              View
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 7. Best Practices & Conventions

### 7.1 Database Patterns

```php
// ✅ ALWAYS use prepared statements
$stmt = $this->prepare("SELECT * FROM orders WHERE id = ?");
$stmt->bind_param("i", $orderId);
$stmt->execute();

// ✅ ALWAYS check bind_param mismatch
$this->bindParamsChecked($stmt, $types, $params);

// ✅ ALWAYS use transactions for multi-step operations
return $this->transaction(function () {
    // Multiple SQL operations
});

// ✅ ALWAYS close statements
$stmt->close();
```

### 7.2 Error Handling

```php
// ✅ Use try-catch in services
try {
    $result = $service->doSomething();
    Response::success("Success", $result);
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    Response::serverError($e->getMessage());
}

// ✅ Validate input before processing
if (empty($orderId) || $orderId <= 0) {
    Response::error("Invalid order ID");
}
```

### 7.3 Logging Patterns

```php
// ✅ App logs (system errors)
$this->logApp("ERROR", "Order creation failed: " . $e->getMessage());

// ✅ Audit logs (business actions)
$this->logAudit($userId, $role, "CREATE_ORDER", $orderId, "Order created");

// ✅ Debug logs (development)
error_log("AUTO-ROUTING: Found agent_id {$agentId} for district_id {$districtId}");
```

### 7.4 Frontend Patterns

```jsx
// ✅ Use StatusBadge component for all status displays
<StatusBadge status={order.status} />

// ✅ Use luxury CSS classes
<button className="btn-lux-primary">Create Order</button>
<span className="badge-coverage-luxury">Ba Đình</span>

// ✅ Use luxury panel sections
<section className="panel-section luxury-section">
  <h6 className="section-title luxury-section-title">Title</h6>
  <div className="section-content luxury-section-content">
    <div className="luxury-info-item">
      <small>Label</small>
      <div>Value</div>
    </div>
  </div>
</section>
```

### 7.5 Naming Conventions

```
Backend:
- Files: snake_case.php (create_order.php)
- Classes: PascalCase (OrderService)
- Methods: camelCase (createOrder)
- Constants: UPPER_SNAKE_CASE (STATUS_BOOKED)

Frontend:
- Files: PascalCase.jsx (OrderManagement.jsx)
- Components: PascalCase (StatusBadge)
- CSS Classes: kebab-case (status-badge-lux)
- Variables: camelCase (orderList)
```

### 7.6 Security Patterns

```php
// ✅ Always check ownership
if ($role === "agent" && $order['agent_id'] !== $userId) {
    Response::forbidden("Cannot access this order");
}

// ✅ Always check terminal states
$terminalStates = [5, 6, 7];
if (in_array($currentStatus, $terminalStates)) {
    throw new Exception("Order is in terminal state");
}

// ✅ Always validate input
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error("Invalid email");
}
```

---

## 📚 Summary

### Key Takeaways

1. **Enterprise Workflow**: Admin = fallback only, Agent = operational owner, Shipper = executor
2. **Auto-Routing**: System automatically assigns agents based on `pickup_district_id` and `agent_areas`
3. **RBAC**: Strict ownership checks, role-based permissions, terminal state protection
4. **DQN Luxury CSS**: Gradients, smooth transitions, shine effects, pill-shaped badges
5. **Backend Architecture**: Service layer pattern, transaction-based operations, standardized responses
6. **Frontend Patterns**: Reusable components, luxury styling, consistent UI/UX

### File Structure Reference

```
Backend:
- Core: backend/core/
- Services: backend/services/
- API: backend/api/
- Middleware: backend/middleware/

Frontend:
- Components: frontend/src/components/
- Pages: frontend/src/pages/
- Styles: frontend/src/assets/styles/
- Config: frontend/src/config/
```

---

**End of Master Guide**  
**Last Updated: 2025-12-28**

