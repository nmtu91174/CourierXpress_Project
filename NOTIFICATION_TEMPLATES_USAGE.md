# 📋 Notification Templates - Use Cases & Test Cases

## 🎯 TỔNG QUAN

`notification_templates` là hệ thống **template-driven notifications** cho phép:
- **Chuẩn hóa nội dung** notification (không hardcode)
- **Đồng bộ seed & runtime** (dùng cùng templates)
- **Admin quản lý nội dung** (không cần dev)

---

## 📊 CÁC TEMPLATES HIỆN CÓ

### 1. **OPERATIONAL NOTIFICATIONS** (Event-driven, tự động)

| Template Name | Type | Khi nào dùng | Người nhận |
|--------------|------|--------------|------------|
| `order_created` | order | Order mới được tạo (BOOKED) | Admin |
| `order_approved` | order | Order được approve (APPROVED) | Agent |
| `order_assigned` | order | Order được assign cho shipper (ASSIGNED) | Shipper |
| `order_delivered` | order | Order giao thành công (DELIVERED) | Customer |
| `order_failed` | warning | Order giao thất bại (FAILED) | Admin |
| `order_failed_agent` | warning | Order giao thất bại (FAILED) | Agent |

### 2. **MANUAL NOTIFICATIONS** (Admin-triggered)

| Template Name | Type | Khi nào dùng | Người nhận |
|--------------|------|--------------|------------|
| `admin_announcement` | system | Admin gửi thông báo | Tùy chọn (all/role/single) |
| `promo_discount` | system | Admin gửi khuyến mãi | Tùy chọn (all/role/single) |

---

## 🔄 USE CASES

### **USE CASE 1: Order Lifecycle Notifications (Tự động)**

**Mô tả:** Khi order thay đổi status, hệ thống tự động gửi notification dựa trên templates.

**Flow:**
1. Order được tạo → `order_created` → Admin nhận notification
2. Order được approve → `order_approved` → Agent nhận notification
3. Order được assign → `order_assigned` → Shipper nhận notification
4. Order delivered → `order_delivered` → Customer nhận notification
5. Order failed → `order_failed` + `order_failed_agent` → Admin + Agent nhận notification

**Code sử dụng:**
```php
// Trong OrderService hoặc API endpoints
$notificationService = new NotificationService($conn);
$notificationService->emitFromTemplate('order_created', $orderId, $actorId, $actorRole);
```

**Test Case:**
- ✅ Tạo order mới → Check notification của Admin
- ✅ Approve order → Check notification của Agent
- ✅ Assign shipper → Check notification của Shipper
- ✅ Deliver order → Check notification của Customer
- ✅ Fail delivery → Check notification của Admin + Agent

---

### **USE CASE 2: Admin Gửi Notification Thủ Công**

**Mô tả:** Admin có thể gửi notification cho users dựa trên templates.

**Flow:**
1. Admin vào **Notification Templates** page
2. Click **"Send Notification"** (hoặc dùng API)
3. Chọn template (`admin_announcement` hoặc `promo_discount`)
4. Chọn target: Single user / All customers / All agents / All shippers
5. Nhập `extra_message` (sẽ thay thế `{extra_message}` placeholder)
6. Gửi → Tất cả target users nhận notification

**API Endpoint:**
```
POST /api/admin/send_notification.php
{
  "template_name": "promo_discount",
  "target_type": "role",
  "target_role": "customer",
  "extra_message": "Special offer: 20% off this month!"
}
```

**Test Case:**
- ✅ Gửi `admin_announcement` cho tất cả customers
- ✅ Gửi `promo_discount` cho single user
- ✅ Gửi `admin_announcement` cho tất cả agents
- ✅ Verify `{extra_message}` được replace đúng

---

### **USE CASE 3: Admin Quản Lý Templates**

**Mô tả:** Admin có thể CRUD notification templates.

