# 📋 HƯỚNG DẪN XEM ERROR LOGS

## 📁 VỊ TRÍ LOG FILES

### 1. **Application Logs** (app.log)
- **Đường dẫn**: `backend/logs/app.log`
- **Nội dung**: System logs từ BaseService, OrderService, etc.
- **Format**: `[YYYY-MM-DD HH:MM:SS] [LEVEL] message`

### 2. **Audit Logs** (audit.log)
- **Đường dẫn**: `backend/logs/audit.log`
- **Nội dung**: Business audit logs (user actions, order changes)
- **Format**: `[YYYY-MM-DD HH:MM:SS] user=ID role=ROLE action=ACTION order=ID note=NOTE`

### 3. **PHP Error Log** (php_error.log)
- **Đường dẫn**: Tùy cấu hình PHP (thường là `C:\xampp\php\logs\php_error_log` hoặc `C:\wamp\logs\php_error.log`)
- **Nội dung**: PHP errors, warnings, notices từ `error_log()`
- **Cách xem**: 
  ```bash
  # Windows PowerShell
  Get-Content C:\xampp\php\logs\php_error_log -Tail 50
  
  # Hoặc mở file trực tiếp
  notepad C:\xampp\php\logs\php_error_log
  ```

---

## 🔍 CÁCH XEM LOGS

### **Cách 1: Xem trực tiếp file (Nhanh nhất)**

#### Windows:
```powershell
# Xem app.log (50 dòng cuối)
Get-Content backend\logs\app.log -Tail 50

# Xem audit.log (50 dòng cuối)
Get-Content backend\logs\audit.log -Tail 50

# Xem real-time (theo dõi khi có log mới)
Get-Content backend\logs\app.log -Wait -Tail 20
```

#### Hoặc mở bằng Notepad:
```
backend\logs\app.log
backend\logs\audit.log
```

---

### **Cách 2: Dùng API endpoint (Tiện nhất)**

Tạo API endpoint để xem logs qua browser:

**URL**: `http://localhost:8888/api/admin/view_logs.php?type=app&lines=100`

**Parameters**:
- `type`: `app` | `audit` | `error` (mặc định: `app`)
- `lines`: Số dòng cuối cùng (1-1000, mặc định: 100)

**Ví dụ**:
```
# Xem 50 dòng cuối của app.log
http://localhost:8888/api/admin/view_logs.php?type=app&lines=50

# Xem 100 dòng cuối của audit.log
http://localhost:8888/api/admin/view_logs.php?type=audit&lines=100

# Xem PHP error log
http://localhost:8888/api/admin/view_logs.php?type=error&lines=50
```

**Lưu ý**: Cần đăng nhập với role `admin` để xem logs.

---

### **Cách 3: Xem PHP Error Log (Quan trọng nhất)**

PHP `error_log()` ghi vào PHP error log, không phải file trong project.

#### Tìm vị trí PHP error log:

**Cách 1: Tạo file test**
```php
<?php
// backend/test_error_log.php
error_log("TEST ERROR LOG");
phpinfo();
```
Mở `http://localhost:8888/test_error_log.php` → tìm `error_log` trong phpinfo.

**Cách 2: Dùng command line**
```bash
php -i | findstr error_log
```

**Cách 3: Kiểm tra php.ini**
- Mở `C:\xampp\php\php.ini` (hoặc `C:\wamp\bin\php\php8.x.x\php.ini`)
- Tìm `error_log =`
- Thường là: `C:\xampp\php\logs\php_error_log` hoặc `C:\wamp\logs\php_error.log`

---

## 🐛 DEBUG 500 ERRORS

Khi gặp lỗi 500, kiểm tra theo thứ tự:

### **Bước 1: Bật error display (tạm thời)**
Thêm vào đầu file PHP:
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
```

### **Bước 2: Kiểm tra PHP Error Log**
```powershell
# Xem 50 dòng cuối
Get-Content C:\xampp\php\logs\php_error_log -Tail 50
```

### **Bước 3: Kiểm tra Application Logs**
```powershell
# Xem app.log
Get-Content backend\logs\app.log -Tail 50
```

### **Bước 4: Kiểm tra Network Tab**
- Mở Browser DevTools (F12)
- Tab Network → Xem response của request bị lỗi
- Copy response body để xem error message

---

## 📝 LOG FORMATS

### **app.log** (System Logs)
```
[2025-12-13 10:30:45] [ERROR] Database prepare failed
[2025-12-13 10:30:46] [INFO] Order created successfully
```

### **audit.log** (Business Logs)
```
[2025-12-13 10:30:45] user=1 role=admin action=CREATE_ORDER order=123 note=Created ORD1234
[2025-12-13 10:30:46] user=2 role=agent action=ASSIGN_SHIPPER order=123 note=Shipper 5
```

### **PHP Error Log**
```
[13-Dec-2025 10:30:45 UTC] PHP Fatal error:  Uncaught Exception: Order not found in C:\...\OrderService.php:257
[13-Dec-2025 10:30:46 UTC] PHP Warning:  mysqli::prepare(): (HY000/1194): Table 'orders' is marked as crashed
```

---

## 🔧 TẠO SCRIPT XEM LOGS NHANH

Tạo file `backend/view_logs.bat` (Windows):
```batch
@echo off
echo ========================================
echo VIEW BACKEND LOGS
echo ========================================
echo.
echo 1. App Log (50 dòng cuối)
echo 2. Audit Log (50 dòng cuối)
echo 3. PHP Error Log (50 dòng cuối)
echo.
set /p choice="Chọn (1-3): "

if "%choice%"=="1" (
    powershell -Command "Get-Content backend\logs\app.log -Tail 50"
) else if "%choice%"=="2" (
    powershell -Command "Get-Content backend\logs\audit.log -Tail 50"
) else if "%choice%"=="3" (
    powershell -Command "Get-Content C:\xampp\php\logs\php_error_log -Tail 50"
) else (
    echo Lựa chọn không hợp lệ
)

pause
```

---

## ✅ CHECKLIST KHI DEBUG

- [ ] Kiểm tra PHP Error Log
- [ ] Kiểm tra app.log
- [ ] Kiểm tra audit.log
- [ ] Kiểm tra Network Tab (Browser DevTools)
- [ ] Kiểm tra Console (Browser DevTools)
- [ ] Bật `display_errors` tạm thời
- [ ] Kiểm tra database connection
- [ ] Kiểm tra file permissions (logs folder)

---

**Generated**: 2025-12-13





