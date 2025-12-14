# 🔐 RBAC & Workflow Documentation - CourierXpress

> **Tài liệu về Phân quyền (RBAC) và Workflow của hệ thống**  
> Cập nhật: 2025-12-14

---

## 📋 Mục Lục

1. [Tổng Quan RBAC](#tổng-quan-rbac)
2. [Các Role Trong Hệ Thống](#các-role-trong-hệ-thống)
3. [Order Workflow](#order-workflow)
4. [Phân Quyền Chi Tiết Theo Role](#phân-quyền-chi-tiết-theo-role)
5. [Workflow Files](#workflow-files)
6. [Best Practices](#best-practices)

---

## 🎯 Tổng Quan RBAC

### **RBAC (Role-Based Access Control) là gì?**

RBAC là mô hình phân quyền dựa trên **vai trò (role)** của người dùng. Mỗi user có 1 role, và role đó quyết định:
- ✅ API nào được phép truy cập
- ✅ Dữ liệu nào được phép xem/sửa
- ✅ Hành động nào được phép thực hiện

### **Cách Hoạt Động**

```
User Login
  ↓
Session/Token được set với role
  ↓
API Request
  ↓
Middleware: require_login() → Kiểm tra đã login chưa
  ↓
Middleware: require_role(["admin"]) → Kiểm tra role có đúng không
  ↓
Business Logic → Kiểm tra quyền chi tiết (ownership, status, etc.)
  ↓
Response
```

### **4 Role Chính**

| Role | Mô Tả | Quyền Hạn |
|------|-------|-----------|
| **admin** | Quản trị viên | Toàn quyền hệ thống |
| **agent** | Đại lý | Quản lý đơn hàng được phân công |
| **shipper** | Người giao hàng | Xử lý đơn hàng được phân công |
| **customer** | Khách hàng | Xem và tạo đơn hàng của mình |

---

## 👥 Các Role Trong Hệ Thống

### **1. ADMIN (Quản Trị Viên)**

#### **Định Nghĩa**
- Role cao nhất trong hệ thống
- Có toàn quyền quản lý và giám sát

#### **Quyền Hạn**

**✅ Quản Lý Đơn Hàng:**
- Tạo đơn hàng cho bất kỳ customer nào
- Xem TẤT CẢ đơn hàng (không giới hạn)
- Sửa TẤT CẢ đơn hàng
- Xóa đơn hàng
- Cập nhật trạng thái đơn hàng (bất kỳ status nào)
- Phân công agent cho đơn hàng (status = BOOKED, chưa có agent)
- Phân công shipper cho đơn hàng (status = APPROVED, chưa có shipper)

**✅ Quản Lý Users:**
- Tạo agent mới
- Xem danh sách agents với KPI
- Bật/tắt agent (toggle status)
- Xem danh sách shippers
- Xem thông tin bất kỳ user nào
- Cập nhật thông tin bất kỳ user nào (kể cả role, status)
- Reset mật khẩu user
- Vô hiệu hóa user

**✅ Báo Cáo & Analytics:**
- Xem dashboard với KPI
- Xem reports với đầy đủ filters
- Xem logs hệ thống (app.log, audit.log)
- Export dữ liệu (PDF, CSV, Excel)

**✅ Không Giới Hạn:**
- Không bị giới hạn bởi ownership (có thể xem/sửa đơn của ai cũng được)
- Không bị giới hạn bởi status (có thể update status bất kỳ)
- Có thể bypass một số business rules

#### **Workflow Files Sử Dụng**

```
api/admin/
├── create_order.php          → Tạo đơn (có thể tạo cho customer khác)
├── get_orders.php            → Xem tất cả đơn (có filter)
├── update_order.php          → Sửa đơn bất kỳ
├── delete_order.php          → Xóa đơn
├── assign_agent.php          → Phân công agent
├── assign_shipper.php        → Phân công shipper
├── create_agent.php          → Tạo agent mới
├── get_agents_with_kpi.php   → Xem agents + KPI
├── toggle_agent_status.php  → Bật/tắt agent
├── get_reports_data.php      → Lấy dữ liệu báo cáo
└── view_logs.php            → Xem logs

api/users/
├── get_user.php              → Xem user bất kỳ
├── update_user.php           → Sửa user bất kỳ
├── disable_user.php          → Vô hiệu hóa user
└── reset_user_password.php   → Reset mật khẩu
```

---

### **2. AGENT (Đại Lý)**

#### **Định Nghĩa**
- Đại lý được admin phân công để quản lý đơn hàng
- Có thể tạo đơn hàng và phân công shipper cho đơn của mình

#### **Quyền Hạn**

**✅ Quản Lý Đơn Hàng (Giới Hạn):**
- Tạo đơn hàng (tự động được assign cho mình, status = APPROVED)
- Xem đơn hàng được phân công cho mình (`agent_id = current_user.id`)
- Sửa đơn hàng được phân công cho mình
- Phân công shipper cho đơn của mình (status = APPROVED, `agent_id = current_user.id`)
- Cập nhật trạng thái đơn hàng của mình (trừ terminal states)

**❌ Không Được:**
- Xem đơn hàng của agent khác
- Phân công shipper cho đơn không thuộc mình
- Phân công agent (chỉ admin mới được)
- Xóa đơn hàng
- Tạo agent mới
- Xem reports/logs

#### **Workflow Files Sử Dụng**

```
api/admin/
├── create_order.php          → Tạo đơn (tự động assign cho mình)
├── get_orders.php            → Xem đơn của mình (filter by agent_id)
├── update_order.php          → Sửa đơn của mình
└── assign_shipper.php        → Phân công shipper cho đơn của mình

api/users/
└── get_user.php              → Xem profile của mình
```

#### **Workflow Agent**

```
1. Agent Login
   → api/auth/login.php
   → Role: "agent"

2. Tạo Đơn Hàng
   → api/admin/create_order.php
   → POST: {customer_id, ...}
   → Backend tự động:
      - Set agent_id = current_user.id
      - Set status = APPROVED (2)
      - Tạo order_approval record

3. Xem Danh Sách Đơn Của Mình
   → api/admin/get_orders.php
   → Backend filter: WHERE agent_id = current_user.id

4. Phân Công Shipper
   → api/admin/assign_shipper.php
   → POST: {order_id, shipper_id}
   → Backend check:
      - Order phải có agent_id = current_user.id
      - Order phải có status = APPROVED
      - Order chưa có shipper_id
   → Update: shipper_id, status = ASSIGNED (3)

5. Cập Nhật Trạng Thái
   → api/admin/update_order.php
   → PUT: {order_id, status, note}
   → Backend check:
      - Order phải có agent_id = current_user.id
      - Status không được là terminal (DELIVERED, FAILED, CANCELLED)
```

---

### **3. SHIPPER (Người Giao Hàng)**

#### **Định Nghĩa**
- Shipper được phân công để giao hàng
- Chỉ xử lý đơn hàng được phân công cho mình

#### **Quyền Hạn**

**✅ Quản Lý Đơn Hàng (Rất Giới Hạn):**
- Xem danh sách đơn cần lấy hàng (status = ASSIGNED, `shipper_id = current_user.id`)
- Xem danh sách đơn đang giao (status = IN_PROGRESS, `shipper_id = current_user.id`)
- Xem chi tiết đơn hàng được phân công cho mình
- Xác nhận đã lấy hàng (status: ASSIGNED → IN_PROGRESS)
- Xác nhận đã giao hàng (status: IN_PROGRESS → DELIVERED)

**❌ Không Được:**
- Tạo đơn hàng
- Sửa thông tin đơn hàng
- Xem đơn hàng không thuộc mình
- Phân công shipper khác
- Cập nhật trạng thái khác (chỉ được pickup và delivery)

#### **Workflow Files Sử Dụng**

```
api/shipper/
├── list_to_pickup.php        → Danh sách đơn cần lấy (status=3)
├── list_in_progress.php       → Danh sách đơn đang giao (status=4)
├── order_detail.php           → Chi tiết đơn (chỉ đơn của mình)
├── confirm_pickup.php         → Xác nhận đã lấy hàng (3→4)
└── confirm_delivery.php       → Xác nhận đã giao hàng (4→5)

api/users/
└── get_user.php              → Xem profile của mình
```

#### **Workflow Shipper (Chi Tiết)**

```
┌─────────────────────────────────────────────────────────────┐
│                    SHIPPER WORKFLOW                         │
└─────────────────────────────────────────────────────────────┘

1. SHIPPER LOGIN
   ───────────────────────────────────────────────────────────
   → api/auth/login.php
   → Role: "shipper"
   → Session: {id, role: "shipper", ...}

2. XEM ĐƠN CẦN LẤY HÀNG
   ───────────────────────────────────────────────────────────
   → api/shipper/list_to_pickup.php
   → GET: (không cần params)
   → Backend Query:
      SELECT * FROM orders
      WHERE shipper_id = current_user.id
        AND status = 3 (ASSIGNED)
   → Response: Array of orders

3. XEM CHI TIẾT ĐƠN HÀNG
   ───────────────────────────────────────────────────────────
   → api/shipper/order_detail.php?order_id=123
   → GET: order_id
   → Backend Check:
      - Order phải có shipper_id = current_user.id
      - Nếu không → Response 403 Forbidden
   → Response: Full order info + images + history + fees

4. XÁC NHẬN ĐÃ LẤY HÀNG (PICKUP)
   ───────────────────────────────────────────────────────────
   → api/shipper/confirm_pickup.php
   → POST: {order_id: 123}
   → Backend Flow:
      
      a. Check Order Exists
         SELECT id, status, shipper_id, order_code
         FROM orders WHERE id = 123
      
      b. Check Ownership
         if (order.shipper_id !== current_user.id) {
             Response::error("Bạn không được phép pickup đơn này");
         }
      
      c. Check Status
         if (order.status !== 3) {
             Response::error("Đơn hàng không ở trạng thái chờ pickup");
         }
      
      d. Update Status
         OrderService::updateStatus(
             orderId: 123,
             newStatus: 4 (IN_PROGRESS),
             actorId: current_user.id,
             actorRole: "shipper",
             note: "Shipper đã pickup hàng"
         )
      
      e. Auto Log:
         - order_history: INSERT (order_id, status_id=4, user_id, role="shipper")
         - audit.log: [timestamp] user=... role=shipper action=UPDATE_STATUS order=123
      
      f. Response
         {order_id: 123, order_code: "ORD0123", status: 4}

5. XEM ĐƠN ĐANG GIAO
   ───────────────────────────────────────────────────────────
   → api/shipper/list_in_progress.php
   → GET: (không cần params)
   → Backend Query:
      SELECT * FROM orders
      WHERE shipper_id = current_user.id
        AND status = 4 (IN_PROGRESS)
   → Response: Array of orders

6. XÁC NHẬN ĐÃ GIAO HÀNG (DELIVERY)
   ───────────────────────────────────────────────────────────
   → api/shipper/confirm_delivery.php
   → POST: {order_id: 123}
   → Backend Flow:
      
      a. Check Order Exists
         SELECT id, status, shipper_id, order_code
         FROM orders WHERE id = 123
      
      b. Check Ownership
         if (order.shipper_id !== current_user.id) {
             Response::error("Bạn không được phép giao đơn này");
         }
      
      c. Check Status
         if (order.status !== 4) {
             Response::error("Đơn hàng chưa ở trạng thái đang giao");
         }
      
      d. Update Status
         OrderService::updateStatus(
             orderId: 123,
             newStatus: 5 (DELIVERED),
             actorId: current_user.id,
             actorRole: "shipper",
             note: "Giao hàng thành công"
         )
      
      e. Auto Log:
         - order_history: INSERT (order_id, status_id=5, user_id, role="shipper")
         - audit.log: [timestamp] user=... role=shipper action=UPDATE_STATUS order=123
      
      f. Response
         {order_id: 123, order_code: "ORD0123", status: 5}
```

---

### **4. CUSTOMER (Khách Hàng)**

#### **Định Nghĩa**
- Người dùng cuối, tạo đơn hàng và theo dõi đơn của mình
- Quyền hạn rất hạn chế

#### **Quyền Hạn**

**✅ Quản Lý Đơn Hàng (Rất Hạn Chế):**
- Tạo đơn hàng (tự động `customer_id = current_user.id`)
- Xem đơn hàng của mình (`customer_id = current_user.id`)
- Xem tracking history của đơn mình
- Xem chi tiết đơn hàng của mình

**❌ Không Được:**
- Sửa đơn hàng
- Xóa đơn hàng
- Cập nhật trạng thái đơn hàng (chỉ admin/agent/shipper mới được)
- Phân công agent/shipper
- Xem đơn hàng của customer khác

#### **Workflow Files Sử Dụng**

```
api/admin/
├── create_order.php          → Tạo đơn (tự động customer_id = current_user.id)
├── get_orders.php            → Xem đơn của mình (filter by customer_id)
└── update_order.php          → KHÔNG được update status

api/tracking/
└── get_tracking_history.php  → Xem tracking đơn của mình

api/users/
└── get_user.php              → Xem profile của mình
```

#### **Workflow Customer**

```
1. Customer Register/Login
   → api/auth/register.php hoặc api/auth/login.php
   → Role: "customer"

2. Tạo Đơn Hàng
   → api/admin/create_order.php
   → POST: {sender_name, receiver_name, ...}
   → Backend tự động:
      - Set customer_id = current_user.id
      - Set status = BOOKED (1)
      - Generate order_code

3. Xem Danh Sách Đơn Của Mình
   → api/admin/get_orders.php
   → Backend filter: WHERE customer_id = current_user.id

4. Xem Tracking
   → api/tracking/get_tracking_history.php?order_id=123
   → Backend check: Order phải có customer_id = current_user.id
   → Response: Timeline của đơn hàng
```

---

## 📦 Order Workflow

### **Order Status Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              ORDER STATUS TRANSITION                         │
└─────────────────────────────────────────────────────────────┘

1. BOOKED (1) - Đã tạo đơn
   ├─ Created by: Customer, Admin, Agent
   ├─ Next actions:
   │  ├─ Admin → Assign Agent → APPROVED (2)
   │  └─ Agent tự tạo → Tự động APPROVED (2)
   └─ Who can change: Admin (assign agent)

2. APPROVED (2) - Đã duyệt
   ├─ Created by: Admin (assign agent) hoặc Agent tự tạo
   ├─ Next actions:
   │  ├─ Admin/Agent → Assign Shipper → ASSIGNED (3)
   │  └─ Admin → Update status khác
   └─ Who can change: Admin, Agent (assign shipper)

3. ASSIGNED (3) - Đã phân công shipper
   ├─ Created by: Admin/Agent (assign shipper)
   ├─ Next actions:
   │  └─ Shipper → Confirm Pickup → IN_PROGRESS (4)
   └─ Who can change: Shipper (confirm pickup)

4. IN_PROGRESS (4) - Đang giao hàng
   ├─ Created by: Shipper (confirm pickup)
   ├─ Next actions:
   │  ├─ Shipper → Confirm Delivery → DELIVERED (5)
   │  └─ Shipper → Mark Failed → FAILED (6)
   └─ Who can change: Shipper (delivery/failed)

5. DELIVERED (5) - Đã giao hàng ✅
   ├─ Created by: Shipper (confirm delivery)
   ├─ Terminal state: KHÔNG thể thay đổi
   └─ Who can change: Không ai (terminal)

6. FAILED (6) - Giao thất bại ❌
   ├─ Created by: Shipper hoặc Admin
   ├─ Terminal state: KHÔNG thể thay đổi
   └─ Who can change: Không ai (terminal)

7. CANCELLED (7) - Đã hủy ❌
   ├─ Created by: Admin hoặc Customer (nếu cho phép)
   ├─ Terminal state: KHÔNG thể thay đổi
   └─ Who can change: Admin (hoặc Customer nếu cho phép)
```

### **Status Transition Rules**

| From Status | To Status | Who Can Do | Condition |
|-------------|-----------|------------|-----------|
| BOOKED (1) | APPROVED (2) | Admin | Assign agent |
| BOOKED (1) | APPROVED (2) | Agent | Tự tạo đơn |
| APPROVED (2) | ASSIGNED (3) | Admin, Agent | Assign shipper |
| ASSIGNED (3) | IN_PROGRESS (4) | Shipper | Confirm pickup (chỉ đơn của mình) |
| IN_PROGRESS (4) | DELIVERED (5) | Shipper | Confirm delivery (chỉ đơn của mình) |
| IN_PROGRESS (4) | FAILED (6) | Shipper, Admin | Mark failed |
| Any | CANCELLED (7) | Admin | Cancel order |

### **Terminal States**

Các trạng thái **terminal** (kết thúc) không thể thay đổi:
- ✅ **DELIVERED (5)** - Đã giao thành công
- ❌ **FAILED (6)** - Giao thất bại
- ❌ **CANCELLED (7)** - Đã hủy

**Rule**: Khi đơn ở terminal state, KHÔNG cho phép:
- Update status
- Assign agent/shipper
- Modify order info (có thể cho phép một số field như notes)

---

## 🔐 Phân Quyền Chi Tiết Theo Role

### **Matrix Phân Quyền**

| Action | Admin | Agent | Shipper | Customer |
|--------|-------|-------|---------|----------|
| **Tạo đơn hàng** | ✅ (cho ai cũng được) | ✅ (tự động assign mình) | ❌ | ✅ (cho mình) |
| **Xem đơn hàng** | ✅ (tất cả) | ✅ (đơn của mình) | ✅ (đơn của mình) | ✅ (đơn của mình) |
| **Sửa đơn hàng** | ✅ (tất cả) | ✅ (đơn của mình) | ❌ | ❌ |
| **Xóa đơn hàng** | ✅ | ❌ | ❌ | ❌ |
| **Assign Agent** | ✅ | ❌ | ❌ | ❌ |
| **Assign Shipper** | ✅ (tất cả) | ✅ (đơn của mình) | ❌ | ❌ |
| **Update Status** | ✅ (bất kỳ) | ✅ (đơn của mình, trừ terminal) | ✅ (chỉ pickup/delivery) | ❌ |
| **Confirm Pickup** | ❌ | ❌ | ✅ (đơn của mình) | ❌ |
| **Confirm Delivery** | ❌ | ❌ | ✅ (đơn của mình) | ❌ |
| **Xem Reports** | ✅ | ❌ | ❌ | ❌ |
| **Xem Logs** | ✅ | ❌ | ❌ | ❌ |
| **Tạo Agent** | ✅ | ❌ | ❌ | ❌ |
| **Toggle Agent Status** | ✅ | ❌ | ❌ | ❌ |
| **Xem User Info** | ✅ (tất cả) | ✅ (chỉ mình) | ✅ (chỉ mình) | ✅ (chỉ mình) |
| **Update User Info** | ✅ (tất cả) | ✅ (chỉ mình) | ✅ (chỉ mình) | ✅ (chỉ mình) |
| **Reset Password** | ✅ (tất cả) | ❌ | ❌ | ❌ |
| **Disable User** | ✅ | ❌ | ❌ | ❌ |

### **Ownership Rules**

#### **Order Ownership**

| Field | Owner | Rule |
|-------|-------|------|
| `customer_id` | Customer | Customer chỉ xem được đơn có `customer_id = current_user.id` |
| `agent_id` | Agent | Agent chỉ xem/sửa được đơn có `agent_id = current_user.id` |
| `shipper_id` | Shipper | Shipper chỉ xem/xử lý được đơn có `shipper_id = current_user.id` |
| Admin | - | Admin xem được TẤT CẢ (không giới hạn ownership) |

#### **User Ownership**

| Action | Rule |
|--------|------|
| Xem user info | Admin: Tất cả<br>Others: Chỉ mình |
| Update user info | Admin: Tất cả<br>Others: Chỉ mình (không được sửa role, status) |
| Reset password | Chỉ Admin |
| Disable user | Chỉ Admin |

---

## 🔄 Workflow Files

### **1. Authentication Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              AUTHENTICATION WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘

File: api/auth/login.php
───────────────────────────────────────────────────────────────
1. CORS setup
2. Read input: {email, password}
3. Query user by email
4. Verify password (password_verify)
5. Check status = "active"
6. Update last_login
7. Set session: $_SESSION["user"] = {id, name, email, role, ...}
8. Response: User info (không có password)

File: api/auth/register.php
───────────────────────────────────────────────────────────────
1. CORS setup
2. Read input: {name, email, password, confirmPassword, role?}
3. Validate input
4. Check email exists
5. Hash password
6. Insert user (role mặc định: "customer" nếu không chỉ định)
7. Log audit (optional)
8. Response: New user info

File: middleware/require_login.php
───────────────────────────────────────────────────────────────
1. Start session (SessionHelper::start())
2. Check $_SESSION["user"] → Set $GLOBALS['auth_user']
3. Fallback: Check Bearer Token → Query DB → Set $GLOBALS['auth_user']
4. If not found → Response::unauthorized() và exit
```

### **2. Authorization Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              AUTHORIZATION WORKFLOW                          │
└─────────────────────────────────────────────────────────────┘

File: middleware/require_role.php
───────────────────────────────────────────────────────────────
1. Check $GLOBALS['auth_user'] exists (phải gọi require_login() trước)
2. Get role từ $GLOBALS['auth_user']['role']
3. Check role có trong array roles được phép không
4. If not → Response::forbidden() và exit

Example:
───────────────────────────────────────────────────────────────
require_login();
require_role(["admin", "agent"]);  // Chỉ admin hoặc agent

// Sau khi pass, có thể dùng:
$userId = $GLOBALS['auth_user']['id'];
$role = $GLOBALS['auth_user']['role'];
```

### **3. Order Creation Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              ORDER CREATION WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘

File: api/admin/create_order.php
───────────────────────────────────────────────────────────────
1. CORS + Auth (require_login, require_role)
2. Read input data
3. Determine actor (current_user)
4. Call OrderService::create($data, $images)
   
   Inside OrderService::create():
   ───────────────────────────────────────────────────────────
   a. Generate order_code (ORD0001, ORD0002, ...)
   b. Determine initial status:
      - Customer/Admin tạo → status = BOOKED (1)
      - Agent tạo → status = APPROVED (2), agent_id = actor_id
   c. Calculate fees (FeeService::calculate())
   d. Insert order
   e. Save fees (FeeService::saveOrderFees())
   f. Create invoice
   g. Create order_approval (nếu agent tạo)
   h. Save images
   i. Log history (order_history)
   j. Log audit (audit.log)
   k. Return {order_id, order_code, shipping_fee}
   
5. Response success với order info
```

### **4. Order Status Update Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              ORDER STATUS UPDATE WORKFLOW                    │
└─────────────────────────────────────────────────────────────┘

File: api/admin/update_order.php
───────────────────────────────────────────────────────────────
1. CORS + Auth
2. Read input: {order_id, status?, note?}
3. Role check:
   - Customer: KHÔNG được update status
   - Others: Được update (nhưng phải check ownership)
4. Call OrderService::updateStatus()
   
   Inside OrderService::updateStatus():
   ───────────────────────────────────────────────────────────
   a. Check order exists
   b. Validate status exists in DB
   c. Update orders.status
   d. Log history (order_history):
      - order_id, status_id, user_id, role, note
      - Role được convert: "admin" → "system" (vì order_history.role không có "admin")
   e. Log audit (audit.log):
      - [timestamp] user=... role=... action=UPDATE_STATUS order=... note=...
   f. Return true
   
5. Response success
```

### **5. Assign Agent Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              ASSIGN AGENT WORKFLOW                          │
└─────────────────────────────────────────────────────────────┘

File: api/admin/assign_agent.php
───────────────────────────────────────────────────────────────
1. CORS + Auth
2. require_role(["admin"])  // CHỈ ADMIN
3. Read input: {order_id, agent_id}
4. Call OrderService::assignAgentByAdmin()
   
   Inside OrderService::assignAgentByAdmin():
   ───────────────────────────────────────────────────────────
   a. Check order exists và chưa có agent (agent_id IS NULL)
   b. Update: agent_id, status = APPROVED (2)
   c. Log history (role = "system" vì admin)
   d. Log audit: action=ASSIGN_AGENT, note="agent={agent_id}"
   
5. Response success
```

### **6. Assign Shipper Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              ASSIGN SHIPPER WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘

File: api/admin/assign_shipper.php
───────────────────────────────────────────────────────────────
1. CORS + Auth
2. require_role(["admin", "agent"])  // ADMIN hoặc AGENT
3. Read input: {order_id, shipper_id}
4. Call OrderService::assignShipper()
   
   Inside OrderService::assignShipper():
   ───────────────────────────────────────────────────────────
   a. Check order exists
   b. Check status = APPROVED (2)
   c. Check ownership:
      - Admin: Không check (có thể assign bất kỳ đơn nào)
      - Agent: Order phải có agent_id = current_user.id
   d. Check chưa có shipper (shipper_id IS NULL)
   e. Update: shipper_id, status = ASSIGNED (3)
   f. Log history
   g. Log audit: action=ASSIGN_SHIPPER, note="shipper={shipper_id}"
   
5. Response success
```

### **7. Shipper Pickup Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              SHIPPER PICKUP WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘

File: api/shipper/confirm_pickup.php
───────────────────────────────────────────────────────────────
1. CORS + Auth
2. require_role(["shipper"])  // CHỈ SHIPPER
3. Read input: {order_id}
4. Check order:
   a. Order exists
   b. Order.shipper_id = current_user.id (ownership)
   c. Order.status = ASSIGNED (3)
5. Call OrderService::updateStatus()
   - newStatus = IN_PROGRESS (4)
   - actorRole = "shipper"
   - note = "Shipper đã pickup hàng"
6. Log history + audit
7. Response success
```

### **8. Shipper Delivery Flow**

```
┌─────────────────────────────────────────────────────────────┐
│              SHIPPER DELIVERY WORKFLOW                      │
└─────────────────────────────────────────────────────────────┘

File: api/shipper/confirm_delivery.php
───────────────────────────────────────────────────────────────
1. CORS + Auth
2. require_role(["shipper"])  // CHỈ SHIPPER
3. Read input: {order_id}
4. Check order:
   a. Order exists
   b. Order.shipper_id = current_user.id (ownership)
   c. Order.status = IN_PROGRESS (4)
5. Call OrderService::updateStatus()
   - newStatus = DELIVERED (5)
   - actorRole = "shipper"
   - note = "Giao hàng thành công"
6. Log history + audit
7. Response success
```

---

## 🎯 Best Practices

### **1. Luôn Check Ownership**

```php
// ❌ SAI - Không check ownership
$stmt = $conn->prepare("SELECT * FROM orders WHERE id = ?");
$stmt->bind_param("i", $orderId);

// ✅ ĐÚNG - Check ownership
$stmt = $conn->prepare("
    SELECT * FROM orders 
    WHERE id = ? AND shipper_id = ?
");
$stmt->bind_param("ii", $orderId, $currentUserId);
```

### **2. Luôn Check Status Trước Khi Update**

```php
// ✅ Check status hợp lệ
$check = $conn->prepare("SELECT status FROM orders WHERE id = ?");
$check->bind_param("i", $orderId);
$check->execute();
$order = $check->get_result()->fetch_assoc();

if ((int)$order["status"] !== 3) {
    Response::error("Đơn hàng không ở trạng thái chờ pickup");
}
```

### **3. Luôn Log Actions**

```php
// ✅ Log history và audit
$this->logHistory($orderId, $newStatus, $userId, $role, $note);
$this->logAudit($userId, $role, "UPDATE_STATUS", $orderId, $note);
```

### **4. Dùng Service Layer Cho Business Logic**

```php
// ❌ SAI - Business logic trong API
$stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
$stmt->bind_param("ii", $newStatus, $orderId);
$stmt->execute();

// ✅ ĐÚNG - Dùng Service
$service = new OrderService($conn);
$service->updateStatus($orderId, $newStatus, $userId, $role, $note);
```

### **5. Check Terminal States**

```php
// ✅ Không cho update terminal states
$terminalStates = [5, 6, 7]; // DELIVERED, FAILED, CANCELLED
if (in_array($currentStatus, $terminalStates)) {
    Response::error("Đơn hàng đã kết thúc, không thể thay đổi trạng thái");
}
```

---

## 📊 Summary Table

### **Role Permissions Summary**

| Feature | Admin | Agent | Shipper | Customer |
|---------|-------|-------|---------|----------|
| **Create Order** | ✅ All | ✅ Self | ❌ | ✅ Self |
| **View Orders** | ✅ All | ✅ Own | ✅ Own | ✅ Own |
| **Edit Orders** | ✅ All | ✅ Own | ❌ | ❌ |
| **Delete Orders** | ✅ | ❌ | ❌ | ❌ |
| **Assign Agent** | ✅ | ❌ | ❌ | ❌ |
| **Assign Shipper** | ✅ All | ✅ Own | ❌ | ❌ |
| **Update Status** | ✅ Any | ✅ Own* | ✅ Own** | ❌ |
| **Pickup** | ❌ | ❌ | ✅ Own | ❌ |
| **Delivery** | ❌ | ❌ | ✅ Own | ❌ |
| **View Reports** | ✅ | ❌ | ❌ | ❌ |
| **Manage Users** | ✅ | ❌ | ❌ | ❌ |

\* Agent: Không được update terminal states  
\*\* Shipper: Chỉ được update status 3→4 và 4→5

---

## 🔍 Debugging RBAC Issues

### **Common Issues**

1. **403 Forbidden**
   - Check `require_role()` có đúng role không
   - Check ownership (order có thuộc user không)

2. **Status không đổi được**
   - Check status hiện tại có hợp lệ không
   - Check status có phải terminal state không
   - Check ownership

3. **Không thấy đơn hàng**
   - Check filter by ownership (customer_id, agent_id, shipper_id)
   - Admin thì không cần filter

---

**Chúc các em code vui vẻ và đúng chuẩn RBAC! 🚀**