**Flow:**
1. Admin vào **Notification Templates** page (`/admin/notification-templates`)
2. Xem danh sách templates
3. **Create:** Tạo template mới
4. **Update:** Sửa template (title, message)
5. **Delete:** Xóa template (nếu không còn dùng)

**Test Case:**
- ✅ Create template mới → Verify trong DB
- ✅ Update template → Verify notification mới dùng template mới
- ✅ Delete template → Verify không còn dùng được

---

### **USE CASE 4: Seed Data Sử Dụng Templates**

**Mô tả:** Seed data dùng cùng templates với runtime.

**Flow:**
1. Chạy `CALL seed_orders_past(30, 365)`
2. Mỗi order seed sẽ tạo notifications dựa trên templates
3. Notifications seed giống hệt notifications runtime

**Test Case:**
- ✅ Seed orders → Check notifications trong DB
- ✅ Verify notifications dùng đúng templates
- ✅ Verify `{order_code}` được replace đúng

---

## 🧪 TEST CASES CHI TIẾT

### **TEST 1: Order Created Notification**

**Steps:**
1. Tạo order mới (qua UI hoặc API)
2. Check `notifications` table:
   ```sql
   SELECT * FROM notifications 
   WHERE related_order_id = [order_id] 
   AND type = 'order'
   ORDER BY created_at DESC;
   ```
3. Verify:
   - ✅ Có notification cho Admin
   - ✅ Title = "New order created"
   - ✅ Message chứa `{order_code}` đã được replace
   - ✅ Template name = `order_created`

**Expected Result:**
```json
{
  "user_id": 1,  // Admin
  "title": "New order created",
  "message": "Order ORD0101 has been created and requires review.",
  "type": "order",
  "related_order_id": [order_id]
}
```

---

### **TEST 2: Admin Send Manual Notification**

**Steps:**
1. Login as Admin
2. Vào `/admin/notification-templates`
3. Click "Send Notification" button (nếu có) hoặc dùng API:
   ```bash
   curl -X POST http://localhost:8888/api/admin/send_notification.php \
     -H "Content-Type: application/json" \
     -b "PHPSESSID=..." \
     -d '{
       "template_name": "promo_discount",
       "target_type": "role",
       "target_role": "customer",
       "extra_message": "Special offer: 20% off this month!"
     }'
   ```
4. Check `notifications` table cho tất cả customers
5. Verify:
   - ✅ Tất cả customers nhận notification
   - ✅ Title = "Special Promotion"
   - ✅ Message = "Great news! Special offer: 20% off this month!"
   - ✅ `{extra_message}` được replace đúng

**Expected Result:**
```json
{
  "user_id": [customer_id],
  "title": "Special Promotion",
  "message": "Great news! Special offer: 20% off this month!",
  "type": "system",
  "related_order_id": null
}
```

---

### **TEST 3: Update Template & Verify Runtime**

**Steps:**
1. Vào `/admin/notification-templates`
2. Edit template `order_delivered`:
   - Title: "Order delivered" → "🎉 Your order has been delivered!"
   - Message: "Your order {order_code} has been delivered successfully." → "🎉 Order {order_code} đã được giao thành công!"
3. Save
4. Tạo order mới và deliver nó
5. Check notification của customer
6. Verify:
   - ✅ Notification dùng template mới
   - ✅ Title = "🎉 Your order has been delivered!"
   - ✅ Message = "🎉 Order ORD0101 đã được giao thành công!"

---

### **TEST 4: Seed Data Consistency**

**Steps:**
1. Chạy seed:
   ```sql
   CALL seed_orders_past(5, 30);
   ```
2. Check notifications:
   ```sql
   SELECT n.*, nt.name as template_name
   FROM notifications n
   LEFT JOIN notification_templates nt ON 
     (n.title LIKE CONCAT('%', REPLACE(nt.title_template, '{order_code}', ''), '%'))
   WHERE n.related_order_id IN (
     SELECT id FROM orders ORDER BY id DESC LIMIT 5
   )
   ORDER BY n.created_at DESC;
   ```
