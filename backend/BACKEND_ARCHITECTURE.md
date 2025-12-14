# 📚 Tài Liệu Kiến Trúc Backend - CourierXpress

> **Tài liệu hướng dẫn cho team phát triển**  
> Cập nhật: 2025-12-14

---

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc](#tổng-quan-kiến-trúc)
2. [Core Layer](#core-layer)
3. [Middleware Layer](#middleware-layer)
4. [Service Layer](#service-layer)
5. [API Layer](#api-layer)
6. [Workflow Hướng Dẫn](#workflow-hướng-dẫn)
   - [Cho Em Việt (Shipper Module)](#cho-em-việt-shipper-module)
   - [Cho Em Giáp (User Profile Module)](#cho-em-giáp-user-profile-module)

---

## 🏗️ Tổng Quan Kiến Trúc

```
backend/
├── core/           # Core utilities (Response, CORS, BaseService, Logger, Session)
├── middleware/     # Authentication & Authorization (require_login, require_role, rate_limit)
├── services/       # Business logic layer (OrderService, UserService, FeeService, etc.)
├── api/            # API endpoints (RESTful routes)
│   ├── admin/      # Admin endpoints
│   ├── auth/       # Authentication endpoints
│   ├── shipper/    # Shipper endpoints
│   ├── users/      # User management endpoints
│   └── tracking/   # Tracking endpoints
└── logs/           # Log files (app.log, audit.log)
```

### **Quy Tắc Vàng** ⭐

1. **API Layer** → Gọi **Service Layer** → Gọi **Core Layer**
2. **Middleware** phải được gọi TRƯỚC business logic
3. **CORS** phải được set TRƯỚC tất cả (kể cả OPTIONS)
4. **Response** class dùng cho TẤT CẢ API responses
5. **BaseService** là base class cho TẤT CẢ services

---

## 🔧 Core Layer

### **1. Response.php** (`backend/core/Response.php`)

**Chức năng**: Chuẩn hóa JSON response cho toàn bộ API

**Các method**:
- `Response::success($message, $data, $code)` - Response thành công
- `Response::error($message, $code)` - Response lỗi chung
- `Response::validation($errors)` - Response lỗi validation (422)
- `Response::unauthorized($message)` - Response 401
- `Response::forbidden($message)` - Response 403
- `Response::serverError($message)` - Response 500
- `Response::json($data, $code)` - Response tùy chỉnh

**Cách dùng**:
```php
require_once __DIR__ . "/../../core/Response.php";

// Success
Response::success("Lấy dữ liệu thành công", $data);

// Error
Response::error("Thiếu tham số", 400);

// Validation
Response::validation([
    "email" => "Email không hợp lệ",
    "password" => "Mật khẩu quá ngắn"
]);
```

---

### **2. Cors.php** (`backend/core/Cors.php`)

**Chức năng**: Xử lý CORS headers cho cross-origin requests

**Các method**:
- `Cors::setHeaders()` - Set CORS headers
- `Cors::handlePreflight()` - Handle OPTIONS request

**Cách dùng** (PHẢI đặt ở đầu file API):
```php
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();  // Xử lý OPTIONS
Cors::setHeaders();       // Set headers

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}
```

**Lưu ý**: 
- Khi dùng `credentials: true`, KHÔNG được dùng `*` cho origin
- Phải set origin cụ thể trong whitelist

---

### **3. BaseService.php** (`backend/core/BaseService.php`)

**Chức năng**: Base class cho tất cả Service classes

**Tính năng**:
- Quản lý DB connection (`$this->conn`)
- Transaction wrapper (`transaction()`)
- Prepare statement helper (`prepare()`)
- System log (`logApp()`)
- Audit log (`logAudit()`)

**Cách dùng**:
```php
require_once __DIR__ . "/../core/BaseService.php";

class MyService extends BaseService
{
    public function __construct($conn)
    {
        parent::__construct($conn);
    }
    
    public function doSomething()
    {
        return $this->transaction(function () {
            // Business logic
            $stmt = $this->prepare("SELECT * FROM orders WHERE id = ?");
            $stmt->bind_param("i", $orderId);
            $stmt->execute();
            
            // Log
            $this->logApp("INFO", "Order processed");
            $this->logAudit($userId, $role, "ACTION", $orderId, "Note");
            
            return $result;
        });
    }
}
```

**Lưu ý**:
- `transaction()` tự động rollback nếu có exception
- `logApp()` ghi vào `logs/app.log`
- `logAudit()` ghi vào `logs/audit.log`

---

### **4. Logger.php** (`backend/core/Logger.php`)

**Chức năng**: Helper class để ghi log đơn giản

**Các method**:
- `Logger::app($message)` - Ghi vào app.log
- `Logger::audit($message)` - Ghi vào audit.log

**Cách dùng**:
```php
require_once __DIR__ . "/../core/Logger.php";

Logger::app("Error occurred: " . $errorMessage);
Logger::audit("User action: " . $action);
```

---

### **5. SessionHelper.php** (`backend/core/SessionHelper.php`)

**Chức năng**: Helper để start session đúng cách cho CORS

**Cách dùng**:
```php
require_once __DIR__ . "/../core/SessionHelper.php";

SessionHelper::start();  // Tự động config session cookie
```

**Lưu ý**:
- Tự động detect HTTPS/localhost
- Config `SameSite` và `Secure` phù hợp
- Safe: không throw exception nếu lỗi

---

## 🛡️ Middleware Layer

### **1. require_login.php** (`backend/middleware/require_login.php`)

**Chức năng**: Kiểm tra user đã đăng nhập chưa

**Cách hoạt động**:
1. Ưu tiên kiểm tra SESSION (`$_SESSION["user"]`)
2. Fallback kiểm tra Bearer Token (`Authorization: Bearer xxx`)
3. Set `$GLOBALS['auth_user']` nếu thành công
4. Response 401 nếu thất bại

**Cách dùng**:
```php
require_once __DIR__ . "/../../middleware/require_login.php";

require_login();  // Tự động exit nếu chưa login

// Sau khi gọi, có thể dùng:
$userId = $GLOBALS['auth_user']['id'];
$role = $GLOBALS['auth_user']['role'];
```

**Lưu ý**:
- Phải gọi SAU khi set CORS headers
- Phải gọi TRƯỚC business logic
- Tự động exit nếu chưa login (không cần check return value)

---

### **2. require_role.php** (`backend/middleware/require_role.php`)

**Chức năng**: Kiểm tra user có đủ quyền (role) không

**Cách dùng**:
```php
require_once __DIR__ . "/../../middleware/require_role.php";

require_login();  // Phải gọi trước
require_role(["admin"]);  // Chỉ admin
require_role(["admin", "agent"]);  // Admin hoặc agent
```

**Lưu ý**:
- PHẢI gọi `require_login()` trước
- Tự động exit nếu không đủ quyền (403)
- Nhận array roles: `["admin", "agent"]`

---

### **3. rate_limit.php** (`backend/middleware/rate_limit.php`)

**Chức năng**: Giới hạn số request (60 requests / 1 phút / IP)

**Cách dùng**:
```php
require_once __DIR__ . "/../../middleware/rate_limit.php";
// Tự động check và response 429 nếu vượt quá
```

**Lưu ý**:
- Dùng session để track
- Tự động reset sau 60 giây
- Response 429 nếu vượt quá

---

## 💼 Service Layer

### **1. OrderService.php** (`backend/services/OrderService.php`)

**Chức năng**: Business logic cho quản lý đơn hàng

**Các method chính**:
- `create($data, $images)` - Tạo đơn hàng mới
- `updateStatus($orderId, $newStatus, $actorId, $actorRole, $note)` - Cập nhật trạng thái
- `assignAgentByAdmin($orderId, $agentId, $adminId, $note)` - Admin phân công agent
- `assignShipper($orderId, $shipperId, $actorId, $role, $note)` - Phân công shipper

**Status Constants**:
```php
STATUS_BOOKED = 1      // Đã tạo đơn
STATUS_APPROVED = 2    // Đã duyệt
STATUS_ASSIGNED = 3    // Đã phân công shipper
STATUS_PICKED = 4      // Đã lấy hàng (in progress)
STATUS_DELIVERED = 5   // Đã giao hàng
```

**Cách dùng**:
```php
require_once __DIR__ . "/../../services/OrderService.php";

$service = new OrderService($conn);

// Tạo đơn
$result = $service->create([
    "customer_id" => 1,
    "actor_id" => 1,
    "actor_role" => "admin",
    "weight" => 5.5,
    "distance_km" => 10,
    // ... other fields
], $images);

// Cập nhật trạng thái
$service->updateStatus($orderId, 5, $userId, "shipper", "Giao hàng thành công");
```

**Lưu ý**:
- Tự động tính phí qua `FeeService`
- Tự động tạo invoice
- Tự động log history và audit
- Dùng transaction để đảm bảo data integrity

---

### **2. UserService.php** (`backend/services/UserService.php`)

**Chức năng**: Business logic cho quản lý user

**Các method**:
- `login($email, $password)` - Đăng nhập
- `register($data)` - Đăng ký
- `update($userId, $data)` - Cập nhật thông tin user
- `getUsers($role)` - Lấy danh sách users (admin only)
- `disable($userId)` - Vô hiệu hóa user

**Cách dùng**:
```php
require_once __DIR__ . "/../../services/UserService.php";

$service = new UserService($conn);

// Login
$user = $service->login("user@example.com", "password123");

// Register
$newUser = $service->register([
    "name" => "Nguyễn Văn A",
    "email" => "a@example.com",
    "password" => "password123",
    "role" => "customer"
]);

// Update
$service->update($userId, [
    "name" => "Nguyễn Văn B",
    "phone" => "0123456789"
]);
```

---

### **3. FeeService.php** (`backend/services/FeeService.php`)

**Chức năng**: Tính toán phí vận chuyển

**Các method**:
- `calculate($input)` - Tính phí dựa trên distance, weight, volume, COD
- `saveOrderFees($orderId, $fees)` - Lưu phí vào order_fees table

**Công thức**:
```
shipping_fee = (distance * distance_fee) + (weight * weight_fee) + (volume * volume_fee)
total_fee = shipping_fee + cod_amount
```

**Cách dùng**:
```php
require_once __DIR__ . "/../../services/FeeService.php";

$service = new FeeService($conn);

$result = $service->calculate([
    "distance_km" => 10,
    "weight" => 5.5,
    "length" => 30,
    "width" => 20,
    "height" => 15,
    "cod_amount" => 100000,
    "service_type" => 1
]);

// $result = [
//     "fees" => [...],
//     "shipping_fee" => 50000,
//     "cod_amount" => 100000,
//     "total_with_cod" => 150000,
//     "shipper_receive" => 50000
// ]
```

---

### **4. NotificationService.php** (`backend/services/NotificationService.php`)

**Chức năng**: Ghi system logs vào database

**Các method**:
- `log($action, $entity, $entityId, $userId)` - Ghi log chung
- `orderEvent($orderId, $action, $userId)` - Ghi log đơn hàng
- `getRecentLogs($limit)` - Lấy logs gần đây

**Cách dùng**:
```php
require_once __DIR__ . "/../../services/NotificationService.php";

$service = new NotificationService($conn);

// Log chung
$service->log("UPDATE_USER", "users", $userId, $actorId);

// Log đơn hàng
$service->orderEvent($orderId, "CREATE_ORDER", $userId);

// Lấy logs
$logs = $service->getRecentLogs(50);
```

---

### **5. TrackingService.php** (`backend/services/TrackingService.php`)

**Chức năng**: Lấy lịch sử tracking của đơn hàng

**Các method**:
- `getOrderTracking($orderId)` - Lấy timeline tracking

**Cách dùng**:
```php
require_once __DIR__ . "/../../services/TrackingService.php";

$service = new TrackingService($conn);

$timeline = $service->getOrderTracking($orderId);

// $timeline = [
//     [
//         "status_id" => 1,
//         "status_code" => "BOOKED",
//         "status_label" => "Đã tạo đơn",
//         "actor" => ["id" => 1, "name" => "Admin", "role" => "system"],
//         "note" => "Create order",
//         "created_at" => "2025-12-14 10:00:00"
//     ],
//     ...
// ]
```

---

## 🌐 API Layer

### **Cấu Trúc Thư Mục**

```
api/
├── admin/          # Admin endpoints (CRUD orders, agents, reports)
├── auth/           # Authentication (login, register, reset password)
├── shipper/        # Shipper endpoints (pickup, delivery, list orders)
├── users/          # User management (get, update, disable)
└── tracking/       # Tracking endpoints (get tracking history)
```

### **Template Chuẩn Cho API File**

```php
<?php
// backend/api/[module]/[action].php

// =====================================================
// 1. CORS (PHẢI ĐẶT ĐẦU TIÊN)
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
require_role(["admin"]);  // Hoặc role khác

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
    Response::error("Thiếu tham số");
}

// =====================================================
// 6. BUSINESS LOGIC (Service Layer)
// =====================================================
require_once __DIR__ . "/../../services/OrderService.php";

try {
    $service = new OrderService($conn);
    $result = $service->doSomething($param);
    
    Response::success("Thành công", $result);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

$conn->close();
```

---

### **API Endpoints Chi Tiết**

#### **A. Admin Endpoints** (`api/admin/`)

| File | Method | Chức Năng | Role Required |
|------|--------|-----------|--------------|
| `create_order.php` | POST | Tạo đơn hàng mới | admin |
| `get_orders.php` | GET | Lấy danh sách đơn hàng (có filter) | admin |
| `update_order.php` | PUT | Cập nhật thông tin đơn hàng | admin |
| `delete_order.php` | DELETE | Xóa đơn hàng | admin |
| `assign_agent.php` | POST | Phân công agent cho đơn | admin |
| `assign_shipper.php` | POST | Phân công shipper cho đơn | admin |
| `create_agent.php` | POST | Tạo agent mới | admin |
| `get_agents_with_kpi.php` | GET | Lấy danh sách agents kèm KPI | admin |
| `toggle_agent_status.php` | POST | Bật/tắt agent | admin |
| `get_reports_data.php` | GET | Lấy dữ liệu báo cáo | admin |
| `view_logs.php` | GET | Xem logs hệ thống | admin |

#### **B. Auth Endpoints** (`api/auth/`)

| File | Method | Chức Năng | Role Required |
|------|--------|-----------|--------------|
| `login.php` | POST | Đăng nhập | public |
| `register.php` | POST | Đăng ký tài khoản | public |
| `logout.php` | POST | Đăng xuất | authenticated |
| `reset_password.php` | POST | Reset mật khẩu | public |

#### **C. Shipper Endpoints** (`api/shipper/`)

| File | Method | Chức Năng | Role Required |
|------|--------|-----------|--------------|
| `list_to_pickup.php` | GET | Danh sách đơn cần lấy hàng (status=3) | shipper |
| `list_in_progress.php` | GET | Danh sách đơn đang giao (status=4) | shipper |
| `order_detail.php` | GET | Chi tiết đơn hàng | shipper |
| `confirm_pickup.php` | POST | Xác nhận đã lấy hàng (status 3→4) | shipper |
| `confirm_delivery.php` | POST | Xác nhận đã giao hàng (status 4→5) | shipper |

#### **D. User Endpoints** (`api/users/`)

| File | Method | Chức Năng | Role Required |
|------|--------|-----------|--------------|
| `get_user.php` | GET | Lấy thông tin user | authenticated |
| `update_user.php` | PUT | Cập nhật thông tin user | authenticated (self) hoặc admin |
| `get_agents.php` | GET | Lấy danh sách agents | admin, agent |
| `get_shippers.php` | GET | Lấy danh sách shippers | admin, agent |
| `disable_user.php` | POST | Vô hiệu hóa user | admin |
| `reset_user_password.php` | POST | Reset mật khẩu user | admin |

#### **E. Tracking Endpoints** (`api/tracking/`)

| File | Method | Chức Năng | Role Required |
|------|--------|-----------|--------------|
| `get_tracking_history.php` | GET | Lấy lịch sử tracking đơn hàng | authenticated |

---

## 🚀 Workflow Hướng Dẫn

### **Cho Em Việt (Shipper Module)**

#### **📋 Nhiệm Vụ**: Phát triển tính năng cho Shipper

#### **🎯 Các File Cần Dùng**

##### **1. API Endpoints (Đã có sẵn - có thể mở rộng)**

- ✅ `api/shipper/list_to_pickup.php` - Danh sách đơn cần lấy hàng
- ✅ `api/shipper/list_in_progress.php` - Danh sách đơn đang giao
- ✅ `api/shipper/order_detail.php` - Chi tiết đơn hàng
- ✅ `api/shipper/confirm_pickup.php` - Xác nhận đã lấy hàng
- ✅ `api/shipper/confirm_delivery.php` - Xác nhận đã giao hàng

##### **2. Core Files (Bắt buộc import)**

```php
// Mọi file API đều cần:
require_once __DIR__ . "/../../core/Cors.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";
```

##### **3. Service Files (Dùng khi cần business logic)**

```php
// Khi cần update status hoặc xử lý phức tạp:
require_once __DIR__ . "/../../services/OrderService.php";

$service = new OrderService($conn);
$service->updateStatus($orderId, $newStatus, $shipperId, "shipper", $note);
```

##### **4. Workflow Shipper**

```
1. Shipper Login
   → api/auth/login.php
   → Set session: $_SESSION["user"] = {id, role: "shipper", ...}

2. Xem danh sách đơn cần lấy hàng
   → api/shipper/list_to_pickup.php
   → GET: Trả về orders với status = 3 (ASSIGNED)
   → Frontend hiển thị danh sách

3. Xem chi tiết đơn hàng
   → api/shipper/order_detail.php?order_id=123
   → GET: Trả về full order info + images + history

4. Xác nhận đã lấy hàng
   → api/shipper/confirm_pickup.php
   → POST: {order_id: 123}
   → Backend:
      a. Check order thuộc shipper này
      b. Check status = 3
      c. Gọi OrderService::updateStatus(orderId, 4, shipperId, "shipper", "Đã lấy hàng")
      d. Tự động log vào order_history và audit.log
   → Response: {order_id, order_code, status: 4}

5. Xem danh sách đơn đang giao
   → api/shipper/list_in_progress.php
   → GET: Trả về orders với status = 4 (IN_PROGRESS)

6. Xác nhận đã giao hàng
   → api/shipper/confirm_delivery.php
   → POST: {order_id: 123}
   → Backend:
      a. Check order thuộc shipper này
      b. Check status = 4
      c. Gọi OrderService::updateStatus(orderId, 5, shipperId, "shipper", "Giao hàng thành công")
   → Response: {order_id, order_code, status: 5}
```

##### **5. Ví Dụ Code Mới (Nếu cần thêm tính năng)**

**Ví dụ: Thêm API để shipper xem thống kê của mình**

```php
<?php
// backend/api/shipper/get_stats.php

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

require_login();
require_role(["shipper"]);

$shipperId = $GLOBALS['auth_user']['id'];

// Query stats
$sql = "
    SELECT 
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 6 THEN 1 ELSE 0 END) AS failed
    FROM orders
    WHERE shipper_id = ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $shipperId);
$stmt->execute();
$result = $stmt->get_result();
$stats = $result->fetch_assoc();

Response::success("Stats loaded", $stats);
```

---

### **Cho Em Giáp (User Profile Module)**

#### **📋 Nhiệm Vụ**: Phát triển tính năng User Profile

#### **🎯 Các File Cần Dùng**

##### **1. API Endpoints (Đã có sẵn - có thể mở rộng)**

- ✅ `api/users/get_user.php` - Lấy thông tin user
- ✅ `api/users/update_user.php` - Cập nhật thông tin user
- ✅ `api/auth/login.php` - Đăng nhập
- ✅ `api/auth/register.php` - Đăng ký
- ✅ `api/auth/reset_password.php` - Reset mật khẩu

##### **2. Core Files (Bắt buộc import)**

```php
// Mọi file API đều cần:
require_once __DIR__ . "/../../core/Cors.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../core/SessionHelper.php";  // Cho login/register
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";
```

##### **3. Service Files (Dùng khi cần business logic)**

```php
// Khi cần xử lý user logic:
require_once __DIR__ . "/../../services/UserService.php";

$service = new UserService($conn);

// Login
$user = $service->login($email, $password);

// Register
$newUser = $service->register($data);

// Update
$service->update($userId, $data);
```

##### **4. Workflow User Profile**

```
1. User Register
   → api/auth/register.php
   → POST: {name, email, password, confirmPassword, role?}
   → Backend:
      a. Validate input
      b. Check email exists
      c. Hash password
      d. Insert vào users table
      e. Log vào NotificationService (optional)
   → Response: {id, name, email, role, status}

2. User Login
   → api/auth/login.php
   → POST: {email, password}
   → Backend:
      a. Query user by email
      b. Verify password (password_verify)
      c. Check status = "active"
      d. Update last_login
      e. Set session: $_SESSION["user"] = {...}
   → Response: {id, name, email, role, phone, status}

3. Get User Profile
   → api/users/get_user.php?user_id=123
   → GET: 
      a. Check permission (admin hoặc chính user đó)
      b. Query user info
   → Response: {id, name, email, phone, role, status, created_at}

4. Update User Profile
   → api/users/update_user.php
   → PUT: {user_id, name?, phone?, email?, role?, status?}
   → Backend:
      a. Check permission (admin hoặc chính user đó)
      b. Build dynamic UPDATE query
      c. Execute update
      d. Log vào NotificationService và audit.log
   → Response: success message

5. Change Password (Có thể tạo mới)
   → api/users/change_password.php (CẦN TẠO MỚI)
   → POST: {user_id, old_password, new_password}
   → Backend:
      a. Verify old_password
      b. Hash new_password
      c. Update password
      d. Log audit
```

##### **5. Ví Dụ Code Mới (Tạo API Change Password)**

```php
<?php
// backend/api/users/change_password.php

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../services/NotificationService.php";

require_login();

$currentUserId = $GLOBALS['auth_user']['id'];
$currentRole = $GLOBALS['auth_user']['role'];

// Read input
$data = json_decode(file_get_contents("php://input"), true);
$userId = (int)($data["user_id"] ?? 0);
$oldPassword = $data["old_password"] ?? "";
$newPassword = $data["new_password"] ?? "";

// Validation
if ($userId <= 0) {
    Response::error("Thiếu user_id");
}

if (empty($oldPassword) || empty($newPassword)) {
    Response::error("Thiếu mật khẩu");
}

if (strlen($newPassword) < 6) {
    Response::error("Mật khẩu mới phải từ 6 ký tự trở lên");
}

// Permission check
if ($currentRole !== "admin" && $userId !== $currentUserId) {
    Response::forbidden("Không có quyền đổi mật khẩu user này");
}

// Verify old password
$check = $conn->prepare("SELECT password FROM users WHERE id = ?");
$check->bind_param("i", $userId);
$check->execute();
$result = $check->get_result();
$user = $result->fetch_assoc();

if (!$user || !password_verify($oldPassword, $user["password"])) {
    Response::error("Mật khẩu cũ không đúng");
}

// Update password
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
$update = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
$update->bind_param("si", $hashedPassword, $userId);
$update->execute();

// Log
$notify = new NotificationService($conn);
$notify->log("CHANGE_PASSWORD", "users", $userId, $currentUserId);

// Audit log
$auditLine = sprintf(
    "[%s] user=%d role=%s action=CHANGE_PASSWORD order=N/A note=Changed password for user %d\n",
    date("Y-m-d H:i:s"),
    $currentUserId,
    $currentRole,
    $userId
);
file_put_contents(__DIR__ . "/../../logs/audit.log", $auditLine, FILE_APPEND | LOCK_EX);

Response::success("Đổi mật khẩu thành công");
```

##### **6. Ví Dụ Code Mới (Tạo API Upload Avatar)**

```php
<?php
// backend/api/users/upload_avatar.php

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";

require_login();

$currentUserId = $GLOBALS['auth_user']['id'];
$currentRole = $GLOBALS['auth_user']['role'];

// Read user_id (admin có thể upload cho user khác)
$userId = isset($_POST["user_id"]) ? (int)$_POST["user_id"] : $currentUserId;

// Permission check
if ($currentRole !== "admin" && $userId !== $currentUserId) {
    Response::forbidden("Không có quyền upload avatar cho user này");
}

// Validate file
if (!isset($_FILES["avatar"]) || $_FILES["avatar"]["error"] !== UPLOAD_ERR_OK) {
    Response::error("Không có file hoặc lỗi upload");
}

$file = $_FILES["avatar"];

// Validate image type
$allowedTypes = ["image/jpeg", "image/png", "image/gif"];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file["tmp_name"]);

if (!in_array($mimeType, $allowedTypes)) {
    Response::error("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)");
}

// Validate file size (max 2MB)
if ($file["size"] > 2 * 1024 * 1024) {
    Response::error("File quá lớn (tối đa 2MB)");
}

// Generate unique filename
$extension = pathinfo($file["name"], PATHINFO_EXTENSION);
$filename = "avatar_" . $userId . "_" . time() . "." . $extension;
$uploadDir = __DIR__ . "/../../uploads/avatars/";

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$filepath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($file["tmp_name"], $filepath)) {
    Response::serverError("Không thể lưu file");
}

// Update database
$avatarUrl = "/uploads/avatars/" . $filename;
$update = $conn->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
$update->bind_param("si", $avatarUrl, $userId);
$update->execute();

Response::success("Upload avatar thành công", [
    "avatar_url" => $avatarUrl
]);
```

---

## 📝 Checklist Khi Tạo API Mới

- [ ] ✅ Import CORS và handle OPTIONS
- [ ] ✅ Import Core files (Response, db.php)
- [ ] ✅ Import Middleware (require_login, require_role)
- [ ] ✅ Check HTTP method
- [ ] ✅ Validate input
- [ ] ✅ Check permissions
- [ ] ✅ Gọi Service layer (nếu có business logic phức tạp)
- [ ] ✅ Log audit (nếu cần)
- [ ] ✅ Response đúng format
- [ ] ✅ Close connection

---

## 🔍 Debug Tips

### **1. Kiểm Tra Logs**

```bash
# Xem app.log (lỗi hệ thống)
tail -f backend/logs/app.log

# Xem audit.log (business logs)
tail -f backend/logs/audit.log
```

### **2. Test API với cURL**

```bash
# Login
curl -X POST http://localhost:8888/api/auth/login.php \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"123456"}' \
  -c cookies.txt

# Get orders (với session cookie)
curl -X GET http://localhost:8888/api/admin/get_orders.php \
  -b cookies.txt
```

### **3. Common Errors**

| Lỗi | Nguyên nhân | Cách fix |
|-----|------------|----------|
| CORS error | Chưa set CORS headers | Thêm `Cors::setHeaders()` |
| 401 Unauthorized | Chưa login | Gọi `require_login()` |
| 403 Forbidden | Không đủ quyền | Check `require_role()` |
| 500 Server Error | SQL error | Check `$conn->error` |
| Session không work | Chưa start session | Gọi `SessionHelper::start()` |

---

## 📚 Tài Liệu Tham Khảo

- **Database Schema**: Xem file `backend/db.php` hoặc SQL migration files
- **Status Codes**: Xem `OrderService::STATUS_*` constants
- **Response Format**: Xem `Response.php` class
- **Log Format**: Xem `BaseService::logAudit()` và `BaseService::logApp()`

---

## 💡 Best Practices

1. **Luôn dùng Prepared Statements** - Tránh SQL injection
2. **Luôn validate input** - Check empty, type, format
3. **Luôn check permissions** - Admin vs User vs Self
4. **Luôn log important actions** - Audit trail
5. **Luôn dùng transaction** - Cho operations phức tạp
6. **Luôn close connection** - `$conn->close()` ở cuối
7. **Luôn handle errors** - Try-catch và Response::error()

---

**Chúc các em code vui vẻ! 🚀**