3. Verify:
   - ✅ Mỗi order có notifications đúng templates
   - ✅ `{order_code}` được replace đúng
   - ✅ Seed notifications giống runtime notifications

---

### **TEST 5: Placeholder Replacement**

**Steps:**
1. Tạo template mới với nhiều placeholders:
   ```sql
   INSERT INTO notification_templates (name, type, title_template, message_template)
   VALUES (
     'test_template',
     'system',
     'Hello {customer_name}',
     'Your order {order_code} is ready. Agent: {agent_name}'
   );
   ```
2. Gửi notification với placeholders:
   ```php
   $notificationService->sendFromTemplate(
     'test_template',
     $userId,
     $orderId,
     [
       'customer_name' => 'John Doe',
       'order_code' => 'ORD0101',
       'agent_name' => 'Agent Ba Đình'
     ]
   );
   ```
3. Verify:
   - ✅ Tất cả placeholders được replace đúng
   - ✅ Title = "Hello John Doe"
   - ✅ Message = "Your order ORD0101 is ready. Agent: Agent Ba Đình"

---

## 🎮 QUICK TEST GUIDE

### **Test 1: Xem Templates Hiện Có**
```
GET /api/admin/get_notification_templates.php
```

### **Test 2: Tạo Template Mới**
```
POST /api/admin/create_notification_template.php
{
  "name": "test_template",
  "type": "system",
  "title_template": "Test Title",
  "message_template": "Test message with {placeholder}"
}
```

### **Test 3: Update Template**
```
POST /api/admin/update_notification_template.php
{
  "id": 1,
  "name": "order_created",
  "type": "order",
  "title_template": "New order created",
  "message_template": "Order {order_code} has been created."
}
```

### **Test 4: Gửi Manual Notification**
```
POST /api/admin/send_notification.php
{
  "template_name": "admin_announcement",
  "target_type": "role",
  "target_role": "customer",
  "extra_message": "System maintenance scheduled for this weekend."
}
```

### **Test 5: Verify Notifications**
```sql
-- Xem notifications gần nhất
SELECT n.*, u.name as user_name, u.role
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 10;

-- Xem notifications theo template
SELECT nt.name as template_name, COUNT(n.id) as count
FROM notification_templates nt
LEFT JOIN notifications n ON n.title LIKE CONCAT('%', REPLACE(nt.title_template, '{order_code}', ''), '%')
GROUP BY nt.name;
```

---

## ✅ CHECKLIST TEST

- [ ] **Operational Notifications:**
  - [ ] Order created → Admin nhận notification
  - [ ] Order approved → Agent nhận notification
  - [ ] Order assigned → Shipper nhận notification
  - [ ] Order delivered → Customer nhận notification
  - [ ] Order failed → Admin + Agent nhận notification

- [ ] **Manual Notifications:**
  - [ ] Gửi `admin_announcement` cho all customers
  - [ ] Gửi `promo_discount` cho single user
  - [ ] Gửi `admin_announcement` cho all agents
  - [ ] Verify `{extra_message}` được replace

- [ ] **Template Management:**
  - [ ] Create template mới
  - [ ] Update template
  - [ ] Delete template
  - [ ] Verify runtime dùng template mới

- [ ] **Seed Data:**
  - [ ] Seed orders → Check notifications
  - [ ] Verify seed dùng đúng templates
  - [ ] Verify placeholders được replace

---

## 📝 NOTES

- **Templates KHÔNG tự gửi notification** - chỉ là "khuôn nội dung"
- **NotificationService** là nơi thực sự gửi notification
- **Placeholders** được replace tại runtime: `{order_code}`, `{extra_message}`, `{customer_name}`, etc.
- **Seed & Runtime** dùng cùng templates → 100% consistency

