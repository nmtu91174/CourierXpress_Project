-- ==========================================================
-- CourierXpress / eProject - Complete MySQL Schema + Seed (Past Timeline Ready)
-- Compatible: MySQL 8.x (InnoDB)
-- Timezone: +07:00
-- ==========================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS eProject;
CREATE DATABASE eProject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eProject;

-- ==========================================================
-- MASTER TABLES
-- ==========================================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  avatar VARCHAR(255),
  gender ENUM('male','female','other'),
  birthday DATE,
  role ENUM('admin','customer','shipper','agent') NOT NULL DEFAULT 'customer',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  citizen_id VARCHAR(20),
  vehicle_plate VARCHAR(20),
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE item_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE service_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT NULL
) ENGINE=InnoDB;

CREATE TABLE fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  type ENUM('base','weight','extra','cod','insurance') DEFAULT 'base',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- CORE BUSINESS TABLES
-- ==========================================================

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,

  customer_id INT NOT NULL,
  agent_id INT NULL,
  shipper_id INT NULL,

  order_code VARCHAR(30) NOT NULL UNIQUE,

  sender_name VARCHAR(100),
  sender_phone VARCHAR(20),
  sender_address VARCHAR(255),

  receiver_name VARCHAR(100),
  receiver_phone VARCHAR(20),
  receiver_address VARCHAR(255),

  category_id INT NULL,
  weight INT NOT NULL, -- (g)
  length DECIMAL(10,2) NULL,
  width DECIMAL(10,2) NULL,
  height DECIMAL(10,2) NULL,

  service_type INT NULL,
  notes TEXT NULL,
  payer_type TINYINT NOT NULL DEFAULT 1 COMMENT '1 = Sender pays, 2 = Receiver pays',

  status INT NOT NULL DEFAULT 1 COMMENT 'FK statuses.id',

  total_amount DECIMAL(10,2) DEFAULT 0,
  cod_amount DECIMAL(10,2) DEFAULT 0,
  total_shipping_fee DECIMAL(10,2) DEFAULT 0,
  penalty_fee DECIMAL(10,2) DEFAULT 0 COMMENT 'Penalty for weight mismatch',

  payment_method_id INT NULL,

  -- assignment / audit
  assigned_by ENUM('admin','agent') DEFAULT 'agent',

  -- soft-cancel / reopen support
  previous_status INT NULL,
  cancelled_at TIMESTAMP NULL,
  cancelled_by INT NULL,

  -- proof & measurement
  delivered_at DATETIME NULL,
  actual_weight DECIMAL(10,2) NULL COMMENT 'Actual weight measured by shipper',
  pickup_proof VARCHAR(255) NULL COMMENT 'Pickup proof image path/url',
  delivery_proof VARCHAR(255) NULL COMMENT 'Delivery proof image path/url',

  -- failed delivery
  failed_at DATETIME DEFAULT NULL COMMENT 'Fail time (status=6)',
  failed_by INT DEFAULT NULL COMMENT 'Shipper who confirmed failed',
  failed_issue_id INT DEFAULT NULL COMMENT 'Link to delivery_issues.id (final)',
  failed_reason ENUM(
    'customer_unreachable',
    'customer_refused',
    'package_damaged',
    'weather_delay',
    'other'
  ) DEFAULT NULL COMMENT 'Final failed reason',
  is_locked TINYINT(1) DEFAULT 0 COMMENT '1 = locked (delivered/failed)',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- FKs
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users(id),
  CONSTRAINT fk_orders_agent    FOREIGN KEY (agent_id)    REFERENCES users(id),
  CONSTRAINT fk_orders_shipper  FOREIGN KEY (shipper_id)  REFERENCES users(id),
  CONSTRAINT fk_orders_status   FOREIGN KEY (status)      REFERENCES statuses(id),
  CONSTRAINT fk_orders_prev_status FOREIGN KEY (previous_status) REFERENCES statuses(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_failed_by    FOREIGN KEY (failed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
  CONSTRAINT fk_orders_service_type FOREIGN KEY (service_type) REFERENCES service_types(id),
  CONSTRAINT fk_orders_category FOREIGN KEY (category_id) REFERENCES item_categories(id),

  -- Indexes
  INDEX idx_orders_customer (customer_id),
  INDEX idx_orders_shipper (shipper_id),
  INDEX idx_orders_agent (agent_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created_at (created_at),
  INDEX idx_orders_order_code (order_code)
) ENGINE=InnoDB;

CREATE TABLE delivery_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  reported_by INT NULL,
  role ENUM('shipper','agent','system') NOT NULL DEFAULT 'shipper',

  reason ENUM(
    'customer_unreachable',
    'customer_refused',
    'package_damaged',
    'weather_delay',
    'other'
  ) NOT NULL DEFAULT 'other',

  detail TEXT NULL,

  latitude DECIMAL(10,8) DEFAULT NULL COMMENT 'GPS latitude when reporting',
  longitude DECIMAL(11,8) DEFAULT NULL COMMENT 'GPS longitude when reporting',
  accuracy DECIMAL(10,2) DEFAULT NULL COMMENT 'GPS accuracy (m)',

  attempt_no INT DEFAULT 1 COMMENT 'Delivery attempt number',
  resolved TINYINT(1) DEFAULT 0 COMMENT 'Resolved or not',
  is_final TINYINT(1) DEFAULT 1 COMMENT '1 = this issue leads to final failed status',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_delivery_issues_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_issues_reported_by FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_delivery_issues_order (order_id),
  INDEX idx_delivery_issues_created (created_at)
) ENGINE=InnoDB;

-- Add FK from orders -> delivery_issues after both tables exist
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_failed_issue
  FOREIGN KEY (failed_issue_id) REFERENCES delivery_issues(id)
  ON DELETE SET NULL;

CREATE TABLE order_fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  fee_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_fees_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_fees_fee   FOREIGN KEY (fee_id)   REFERENCES fees(id),
  INDEX idx_order_fees_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE order_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,

  type ENUM('pickup','delivery','delivery_failed') NOT NULL DEFAULT 'pickup'
    COMMENT 'pickup / delivery / delivery_failed',

  uploaded_by INT DEFAULT NULL,
  role ENUM('shipper','agent','system') DEFAULT 'shipper',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_order_images_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_images_user  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_order_images_order (order_id),
  INDEX idx_order_images_type (type)
) ENGINE=InnoDB;

CREATE TABLE order_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status_id INT NOT NULL,
  user_id INT NULL,
  role ENUM('admin','customer','agent','shipper','system') NOT NULL DEFAULT 'system',
  note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_order_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_history_status FOREIGN KEY (status_id) REFERENCES statuses(id),
  CONSTRAINT fk_order_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_order_history_order (order_id),
  INDEX idx_order_history_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  invoice_number VARCHAR(20) UNIQUE NOT NULL,
  total_amount DECIMAL(10,2),
  status ENUM('unpaid','paid','cancelled') DEFAULT 'unpaid',
  payment_method_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_invoices_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),

  INDEX idx_invoice_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  method_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_method  FOREIGN KEY (method_id) REFERENCES payment_methods(id)
) ENGINE=InnoDB;

CREATE TABLE order_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  agent_id INT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_order_approvals_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_approvals_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_order_approvals_agent_status (agent_id, status),
  INDEX idx_order_approvals_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(100),
  entity_id INT,
  scope VARCHAR(50) DEFAULT 'SYSTEM',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_system_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_system_logs_user (user_id),
  INDEX idx_system_logs_entity (entity, entity_id),
  INDEX idx_system_logs_created (created_at)
) ENGINE=InnoDB;


CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('order','system','warning') NOT NULL DEFAULT 'system',
  related_order_id INT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at TIMESTAMP NULL DEFAULT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_order FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,

  INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
  INDEX idx_notifications_user_created (user_id, created_at),
  INDEX idx_notifications_order_created (related_order_id, created_at),
  INDEX idx_notifications_type_created (type, created_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- BASE SEED DATA (deterministic IDs for statuses)
-- ==========================================================

-- USERS (core accounts)
INSERT INTO users (id, name, email, password, phone, address, role, citizen_id, vehicle_plate)
VALUES
(1, 'Nguyễn Văn Admin',   'admin@gmail.com',    '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G', '0901111111', 'Hà Nội',  'admin',   '012345678', NULL),
(2, 'Trần Thị Agent 1',   'agent1@gmail.com',   '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G', '0902222222', 'Hà Nội',  'agent',   '987654321', NULL),
(3, 'Lê Văn Agent 2',     'agent2@gmail.com',   '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G', '0903333333', 'HCM',     'agent',   '123456789', NULL),
(4, 'Phạm Quốc Shipper',  'shipper@gmail.com',  '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G', '0904444444', 'HCM',     'shipper', '222333444', '59X1-12345'),
(5, 'Hoàng Minh Customer','customer@gmail.com', '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G', '0905555555', 'Đà Nẵng', 'customer','333444555', NULL),
(6, 'Guest Customer',     'guest_user@system.com','$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G', NULL, NULL, 'customer', NULL, NULL);

-- PAYMENT METHODS
INSERT INTO payment_methods (id, code, name) VALUES
(1, 'cash',    'Tiền mặt'),
(2, 'banking', 'Chuyển khoản'),
(3, 'momo',    'Ví MoMo');

-- STATUSES (IDs fixed 1..7 to match workflow)
INSERT INTO statuses (id, code, description) VALUES
(1, 'booked',    'Đã tạo đơn'),
(2, 'approved',  'Đã duyệt đơn hàng'),
(3, 'assigned',  'Đã gán shipper (chờ pickup)'),
(4, 'picked_up', 'Đã lấy hàng và đang giao'),
(5, 'delivered', 'Giao thành công'),
(6, 'failed',    'Giao chưa thành công'),
(7, 'cancelled', 'Đơn hàng đã được hủy');

-- CATEGORIES
INSERT INTO item_categories (id, name) VALUES
(1,'Quần áo'), (2,'Mỹ phẩm'), (3,'Điện tử'), (4,'Phụ kiện'), (5,'Tài liệu'), (6,'Khác');

-- SERVICE TYPES
INSERT INTO service_types (id, name, fee, description) VALUES
(1, 'Tiêu chuẩn', 0, 'Đơn hàng thông thường, không yêu cầu xử lý đặc biệt'),
(2, 'Hàng dễ vỡ', 10000, 'Hàng hóa cần cẩn thận, tránh va đập'),
(3, 'Tài liệu quan trọng', 15000, 'Hồ sơ, giấy tờ cần bảo mật và giao đúng người'),
(4, 'Quay lại lấy tiếp đơn', 40000, 'Shipper cần quay lại điểm lấy hàng để lấy thêm đơn'),
(5, 'Hàng cồng kềnh', 50000, 'Hàng hóa kích thước lớn, cần hỗ trợ vận chuyển'),
(6, 'Hàng giá trị cao', 30000, 'Hàng hóa giá trị cao, cần chú ý bảo quản');

-- FEES
INSERT INTO fees (id, code, name, description, amount, type) VALUES
(1,'base_fee','Phí cơ bản','Phí vận chuyển nền tảng',15000,'base'),
(2,'weight_fee','Phí theo trọng lượng','Phụ phí nếu hàng nặng',5000,'weight'),
(3,'insurance_fee','Phí bảo hiểm','Bảo hiểm hàng giá trị cao',2000,'insurance'),
(4,'cod_amount_value','Giá trị Thu Hộ (COD)','Tiền cần thu hộ từ người nhận',0,'cod'),
(5,'distance_fee','Phí theo km','Tính phí dựa trên khoảng cách',4000,'extra'),
(6,'service_surcharge','Phụ phí dịch vụ','Phí cộng thêm theo loại dịch vụ',0,'extra');

-- ==========================================================
-- SAMPLE ORDERS - REMOVED MANUAL SEEDING
-- All orders are now seeded via seed_orders_past() procedure
-- to ensure 100% consistency and full workflow compliance
-- ==========================================================


-- ==========================================================
-- SEED HELPERS (optional large dataset) - Past timeline
-- ==========================================================

DROP PROCEDURE IF EXISTS seed_agents;
DROP PROCEDURE IF EXISTS seed_shippers;
DROP PROCEDURE IF EXISTS seed_customers;
DROP PROCEDURE IF EXISTS seed_orders;
DROP PROCEDURE IF EXISTS seed_orders_past;
DROP PROCEDURE IF EXISTS seed_orders_with_approvals;
DROP PROCEDURE IF EXISTS seed_notification_from_template;
DROP PROCEDURE IF EXISTS seed_admin_notifications;

DELIMITER //

-- ==========================================================
-- PROCEDURE: seed_notification_from_template
-- Purpose: Seed notification from template (template-driven seeding)
-- ==========================================================
CREATE PROCEDURE seed_notification_from_template(
  IN p_template_name VARCHAR(100),
  IN p_user_id INT,
  IN p_related_order_id INT,
  IN p_created_at TIMESTAMP
)
BEGIN
  DECLARE v_template_id INT;
  DECLARE v_title_template VARCHAR(255);
  DECLARE v_message_template TEXT;
  DECLARE v_type ENUM('order', 'system', 'warning');
  DECLARE v_title VARCHAR(255);
  DECLARE v_message TEXT;
  DECLARE v_order_code VARCHAR(20);

  -- Load template by name
  SELECT id, title_template, message_template, type
  INTO v_template_id, v_title_template, v_message_template, v_type
  FROM notification_templates
  WHERE name = p_template_name
  LIMIT 1;

  -- If template not found, skip (do not fail seed)
  IF v_template_id IS NULL THEN
    -- Template not found, silently skip
    SET v_title = CONCAT('Notification (template not found: ', p_template_name, ')');
    SET v_message = 'Template not found';
    SET v_type = 'system';
  ELSE
    -- Get order code if related_order_id exists
    IF p_related_order_id IS NOT NULL THEN
      SELECT order_code INTO v_order_code
      FROM orders
      WHERE id = p_related_order_id
      LIMIT 1;
    END IF;

    -- Use template directly (no placeholder replacement for seed - templates are simple)
    -- For seed, we use the template as-is since templates may contain {order_code} placeholder
    -- In runtime, NotificationService would replace placeholders, but for seed we keep it simple
    SET v_title = v_title_template;
    SET v_message = v_message_template;
    
    -- Replace {order_code} placeholder if order_code exists
    IF v_order_code IS NOT NULL THEN
      SET v_message = REPLACE(v_message, '{order_code}', v_order_code);
      SET v_title = REPLACE(v_title, '{order_code}', v_order_code);
    END IF;
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, title, message, type, related_order_id, is_read, created_at)
  VALUES (p_user_id, v_title, v_message, v_type, p_related_order_id, 0, p_created_at);
END//

CREATE PROCEDURE seed_agents(IN p_count INT)
BEGIN
  -- Fixed agents for demo: one agent per key district
  -- Email format: district name (lowercase, no spaces)@gmail.com
  DECLARE v_district_id INT;
  DECLARE v_district_name VARCHAR(100);
  DECLARE v_agent_id INT;
  DECLARE v_email VARCHAR(100);
  DECLARE done INT DEFAULT 0;
  
  DECLARE cur_districts CURSOR FOR
    SELECT id, name FROM districts 
    WHERE name IN ('Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng', 'Thanh Xuân', 'Cầu Giấy', 'Hoàng Mai')
    ORDER BY id
    LIMIT 10;
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
  OPEN cur_districts;
  
  read_loop: LOOP
    FETCH cur_districts INTO v_district_id, v_district_name;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;
    
    -- Generate email: lowercase, remove spaces, replace ALL Vietnamese diacritics to no-diacritic
    -- Example: Ba Đình -> badinh, Hoàn Kiếm -> hoankiem, Đống Đa -> dongda
    SET v_email = LOWER(v_district_name);
    SET v_email = REPLACE(v_email, ' ', '');
    -- Đ, đ -> d
    SET v_email = REPLACE(v_email, 'Đ', 'd');
    SET v_email = REPLACE(v_email, 'đ', 'd');
    -- a variants
    SET v_email = REPLACE(v_email, 'à', 'a');
    SET v_email = REPLACE(v_email, 'á', 'a');
    SET v_email = REPLACE(v_email, 'ạ', 'a');
    SET v_email = REPLACE(v_email, 'ả', 'a');
    SET v_email = REPLACE(v_email, 'ã', 'a');
    SET v_email = REPLACE(v_email, 'ầ', 'a');
    SET v_email = REPLACE(v_email, 'ấ', 'a');
    SET v_email = REPLACE(v_email, 'ậ', 'a');
    SET v_email = REPLACE(v_email, 'ẩ', 'a');
    SET v_email = REPLACE(v_email, 'ẫ', 'a');
    SET v_email = REPLACE(v_email, 'ằ', 'a');
    SET v_email = REPLACE(v_email, 'ắ', 'a');
    SET v_email = REPLACE(v_email, 'ặ', 'a');
    SET v_email = REPLACE(v_email, 'ẳ', 'a');
    SET v_email = REPLACE(v_email, 'ẵ', 'a');
    -- e variants
    SET v_email = REPLACE(v_email, 'è', 'e');
    SET v_email = REPLACE(v_email, 'é', 'e');
    SET v_email = REPLACE(v_email, 'ẹ', 'e');
    SET v_email = REPLACE(v_email, 'ẻ', 'e');
    SET v_email = REPLACE(v_email, 'ẽ', 'e');
    SET v_email = REPLACE(v_email, 'ề', 'e');
    SET v_email = REPLACE(v_email, 'ế', 'e');
    SET v_email = REPLACE(v_email, 'ệ', 'e');
    SET v_email = REPLACE(v_email, 'ể', 'e');
    SET v_email = REPLACE(v_email, 'ễ', 'e');
    -- i variants
    SET v_email = REPLACE(v_email, 'ì', 'i');
    SET v_email = REPLACE(v_email, 'í', 'i');
    SET v_email = REPLACE(v_email, 'ị', 'i');
    SET v_email = REPLACE(v_email, 'ỉ', 'i');
    SET v_email = REPLACE(v_email, 'ĩ', 'i');
    -- o variants
    SET v_email = REPLACE(v_email, 'ò', 'o');
    SET v_email = REPLACE(v_email, 'ó', 'o');
    SET v_email = REPLACE(v_email, 'ọ', 'o');
    SET v_email = REPLACE(v_email, 'ỏ', 'o');
    SET v_email = REPLACE(v_email, 'õ', 'o');
    SET v_email = REPLACE(v_email, 'ồ', 'o');
    SET v_email = REPLACE(v_email, 'ố', 'o');
    SET v_email = REPLACE(v_email, 'ộ', 'o');
    SET v_email = REPLACE(v_email, 'ổ', 'o');
    SET v_email = REPLACE(v_email, 'ỗ', 'o');
    SET v_email = REPLACE(v_email, 'ờ', 'o');
    SET v_email = REPLACE(v_email, 'ớ', 'o');
    SET v_email = REPLACE(v_email, 'ợ', 'o');
    SET v_email = REPLACE(v_email, 'ở', 'o');
    SET v_email = REPLACE(v_email, 'ỡ', 'o');
    -- u variants
    SET v_email = REPLACE(v_email, 'ù', 'u');
    SET v_email = REPLACE(v_email, 'ú', 'u');
    SET v_email = REPLACE(v_email, 'ụ', 'u');
    SET v_email = REPLACE(v_email, 'ủ', 'u');
    SET v_email = REPLACE(v_email, 'ũ', 'u');
    SET v_email = REPLACE(v_email, 'ừ', 'u');
    SET v_email = REPLACE(v_email, 'ứ', 'u');
    SET v_email = REPLACE(v_email, 'ự', 'u');
    SET v_email = REPLACE(v_email, 'ử', 'u');
    SET v_email = REPLACE(v_email, 'ữ', 'u');
    -- y variants
    SET v_email = REPLACE(v_email, 'ỳ', 'y');
    SET v_email = REPLACE(v_email, 'ý', 'y');
    SET v_email = REPLACE(v_email, 'ỵ', 'y');
    SET v_email = REPLACE(v_email, 'ỷ', 'y');
    SET v_email = REPLACE(v_email, 'ỹ', 'y');
    SET v_email = CONCAT(v_email, '@gmail.com');
    
    -- Insert agent
    INSERT INTO users (name, email, password, phone, address, role, status)
    VALUES (
      CONCAT('Agent ', v_district_name),
      v_email,
      '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G',
      CONCAT('0902', LPAD(v_district_id, 6, '0')),
      CONCAT(v_district_name, ', Hà Nội'),
      'agent',
      'active'
    );
    
    SET v_agent_id = LAST_INSERT_ID();
    
    -- Insert agent_areas mapping (district level, no ward restriction)
    INSERT INTO agent_areas (agent_id, district_id, ward_id, priority, active)
    VALUES (v_agent_id, v_district_id, NULL, 1, 1);
    
  END LOOP;
  
  CLOSE cur_districts;
END//

CREATE PROCEDURE seed_shippers(IN p_count INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= p_count DO
    INSERT INTO users (name, email, password, phone, address, role, vehicle_plate)
    VALUES (
      CONCAT('Shipper ', i),
      CONCAT('shipper', i, '@mail.com'),
      '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G',
      CONCAT('0904', LPAD(i, 6, '0')),
      'HCM',
      'shipper',
      CONCAT('59X-', LPAD(i, 4, '0'))
    );
    SET i = i + 1;
  END WHILE;
END//

CREATE PROCEDURE seed_customers(IN p_count INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= p_count DO
    INSERT INTO users (name, email, password, phone, address, role)
    VALUES (
      CONCAT('Customer ', i),
      CONCAT('customer', i, '@mail.com'),
      '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G',
      CONCAT('0905', LPAD(i, 6, '0')),
      'Da Nang',
      'customer'
    );
    SET i = i + 1;
  END WHILE;
END//

-- ----------------------------------------------------------
-- seed_orders_past(p_count, p_days_back)
-- 
-- STRICT WORKFLOW RULES (Enterprise Logistics):
-- ============================================
-- Status 1 (BOOKED):
--   - agent_id = NULL (awaiting admin assign)
--   - shipper_id = NULL
--
-- Status 2 (APPROVED):
--   - agent_id REQUIRED (auto-assigned by district)
--   - shipper_id = NULL
--
-- Status >= 3 (ASSIGNED, PICKED_UP, DELIVERED, FAILED):
--   - agent_id REQUIRED (auto-assigned by district)
--   - shipper_id REQUIRED (random from shippers pool)
--
-- Status 5-6 (DELIVERED/FAILED):
--   - is_locked = 1
--
-- Features:
-- - Auto assign agent by district via agent_areas
-- - Order ID tự động tăng (AUTO_INCREMENT)
-- - Order code tăng dần theo thời gian: ORD00000001, ORD00000002, ...
-- - Đầy đủ các trường: pickup_district_id, pickup_ward_id, routing_status
-- - Created_at rải trong quá khứ (biased nhẹ về gần hiện tại)
-- ----------------------------------------------------------
CREATE PROCEDURE seed_orders_past(IN p_count INT, IN p_days_back INT)
BEGIN
  DECLARE i INT DEFAULT 1;

  DECLARE v_status INT;
  DECLARE v_prev_status INT;

  DECLARE v_agent INT;
  DECLARE v_shipper INT;
  DECLARE v_customer INT;
  DECLARE v_pickup_district_id INT;
  DECLARE v_pickup_ward_id INT;
  DECLARE v_district_name VARCHAR(100);
  DECLARE v_ward_name VARCHAR(100);

  DECLARE v_order_id INT;
  DECLARE v_invoice_id INT;
  DECLARE v_routing_status ENUM('auto', 'fallback_admin');
  DECLARE v_assigned_by ENUM('admin', 'agent');
  DECLARE v_seed_end_time DATETIME;
  DECLARE v_invoice_year INT;
  DECLARE v_invoice_sequence INT;
  DECLARE v_invoice_number VARCHAR(20);

  DECLARE t_booked   DATETIME;
  DECLARE t_approved DATETIME;
  DECLARE t_assigned DATETIME;
  DECLARE t_picked   DATETIME;
  DECLARE t_final    DATETIME;

  DECLARE v_days INT;
  DECLARE v_total DECIMAL(10,2);
  DECLARE v_ship_fee DECIMAL(10,2);
  DECLARE v_weight INT;
  DECLARE v_length DECIMAL(10,2);
  DECLARE v_width DECIMAL(10,2);
  DECLARE v_height DECIMAL(10,2);

  -- FIX 2: Seed anchor time - ALL seeded orders MUST be older than real runtime orders
  SET v_seed_end_time = DATE_SUB(NOW(), INTERVAL 1 DAY);

  WHILE i <= p_count DO
    -- Bias về gần hiện tại để chart đẹp hơn, but NEVER exceed v_seed_end_time
    SET v_days = FLOOR(POW(RAND(), 2) * p_days_back);

    -- FIX 2: Ensure created_at is ALWAYS <= v_seed_end_time
    SET t_booked = TIMESTAMPADD(
      SECOND,
      FLOOR(RAND() * 86400),
      DATE_SUB(v_seed_end_time, INTERVAL v_days DAY)
    );

    SET v_status = FLOOR(1 + RAND() * 7); -- 1..7

    SET v_customer = (SELECT id FROM users WHERE role='customer' ORDER BY RAND() LIMIT 1);

    -- Pick random district and ward (REQUIRED for auto-routing test)
    SELECT d.id, d.name, w.id, w.name
    INTO v_pickup_district_id, v_district_name, v_pickup_ward_id, v_ward_name
    FROM districts d
    JOIN wards w ON w.district_id = d.id
    WHERE d.name IN ('Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng', 'Thanh Xuân', 'Cầu Giấy', 'Hoàng Mai')
    ORDER BY RAND()
    LIMIT 1;

    -- Ensure district and ward are set (required for auto-routing)
    IF v_pickup_district_id IS NULL OR v_pickup_ward_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to select district/ward. Ensure districts and wards are seeded.';
    END IF;

    -- Determine routing_status and assigned_by (must match)
    -- 70% auto (agent), 30% fallback_admin (admin) to reflect real-world mix
    IF RAND() < 0.70 THEN
      SET v_routing_status = 'auto';
      SET v_assigned_by = 'agent';
    ELSE
      SET v_routing_status = 'fallback_admin';
      SET v_assigned_by = 'admin';
    END IF;

    -- Auto assign agent by district (from agent_areas)
    SELECT aa.agent_id INTO v_agent
    FROM agent_areas aa
    WHERE aa.district_id = v_pickup_district_id
      AND aa.active = 1
      AND (aa.ward_id IS NULL OR aa.ward_id = v_pickup_ward_id)
    ORDER BY aa.priority ASC
    LIMIT 1;

    -- Timeline
    SET t_approved = DATE_ADD(t_booked,   INTERVAL (5  + FLOOR(RAND()*180)) MINUTE);
    SET t_assigned = DATE_ADD(t_approved, INTERVAL (5  + FLOOR(RAND()*240)) MINUTE);
    SET t_picked   = DATE_ADD(t_assigned, INTERVAL (10 + FLOOR(RAND()*360)) MINUTE);
    SET t_final    = DATE_ADD(t_picked,   INTERVAL (30 + FLOOR(RAND()*720)) MINUTE);

    -- ==========================================================
    -- STRICT WORKFLOW: Agent/Shipper allocation by status
    -- ==========================================================
    -- Status 1 (BOOKED): agent_id = NULL, shipper_id = NULL
    -- Status 2 (APPROVED): agent_id REQUIRED, shipper_id = NULL
    -- Status >= 3 (ASSIGNED+): agent_id REQUIRED, shipper_id REQUIRED
    -- ==========================================================
    
    IF v_status = 7 THEN
      -- CANCELLED: can be from BOOKED or APPROVED
      SET v_prev_status = IF(RAND() < 0.60, 1, 2);
      
      IF v_prev_status = 1 THEN
        -- Cancelled from BOOKED: no agent, no shipper
        SET v_agent = NULL;
      SET v_shipper = NULL;
        SET t_final = DATE_ADD(t_booked, INTERVAL (5 + FLOOR(RAND()*240)) MINUTE);
      ELSE
        -- Cancelled from APPROVED: must have agent, no shipper
        IF v_agent IS NULL THEN
          SET v_agent = (SELECT id FROM users WHERE role='agent' ORDER BY RAND() LIMIT 1);
        END IF;
        SET v_shipper = NULL;
        SET t_final = DATE_ADD(t_approved, INTERVAL (5 + FLOOR(RAND()*240)) MINUTE);
      END IF;

    ELSEIF v_status = 1 THEN
      -- BOOKED: agent_id = NULL, shipper_id = NULL (awaiting admin assign)
      SET v_prev_status = NULL;
      SET v_agent = NULL;
      SET v_shipper = NULL;

    ELSEIF v_status = 2 THEN
      -- APPROVED: agent_id REQUIRED, shipper_id = NULL
      SET v_prev_status = NULL;
      -- v_agent already set from district lookup above, but ensure it exists
      IF v_agent IS NULL THEN
        -- Fallback: get any agent if district lookup failed
        SET v_agent = (SELECT id FROM users WHERE role='agent' ORDER BY RAND() LIMIT 1);
      END IF;
      SET v_shipper = NULL;

    ELSE
      -- Status >= 3 (ASSIGNED, PICKED_UP, DELIVERED, FAILED):
      -- BOTH agent_id AND shipper_id REQUIRED
      SET v_prev_status = NULL;
      
      -- Ensure agent exists (from district lookup)
      IF v_agent IS NULL THEN
        SET v_agent = (SELECT id FROM users WHERE role='agent' ORDER BY RAND() LIMIT 1);
      END IF;
      
      -- Shipper is REQUIRED for status >= 3
      SET v_shipper = (SELECT id FROM users WHERE role='shipper' ORDER BY RAND() LIMIT 1);
      
      -- Ensure shipper exists (if no shippers in DB, this will fail - expected)
      IF v_shipper IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No shippers available. Seed shippers first.';
      END IF;
    END IF;

    -- Generate order data
    SET v_total   = ROUND(20000 + RAND() * 300000, 2);
    SET v_ship_fee = ROUND(15000 + RAND() * 50000, 2);
    SET v_weight = FLOOR(500 + RAND() * 5000);
    SET v_length = ROUND(20 + RAND() * 60, 2);
    SET v_width  = ROUND(15 + RAND() * 40, 2);
    SET v_height = ROUND(10 + RAND() * 30, 2);

    -- FIX 1: Order code will be set AFTER INSERT using AUTO_INCREMENT id
    -- Insert order WITHOUT order_code first (will be updated after)
    INSERT INTO orders (
      customer_id, agent_id, shipper_id, order_code,
      sender_name, sender_phone, sender_address,
      receiver_name, receiver_phone, receiver_address,
      category_id, weight, length, width, height,
      service_type, notes, payer_type, status,
      total_amount, cod_amount, total_shipping_fee, payment_method_id,
      assigned_by, is_locked,
      pickup_district_id, pickup_ward_id, routing_status,
      created_at, updated_at,
      delivered_at,
      failed_at, failed_by, failed_reason,
      actual_weight, penalty_fee,
      previous_status, cancelled_at, cancelled_by
    )
    VALUES (
      v_customer,
      v_agent,
      IF(v_status >= 3 AND v_status <> 7, v_shipper, NULL),
      CONCAT('ORDTEMP', i, '_', UNIX_TIMESTAMP()), -- Temporary unique: will be updated after INSERT using AUTO_INCREMENT id

      CONCAT('Nguyễn Văn ', i),
      CONCAT('090', LPAD(FLOOR(1000000 + RAND() * 9000000), 7, '0')),
      CONCAT(v_ward_name, ', ', v_district_name, ', Hà Nội'),
      CONCAT('Trần Thị ', i),
      CONCAT('091', LPAD(FLOOR(1000000 + RAND() * 9000000), 7, '0')),
      CONCAT(v_ward_name, ', ', v_district_name, ', Hà Nội'),

      FLOOR(1 + RAND() * 6),
      v_weight,
      v_length,
      v_width,
      v_height,
      FLOOR(1 + RAND() * 6),
      CONCAT('Ghi chú đơn hàng ', i),
      IF(RAND() < 0.7, 1, 2), -- 70% sender pays
      v_status,

      v_total,
      IF(RAND() < 0.3, ROUND(v_total * 0.5, 2), 0), -- 30% COD
      v_ship_fee,
      FLOOR(1 + RAND() * 3),

      -- assigned_by: must match routing_status (set above)
      v_assigned_by,
      -- Locking: status 5 (DELIVERED) or 6 (FAILED) must be locked
      IF(v_status IN (5,6), 1, 0),

      v_pickup_district_id,
      v_pickup_ward_id,
      -- routing_status: must match assigned_by (set above)
      v_routing_status,

      t_booked,
      CASE
        WHEN v_status = 1 THEN t_booked
        WHEN v_status = 2 THEN t_approved
        WHEN v_status = 3 THEN t_assigned
        WHEN v_status = 4 THEN t_picked
        WHEN v_status IN (5,6,7) THEN t_final
        ELSE t_booked
      END,

      CASE WHEN v_status = 5 THEN t_final ELSE NULL END,

      CASE WHEN v_status = 6 THEN t_final ELSE NULL END,
      CASE WHEN v_status = 6 THEN v_shipper ELSE NULL END,
      CASE
        WHEN v_status = 6 THEN ELT(1 + FLOOR(RAND() * 5),
          'customer_unreachable',
          'customer_refused',
          'package_damaged',
          'weather_delay',
          'other'
        )
        ELSE NULL
      END,

      CASE
        WHEN v_status IN (4,5,6) THEN ROUND((v_weight/1000) + (RAND()*0.5), 2)
        ELSE NULL
      END,
      CASE
        WHEN v_status IN (4,5,6) AND RAND() < 0.15 THEN ROUND(1000 + RAND()*10000, 2)
        ELSE 0
      END,

      CASE WHEN v_status = 7 THEN v_prev_status ELSE NULL END,
      CASE WHEN v_status = 7 THEN t_final ELSE NULL END,
      CASE WHEN v_status = 7 THEN 1 ELSE NULL END
    );

    SET v_order_id = LAST_INSERT_ID();

    -- FIX 1: Finalize order_code using AUTO_INCREMENT id (same format as runtime: ORD0101)
    -- Runtime uses: str_pad($nextNumber, 4, '0', STR_PAD_LEFT) → ORD0001, ORD0101
    UPDATE orders
    SET order_code = CONCAT('ORD', LPAD(v_order_id, 4, '0'))
    WHERE id = v_order_id;

    -- ==========================================================
    -- ORDER FEES: ALWAYS CREATE BASE FEE + OPTIONAL WEIGHT FEE
    -- ==========================================================
    -- Base fee: ALWAYS required for every order
    INSERT INTO order_fees (order_id, fee_id, amount, created_at)
    VALUES (v_order_id, 1, 15000, t_booked);

    -- Weight fee: 35% chance (if weight > threshold)
    IF RAND() < 0.35 THEN
      INSERT INTO order_fees (order_id, fee_id, amount, created_at)
      VALUES (v_order_id, 2, 5000, t_booked);
    END IF;

    -- Insurance fee: 20% chance for high-value orders
    IF v_total > 100000 AND RAND() < 0.20 THEN
      INSERT INTO order_fees (order_id, fee_id, amount, created_at)
      VALUES (v_order_id, 3, 2000, t_booked);
    END IF;

    -- ORDER HISTORY: timeline
    INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
    VALUES (v_order_id, 1, v_customer, 'customer', 'Seed: booked', t_booked);

    IF v_status = 7 THEN
      IF v_prev_status = 2 THEN
        INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
        VALUES (v_order_id, 2, v_agent, 'agent', 'Seed: approved', t_approved);
      END IF;

      INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
      VALUES (v_order_id, 7, 1, 'admin', 'Seed: cancelled', t_final);

    ELSE
      IF v_status >= 2 THEN
        INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
        VALUES (v_order_id, 2, v_agent, 'agent', 'Seed: approved', t_approved);
      END IF;

      IF v_status >= 3 THEN
        INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
        VALUES (v_order_id, 3, 1, 'system', 'Seed: assigned', t_assigned);
      END IF;

      IF v_status >= 4 THEN
        INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
        VALUES (v_order_id, 4, v_shipper, 'shipper', 'Seed: picked up', t_picked);
      END IF;

      IF v_status = 5 THEN
        INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
        VALUES (v_order_id, 5, v_shipper, 'shipper', 'Seed: delivered', t_final);
      END IF;

      IF v_status = 6 THEN
        INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
        VALUES (v_order_id, 6, v_shipper, 'shipper', 'Seed: failed', t_final);
      END IF;
    END IF;

    -- ORDER APPROVALS (carrier-style: no waiting approvals)
    -- - BOOKED (status=1): no approval record
    -- - CANCELLED (status=7): keep an approval record only if it was previously APPROVED
    -- - Otherwise (status>=2): auto approved
    IF v_status = 7 THEN
      IF v_prev_status = 2 THEN
        INSERT INTO order_approvals (order_id, agent_id, status, note, created_at)
        VALUES (v_order_id, v_agent, 'approved', 'Seed: cancelled (was approved)', t_approved);
      END IF;
    ELSEIF v_status >= 2 THEN
      INSERT INTO order_approvals (order_id, agent_id, status, note, created_at)
      VALUES (v_order_id, v_agent, 'approved', 'Seed: auto approved', t_approved);
    END IF;

    -- Images
    IF v_status IN (3,4,5,6) AND v_shipper IS NOT NULL THEN
      INSERT INTO order_images (order_id, image_url, type, uploaded_by, role, created_at)
      VALUES (v_order_id, CONCAT('uploads/seed_', v_order_id, '_pickup.jpg'), 'pickup', v_shipper, 'shipper', t_picked);

      IF v_status = 5 THEN
        INSERT INTO order_images (order_id, image_url, type, uploaded_by, role, created_at)
        VALUES (v_order_id, CONCAT('uploads/seed_', v_order_id, '_delivery.jpg'), 'delivery', v_shipper, 'shipper', t_final);
      END IF;

      IF v_status = 6 THEN
        INSERT INTO order_images (order_id, image_url, type, uploaded_by, role, created_at)
        VALUES (v_order_id, CONCAT('uploads/seed_', v_order_id, '_failed.jpg'), 'delivery_failed', v_shipper, 'shipper', t_final);
      END IF;
    END IF;

    -- Delivery issues (final) for FAILED
    IF v_status = 6 THEN
      INSERT INTO delivery_issues (
        order_id, reported_by, role, reason, detail,
        latitude, longitude, accuracy, attempt_no, resolved, is_final, created_at
      ) VALUES (
        v_order_id, v_shipper, 'shipper',
        (SELECT failed_reason FROM orders WHERE id = v_order_id),
        'Seed: issue detail',
        10.77584000 + (RAND()/100), 106.70098000 + (RAND()/100), 10 + FLOOR(RAND()*20),
        1, 0, 1, t_final
      );
      -- Link orders.failed_issue_id
      UPDATE orders
      SET failed_issue_id = LAST_INSERT_ID()
      WHERE id = v_order_id;
    END IF;

    -- Invoices/Payments (for delivered/failed mostly)
    IF v_status IN (5,6) THEN
      -- FIX 3: Generate invoice_number using same format as runtime (INV + YEAR + sequence)
      SET v_invoice_year = YEAR(t_final);
      SELECT COALESCE(COUNT(*), 0) + 1 INTO v_invoice_sequence
      FROM invoices
      WHERE YEAR(created_at) = v_invoice_year;
      SET v_invoice_number = CONCAT('INV', v_invoice_year, LPAD(v_invoice_sequence, 6, '0'));
      
      INSERT INTO invoices (order_id, invoice_number, total_amount, status, payment_method_id, created_at)
      VALUES (
        v_order_id,
        v_invoice_number,
        v_total + v_ship_fee,
        IF(RAND() < 0.70, 'paid', 'unpaid'),
        FLOOR(1 + RAND()*3),
        t_final
      );
      SET v_invoice_id = LAST_INSERT_ID();

      IF (SELECT status FROM invoices WHERE id = v_invoice_id) = 'paid' THEN
        INSERT INTO payments (invoice_id, method_id, amount, created_at)
        VALUES (v_invoice_id, FLOOR(1 + RAND()*3), v_total + v_ship_fee, DATE_ADD(t_final, INTERVAL 5 MINUTE));
      END IF;
    END IF;

    -- ==========================================================
    -- SYSTEM LOGS (per status milestone - enterprise standard)
    -- ==========================================================
    -- Log at order creation
    INSERT INTO system_logs (user_id, action, entity, entity_id, scope, created_at)
    VALUES (v_customer, 'Order created', 'orders', v_order_id, 'ORDER', t_booked);

    -- Log at approval (if approved)
    IF v_status >= 2 AND v_agent IS NOT NULL THEN
      INSERT INTO system_logs (user_id, action, entity, entity_id, scope, created_at)
      VALUES (v_agent, 'Order approved', 'orders', v_order_id, 'ORDER', t_approved);
    END IF;

    -- Log at assignment (if assigned)
    IF v_status >= 3 AND v_shipper IS NOT NULL THEN
      INSERT INTO system_logs (user_id, action, entity, entity_id, scope, created_at)
      VALUES (1, 'Order assigned to shipper', 'orders', v_order_id, 'ORDER', t_assigned);
    END IF;

    -- Log at delivery/failure
    IF v_status = 5 THEN
      INSERT INTO system_logs (user_id, action, entity, entity_id, scope, created_at)
      VALUES (v_shipper, 'Order delivered', 'orders', v_order_id, 'ORDER', t_final);
    ELSEIF v_status = 6 THEN
      INSERT INTO system_logs (user_id, action, entity, entity_id, scope, created_at)
      VALUES (v_shipper, 'Order failed', 'orders', v_order_id, 'ORDER', t_final);
    END IF;

    -- ==========================================================
    -- NOTIFICATIONS (per order, aligned with workflow - TEMPLATE-DRIVEN)
    -- ==========================================================
    -- BOOKED → notify admin
    IF v_status = 1 THEN
      CALL seed_notification_from_template('order_created', 1, v_order_id, t_booked);
    END IF;

    -- APPROVED → notify agent
    IF v_status >= 2 AND v_agent IS NOT NULL THEN
      CALL seed_notification_from_template('order_approved', v_agent, v_order_id, t_approved);
    END IF;

    -- ASSIGNED → notify shipper
    IF v_status >= 3 AND v_shipper IS NOT NULL THEN
      CALL seed_notification_from_template('order_assigned', v_shipper, v_order_id, t_assigned);
    END IF;

    -- DELIVERED → notify customer
    IF v_status = 5 THEN
      CALL seed_notification_from_template('order_delivered', v_customer, v_order_id, t_final);
      -- Mark 30% as read (simulate real-world behavior)
      IF RAND() < 0.3 THEN
        UPDATE notifications
        SET is_read = 1, read_at = DATE_ADD(t_final, INTERVAL FLOOR(RAND() * 3600) SECOND)
        WHERE related_order_id = v_order_id
          AND user_id = v_customer
          AND type = 'order'
          AND title LIKE '%delivered%'
        LIMIT 1;
      END IF;
    END IF;

    -- FAILED → notify admin and agent
    IF v_status = 6 THEN
      -- Notify admin
      CALL seed_notification_from_template('order_failed', 1, v_order_id, t_final);
      
      -- Notify agent (if exists)
      IF v_agent IS NOT NULL THEN
        CALL seed_notification_from_template('order_failed_agent', v_agent, v_order_id, t_final);
      END IF;
    END IF;

    SET i = i + 1;
  END WHILE;
END//

-- Wrapper: keep old call style (seed_orders(500))
CREATE PROCEDURE seed_orders(IN p_count INT)
BEGIN
  CALL seed_orders_past(p_count, 365);
END//

CREATE PROCEDURE seed_orders_with_approvals()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_order_id INT;
  DECLARE v_status INT;
  DECLARE v_agent_id INT;

  DECLARE cur_orders CURSOR FOR
    SELECT o.id, o.status, o.agent_id
    FROM orders o
    WHERE NOT EXISTS (
      SELECT 1 FROM order_approvals oa WHERE oa.order_id = o.id
    );

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur_orders;

  read_loop: LOOP
    FETCH cur_orders INTO v_order_id, v_status, v_agent_id;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    -- If order is still BOOKED and admin has assigned an agent => create PENDING approval
    IF v_status = 1 AND v_agent_id IS NOT NULL THEN
      INSERT INTO order_approvals (order_id, agent_id, status, note)
      VALUES (v_order_id, v_agent_id, 'pending', 'Auto-seeded pending (needs agent approval)');

    -- If order is already APPROVED+ => mark approval as APPROVED
    ELSEIF v_status >= 2 THEN
      INSERT INTO order_approvals (order_id, agent_id, status, note)
      VALUES (v_order_id, v_agent_id, 'approved', 'Auto-seeded approved');
    END IF;

  END LOOP;

  CLOSE cur_orders;
END//

-- ==========================================================
-- PROCEDURE: seed_admin_notifications
-- Purpose: Seed admin/promo notifications (manual/admin-triggered)
-- ==========================================================
CREATE PROCEDURE seed_admin_notifications(IN p_count INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE v_user_id INT;
  DECLARE v_template_name VARCHAR(100);
  DECLARE v_extra_message TEXT;
  DECLARE v_created_at DATETIME;
  DECLARE v_days INT;
  DECLARE v_role VARCHAR(20);
  DECLARE done INT DEFAULT 0;
  DECLARE cur_users CURSOR FOR SELECT id, role FROM users WHERE status = 'active';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  WHILE i <= p_count DO
    -- Random days back (0-90 days)
    SET v_days = FLOOR(RAND() * 90);
    SET v_created_at = TIMESTAMPADD(
      SECOND,
      FLOOR(RAND() * 86400),
      DATE_SUB(CURDATE(), INTERVAL v_days DAY)
    );

    -- 50% admin_announcement, 50% promo_discount
    IF RAND() < 0.5 THEN
      SET v_template_name = 'admin_announcement';
      SET v_extra_message = ELT(1 + FLOOR(RAND() * 3),
        'System maintenance scheduled for this weekend. Please plan accordingly.',
        'New features have been added to improve your experience. Check them out!',
        'Important: Please update your profile information to ensure accurate delivery.'
      );
    ELSE
      SET v_template_name = 'promo_discount';
      SET v_extra_message = ELT(1 + FLOOR(RAND() * 3),
        'Special offer: 20% off on all orders this month! Use code SAVE20.',
        'Limited time: Free shipping on orders over 100,000 VND. Order now!',
        'Flash sale: 15% discount on express delivery. Valid until end of week.'
      );
    END IF;

    -- Target audience: 40% all customers, 30% all agents, 20% all shippers, 10% single user
    IF RAND() < 0.4 THEN
      -- Send to all customers
      SET done = 0;
      OPEN cur_users;
      user_loop: LOOP
        FETCH cur_users INTO v_user_id, v_role;
        IF done = 1 THEN
          LEAVE user_loop;
        END IF;
        IF v_role = 'customer' THEN
          CALL seed_notification_from_template(
            v_template_name,
            v_user_id,
            NULL,
            v_created_at
          );
          -- Replace {extra_message} placeholder
          UPDATE notifications
          SET message = REPLACE(message, '{extra_message}', v_extra_message),
              title = REPLACE(title, '{extra_message}', v_extra_message)
          WHERE user_id = v_user_id
            AND related_order_id IS NULL
            AND created_at = v_created_at
            AND message LIKE '%{extra_message}%'
          LIMIT 1;
        END IF;
      END LOOP;
      CLOSE cur_users;

    ELSEIF RAND() < 0.7 THEN
      -- Send to all agents
      SET done = 0;
      OPEN cur_users;
      agent_loop: LOOP
        FETCH cur_users INTO v_user_id, v_role;
        IF done = 1 THEN
          LEAVE agent_loop;
        END IF;
        IF v_role = 'agent' THEN
          CALL seed_notification_from_template(
            v_template_name,
            v_user_id,
            NULL,
            v_created_at
          );
          UPDATE notifications
          SET message = REPLACE(message, '{extra_message}', v_extra_message),
              title = REPLACE(title, '{extra_message}', v_extra_message)
          WHERE user_id = v_user_id
            AND related_order_id IS NULL
            AND created_at = v_created_at
            AND message LIKE '%{extra_message}%'
          LIMIT 1;
        END IF;
      END LOOP;
      CLOSE cur_users;

    ELSEIF RAND() < 0.9 THEN
      -- Send to all shippers
      SET done = 0;
      OPEN cur_users;
      shipper_loop: LOOP
        FETCH cur_users INTO v_user_id, v_role;
        IF done = 1 THEN
          LEAVE shipper_loop;
        END IF;
        IF v_role = 'shipper' THEN
          CALL seed_notification_from_template(
            v_template_name,
            v_user_id,
            NULL,
            v_created_at
          );
          UPDATE notifications
          SET message = REPLACE(message, '{extra_message}', v_extra_message),
              title = REPLACE(title, '{extra_message}', v_extra_message)
          WHERE user_id = v_user_id
            AND related_order_id IS NULL
            AND created_at = v_created_at
            AND message LIKE '%{extra_message}%'
          LIMIT 1;
        END IF;
      END LOOP;
      CLOSE cur_users;

    ELSE
      -- Send to single random user
      SELECT id INTO v_user_id
      FROM users
      WHERE status = 'active'
      ORDER BY RAND()
      LIMIT 1;

      IF v_user_id IS NOT NULL THEN
        CALL seed_notification_from_template(
          v_template_name,
          v_user_id,
          NULL,
          v_created_at
        );
        UPDATE notifications
        SET message = REPLACE(message, '{extra_message}', v_extra_message),
            title = REPLACE(title, '{extra_message}', v_extra_message)
        WHERE user_id = v_user_id
          AND related_order_id IS NULL
          AND created_at = v_created_at
          AND message LIKE '%{extra_message}%'
        LIMIT 1;
      END IF;
    END IF;

    SET i = i + 1;
  END WHILE;
END//

DELIMITER ;



-- ==========================================================
-- UPGRADE PATCH: 10/10 ENTERPRISE HARDENING (SAFE + DEMO-FRIENDLY)
-- Notes:
-- - Focus: data quality, reporting performance, and schema robustness
-- - Keeps existing workflow & seed compatible
-- ==========================================================

-- --------------------------
-- (A) MONEY PRECISION + STRICT DEFAULTS
-- --------------------------
ALTER TABLE service_types
  MODIFY fee DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE fees
  MODIFY amount DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE order_fees
  MODIFY amount DECIMAL(12,2) NOT NULL;

ALTER TABLE orders
  MODIFY total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  MODIFY cod_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  MODIFY total_shipping_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  MODIFY penalty_fee DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE invoices
  MODIFY total_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE payments
  MODIFY amount DECIMAL(12,2) NOT NULL DEFAULT 0;

-- --------------------------
-- (B) UPDATED_AT FOR FINANCE / ISSUE TRACKING
-- --------------------------
ALTER TABLE delivery_issues
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE invoices
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE payments
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- --------------------------
-- (C) UNIQUENESS (ANTI-DUPLICATE)
-- --------------------------
-- 1 order + 1 fee => 1 row
ALTER TABLE order_fees
  ADD CONSTRAINT uk_order_fees_order_fee UNIQUE (order_id, fee_id);

-- 1 approval record per order (canonical approval)
ALTER TABLE order_approvals
  ADD CONSTRAINT uk_order_approvals_order UNIQUE (order_id);

-- --------------------------
-- (D) PERFORMANCE INDEXES FOR DASHBOARD / REPORTS / PAGINATION
-- --------------------------
-- orders: most common filters (status + time)
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- orders: role dashboards
CREATE INDEX idx_orders_agent_status_created   ON orders(agent_id, status, created_at);
CREATE INDEX idx_orders_shipper_status_created ON orders(shipper_id, status, created_at);
CREATE INDEX idx_orders_customer_status_created ON orders(customer_id, status, created_at);

-- order_history: timeline per order
CREATE INDEX idx_order_history_order_created ON order_history(order_id, created_at);

-- delivery_issues: query issues per order/time
CREATE INDEX idx_delivery_issues_order_created ON delivery_issues(order_id, created_at);

-- order_images: gallery per order/time
CREATE INDEX idx_order_images_order_created ON order_images(order_id, created_at);

-- invoices/payments: billing reports
CREATE INDEX idx_invoices_order_created ON invoices(order_id, created_at);
CREATE INDEX idx_payments_invoice_created ON payments(invoice_id, created_at);

-- system_logs: scope + time
CREATE INDEX idx_system_logs_scope_created ON system_logs(scope, created_at);

-- --------------------------
-- (E) DATA QUALITY CHECKS (MySQL 8.x)
-- --------------------------
-- orders: weights / money must not be negative; payer_type only 1/2
ALTER TABLE orders
  ADD CONSTRAINT chk_orders_weight_nonneg CHECK (weight >= 0),
  ADD CONSTRAINT chk_orders_actual_weight_nonneg CHECK (actual_weight IS NULL OR actual_weight >= 0),
  ADD CONSTRAINT chk_orders_cod_nonneg CHECK (cod_amount >= 0),
  ADD CONSTRAINT chk_orders_penalty_nonneg CHECK (penalty_fee >= 0),
  ADD CONSTRAINT chk_orders_total_nonneg CHECK (total_amount >= 0),
  ADD CONSTRAINT chk_orders_shipfee_nonneg CHECK (total_shipping_fee >= 0),
  ADD CONSTRAINT chk_orders_payer_type CHECK (payer_type IN (1,2)),
  ADD CONSTRAINT chk_orders_is_locked CHECK (is_locked IN (0,1)),
  -- Workflow integrity (shipper must be NULL until ASSIGNED status)
  ADD CONSTRAINT chk_orders_agent_required_after_approved CHECK (status IN (1,7) OR agent_id IS NOT NULL),
  ADD CONSTRAINT chk_orders_shipper_required_by_status CHECK (
    (status IN (3,4,5,6) AND shipper_id IS NOT NULL)
    OR (status IN (1,2,7) AND shipper_id IS NULL)
  ),
  ADD CONSTRAINT chk_orders_lock_by_status CHECK (
    (status IN (5,6) AND is_locked = 1)
    OR (status NOT IN (5,6) AND is_locked = 0)
  );

-- delivery_issues: geo sanity + attempts
ALTER TABLE delivery_issues
  ADD CONSTRAINT chk_issues_attempt CHECK (attempt_no >= 1),
  ADD CONSTRAINT chk_issues_accuracy CHECK (accuracy IS NULL OR accuracy >= 0),
  ADD CONSTRAINT chk_issues_lat CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  ADD CONSTRAINT chk_issues_lng CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
  ADD CONSTRAINT chk_issues_resolved CHECK (resolved IN (0,1)),
  ADD CONSTRAINT chk_issues_is_final CHECK (is_final IN (0,1));

-- fees / invoices / payments: non-negative
ALTER TABLE fees
  ADD CONSTRAINT chk_fees_amount_nonneg CHECK (amount >= 0);

ALTER TABLE invoices
  ADD CONSTRAINT chk_invoices_total_nonneg CHECK (total_amount >= 0);

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_amount_nonneg CHECK (amount >= 0);

-- --------------------------
-- (F) ENTERPRISE AUDIT TABLE (OPTIONAL BUT RECOMMENDED)
-- --------------------------
CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  actor_role VARCHAR(30) NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id INT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_audit_entity (entity, entity_id),
  INDEX idx_audit_actor_time (actor_user_id, created_at)
) ENGINE=InnoDB;

-- --------------------------
-- (G) WORKFLOW TRANSITION MAP (DOC + OPTIONAL DB GUARD)
-- --------------------------
CREATE TABLE order_status_transitions (
  from_status INT NOT NULL,
  to_status INT NOT NULL,
  PRIMARY KEY (from_status, to_status),
  CONSTRAINT fk_trans_from FOREIGN KEY (from_status) REFERENCES statuses(id),
  CONSTRAINT fk_trans_to   FOREIGN KEY (to_status)   REFERENCES statuses(id)
) ENGINE=InnoDB;

-- Default transitions (adjust if your app allows more)
INSERT INTO order_status_transitions(from_status, to_status) VALUES
  (1,2),(2,3),(3,4),(4,5),   -- happy path
  (3,6),(4,6),               -- fail
  (1,7),(2,7),               -- cancel before assigned
  (7,2);                     -- reopen (cancelled -> approved)

-- OPTIONAL: DB-level guard for status transitions (enable if you want strict enforcement)
-- DELIMITER $$
-- CREATE TRIGGER trg_orders_status_guard
-- BEFORE UPDATE ON orders
-- FOR EACH ROW
-- BEGIN
--   IF NEW.status <> OLD.status THEN
--     IF NOT EXISTS (
--       SELECT 1 FROM order_status_transitions
--       WHERE from_status = OLD.status AND to_status = NEW.status
--     ) THEN
--       SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status transition not allowed';
--     END IF;
--   END IF;
-- END$$
-- DELIMITER ;

-- ==========================================================
-- END UPGRADE PATCH
-- ==========================================================


-- ==========================================================
-- ENTERPRISE AREA ROUTING EXTENSION (FULL HANOI SEED)
-- - Normalize districts / wards
-- - Map agent coverage area
-- - Support auto-routing + admin fallback
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------
-- (1) DISTRICTS
-- --------------------------
CREATE TABLE IF NOT EXISTS districts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL DEFAULT 'Hà Nội',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------
-- (2) WARDS
-- --------------------------
CREATE TABLE IF NOT EXISTS wards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  district_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_wards_district
    FOREIGN KEY (district_id) REFERENCES districts(id)
    ON DELETE CASCADE,

  UNIQUE KEY uk_ward_district (district_id, name),
  INDEX idx_wards_district (district_id)
) ENGINE=InnoDB;

-- --------------------------
-- (3) AGENT AREA MAPPING
-- --------------------------
CREATE TABLE IF NOT EXISTS agent_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  district_id INT NOT NULL,
  ward_id INT NULL,
  priority INT DEFAULT 1 COMMENT 'Lower = higher priority',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_agent_areas_agent
    FOREIGN KEY (agent_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_agent_areas_district
    FOREIGN KEY (district_id) REFERENCES districts(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_agent_areas_ward
    FOREIGN KEY (ward_id) REFERENCES wards(id)
    ON DELETE CASCADE,

  UNIQUE KEY uk_agent_area_unique (agent_id, district_id, ward_id),
  INDEX idx_agent_areas_lookup (district_id, ward_id, active, priority)
) ENGINE=InnoDB;

-- --------------------------
-- (4) EXTEND ORDERS WITH AREA INFO (SAFE)
-- NOTE: Nếu orders đã có các cột này rồi thì comment block này.
-- --------------------------
ALTER TABLE orders
  ADD COLUMN pickup_district_id INT NULL,
  ADD COLUMN pickup_ward_id INT NULL,
  ADD COLUMN routing_note VARCHAR(255) NULL;

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_pickup_district
    FOREIGN KEY (pickup_district_id) REFERENCES districts(id)
    ON DELETE SET NULL,
  ADD CONSTRAINT fk_orders_pickup_ward
    FOREIGN KEY (pickup_ward_id) REFERENCES wards(id)
    ON DELETE SET NULL;

CREATE INDEX idx_orders_pickup_area
  ON orders(pickup_district_id, pickup_ward_id);

-- --------------------------
-- (5) ROUTING STATUS (AUTO / FALLBACK)
-- NOTE: Nếu đã có routing_status thì comment dòng này.
-- --------------------------
ALTER TABLE orders
  ADD COLUMN routing_status ENUM('auto','fallback_admin')
    NOT NULL DEFAULT 'auto'
    COMMENT 'auto = system routed by area, fallback_admin = manual admin handling';

-- ==========================================================
-- (6) SEED: DISTRICTS (FULL)
-- ==========================================================
INSERT IGNORE INTO districts (name) VALUES
('Ba Đình'),
('Hoàn Kiếm'),
('Đống Đa'),
('Hai Bà Trưng'),
('Thanh Xuân'),
('Cầu Giấy'),
('Hoàng Mai'),
('Long Biên'),
('Nam Từ Liêm'),
('Bắc Từ Liêm'),
('Hà Đông'),
('Tây Hồ'),
('Thanh Trì'),
('Gia Lâm'),
('Hoài Đức'),
('Thị xã Sơn Tây'),
('Đan Phượng'),
('Đông Anh'),
('Mê Linh'),
('Phúc Thọ'),
('Quốc Oai'),
('Sóc Sơn'),
('Thường Tín'),
('Thanh Oai'),
('Ứng Hòa'),
('Mỹ Đức'),
('Ba Vì'),
('Chương Mỹ'),
('Thạch Thất'),
('Phú Xuyên');

-- ==========================================================
-- (7) SEED: WARDS (FULL) - from hanoi.json
-- ==========================================================
DROP TEMPORARY TABLE IF EXISTS tmp_ward_seed;

CREATE TEMPORARY TABLE tmp_ward_seed (
  district_name VARCHAR(100) NOT NULL,
  ward_name VARCHAR(100) NOT NULL,
  UNIQUE KEY uk_tmp (district_name, ward_name)
) ENGINE=InnoDB;

INSERT IGNORE INTO tmp_ward_seed (district_name, ward_name) VALUES
('Ba Đình','Phúc Xá'),
('Ba Đình','Trúc Bạch'),
('Ba Đình','Vĩnh Phúc'),
('Ba Đình','Cống Vị'),
('Ba Đình','Liễu Giai'),
('Ba Đình','Ngọc Khánh'),
('Ba Đình','Kim Mã'),
('Ba Đình','Giảng Võ'),
('Ba Đình','Thành Công'),
('Ba Đình','Ngọc Hà'),
('Ba Đình','Điện Biên'),
('Ba Đình','Đội Cấn'),
('Ba Đình','Quán Thánh'),
('Ba Đình','Nguyễn Trung Trực'),
('Hoàn Kiếm','Chương Dương'),
('Hoàn Kiếm','Cửa Đông'),
('Hoàn Kiếm','Cửa Nam'),
('Hoàn Kiếm','Đồng Xuân'),
('Hoàn Kiếm','Hàng Bạc'),
('Hoàn Kiếm','Hàng Bài'),
('Hoàn Kiếm','Hàng Bồ'),
('Hoàn Kiếm','Hàng Bông'),
('Hoàn Kiếm','Hàng Buồm'),
('Hoàn Kiếm','Hàng Đào'),
('Hoàn Kiếm','Hàng Gai'),
('Hoàn Kiếm','Hàng Mã'),
('Hoàn Kiếm','Hàng Trống'),
('Hoàn Kiếm','Lý Thái Tổ'),
('Hoàn Kiếm','Phan Chu Trinh'),
('Hoàn Kiếm','Phúc Tân'),
('Hoàn Kiếm','Trần Hưng Đạo'),
('Hoàn Kiếm','Tràng Tiền'),
('Đống Đa','Cát Linh'),
('Đống Đa','Giảng Võ'),
('Đống Đa','Hàng Bột'),
('Đống Đa','Khâm Thiên'),
('Đống Đa','Khương Thượng'),
('Đống Đa','Kim Liên'),
('Đống Đa','Láng Hạ'),
('Đống Đa','Láng Thượng'),
('Đống Đa','Nam Đồng'),
('Đống Đa','Ngã Tư Sở'),
('Đống Đa','Ô Chợ Dừa'),
('Đống Đa','Phương Liên'),
('Đống Đa','Phương Mai'),
('Đống Đa','Quang Trung'),
('Đống Đa','Quốc Tử Giám'),
('Đống Đa','Thịnh Quang'),
('Đống Đa','Thổ Quan'),
('Đống Đa','Trung Liệt'),
('Đống Đa','Trung Phụng'),
('Đống Đa','Trung Tự'),
('Đống Đa','Văn Chương'),
('Đống Đa','Văn Miếu'),
('Hai Bà Trưng','Bạch Đằng'),
('Hai Bà Trưng','Bạch Mai'),
('Hai Bà Trưng','Bách Khoa'),
('Hai Bà Trưng','Cầu Dền'),
('Hai Bà Trưng','Đống Mác'),
('Hai Bà Trưng','Đồng Nhân'),
('Hai Bà Trưng','Đồng Tâm'),
('Hai Bà Trưng','Lê Đại Hành'),
('Hai Bà Trưng','Minh Khai'),
('Hai Bà Trưng','Ngô Thì Nhậm'),
('Hai Bà Trưng','Nguyễn Du'),
('Hai Bà Trưng','Phạm Đình Hổ'),
('Hai Bà Trưng','Phố Huế'),
('Hai Bà Trưng','Quỳnh Lôi'),
('Hai Bà Trưng','Quỳnh Mai'),
('Hai Bà Trưng','Thanh Lương'),
('Hai Bà Trưng','Thanh Nhàn'),
('Hai Bà Trưng','Trương Định'),
('Hai Bà Trưng','Vĩnh Tuy'),
('Hai Bà Trưng','Bùi Thị Xuân'),
('Thanh Xuân','Hạ Đình'),
('Thanh Xuân','Khương Đình'),
('Thanh Xuân','Khương Mai'),
('Thanh Xuân','Khương Trung'),
('Thanh Xuân','Kim Giang'),
('Thanh Xuân','Nhân Chính'),
('Thanh Xuân','Phương Liệt'),
('Thanh Xuân','Thanh Xuân Bắc'),
('Thanh Xuân','Thanh Xuân Nam'),
('Thanh Xuân','Thanh Xuân Trung'),
('Thanh Xuân','Thượng Đình'),
('Cầu Giấy','Dịch Vọng'),
('Cầu Giấy','Dịch Vọng Hậu'),
('Cầu Giấy','Mai Dịch'),
('Cầu Giấy','Nghĩa Đô'),
('Cầu Giấy','Nghĩa Tân'),
('Cầu Giấy','Quan Hoa'),
('Cầu Giấy','Trung Hoà'),
('Cầu Giấy','Yên Hòa'),
('Hoàng Mai','Đại Kim'),
('Hoàng Mai','Định Công'),
('Hoàng Mai','Giáp Bát'),
('Hoàng Mai','Hoàng Liệt'),
('Hoàng Mai','Hoàng Văn Thụ'),
('Hoàng Mai','Lĩnh Nam'),
('Hoàng Mai','Mai Động'),
('Hoàng Mai','Tân Mai'),
('Hoàng Mai','Thanh Trì'),
('Hoàng Mai','Thịnh Liệt'),
('Hoàng Mai','Trần Phú'),
('Hoàng Mai','Tương Mai'),
('Hoàng Mai','Vĩnh Hưng'),
('Hoàng Mai','Yên Sở'),
('Long Biên','Bồ Đề'),
('Long Biên','Cự Khối'),
('Long Biên','Đức Giang'),
('Long Biên','Gia Thụy'),
('Long Biên','Giang Biên'),
('Long Biên','Long Biên'),
('Long Biên','Ngọc Lâm'),
('Long Biên','Ngọc Thụy'),
('Long Biên','Phúc Đồng'),
('Long Biên','Phúc Lợi'),
('Long Biên','Sài Đồng'),
('Long Biên','Thạch Bàn'),
('Long Biên','Thượng Thanh'),
('Long Biên','Việt Hưng'),
('Nam Từ Liêm','Cầu Diễn'),
('Nam Từ Liêm','Đại Mỗ'),
('Nam Từ Liêm','Mễ Trì'),
('Nam Từ Liêm','Mễ Trì Hạ'),
('Nam Từ Liêm','Mỹ Đình 1'),
('Nam Từ Liêm','Mỹ Đình 2'),
('Nam Từ Liêm','Phú Đô'),
('Nam Từ Liêm','Phương Canh'),
('Nam Từ Liêm','Tây Mỗ'),
('Nam Từ Liêm','Trung Văn'),
('Bắc Từ Liêm','Cổ Nhuế 1'),
('Bắc Từ Liêm','Cổ Nhuế 2'),
('Bắc Từ Liêm','Đông Ngạc'),
('Bắc Từ Liêm','Đức Thắng'),
('Bắc Từ Liêm','Liên Mạc'),
('Bắc Từ Liêm','Minh Khai'),
('Bắc Từ Liêm','Phú Diễn'),
('Bắc Từ Liêm','Phúc Diễn'),
('Bắc Từ Liêm','Tây Tựu'),
('Bắc Từ Liêm','Thượng Cát'),
('Bắc Từ Liêm','Thụy Phương'),
('Bắc Từ Liêm','Xuân Đỉnh'),
('Bắc Từ Liêm','Xuân Tảo'),
('Hà Đông','Biên Giang'),
('Hà Đông','Đồng Mai'),
('Hà Đông','Dương Nội'),
('Hà Đông','Hà Cầu'),
('Hà Đông','Kiến Hưng'),
('Hà Đông','La Khê'),
('Hà Đông','Mỗ Lao'),
('Hà Đông','Nguyễn Trãi'),
('Hà Đông','Phú La'),
('Hà Đông','Phú Lãm'),
('Hà Đông','Phúc La'),
('Hà Đông','Quang Trung'),
('Hà Đông','Vạn Phúc'),
('Hà Đông','Văn Khê'),
('Hà Đông','Văn Quán'),
('Hà Đông','Yết Kiêu'),
('Hà Đông','Yên Nghĩa'),
('Tây Hồ','Bưởi'),
('Tây Hồ','Nhật Tân'),
('Tây Hồ','Phú Thượng'),
('Tây Hồ','Quảng An'),
('Tây Hồ','Thụy Khuê'),
('Tây Hồ','Tứ Liên'),
('Tây Hồ','Xuân La'),
('Tây Hồ','Yên Phụ'),
('Thanh Trì ','Thị trấn Văn Điển'),
('Thanh Trì ','Tân Triều'),
('Thanh Trì ','Tả Thanh Oai'),
('Thanh Trì ','Hữu Hoà'),
('Thanh Trì ','Ngũ Hiệp'),
('Thanh Trì ','Ngọc Hồi'),
('Thanh Trì ','Vĩnh Quỳnh'),
('Thanh Trì ','Tam Hiệp'),
('Thanh Trì ','Liên Ninh'),
('Thanh Trì ','Đông Mỹ'),
('Thanh Trì ','Duyên Hà'),
('Thanh Trì ','Yên Mỹ'),
('Thanh Trì ','Tứ Hiệp'),
('Thanh Trì ','Thanh Liệt'),
('Thanh Trì ','Vạn Phúc'),
('Gia Lâm ','Thị trấn Trâu Quỳ'),
('Gia Lâm ','Bát Tràng'),
('Gia Lâm ','Cổ Bi'),
('Gia Lâm ','Đa Tốn'),
('Gia Lâm ','Đặng Xá'),
('Gia Lâm ','Đông Dư'),
('Gia Lâm ','Dương Xá'),
('Gia Lâm ','Dương Quang'),
('Gia Lâm ','Dương Hà'),
('Gia Lâm ','Kim Lan'),
('Gia Lâm ','Kim Sơn'),
('Gia Lâm ','Lệ Chi'),
('Gia Lâm ','Ninh Hiệp'),
('Gia Lâm ','Phù Đổng'),
('Gia Lâm ','Văn Đức'),
('Gia Lâm ','Yên Thường'),
('Gia Lâm ','Yên Viên'),
('Gia Lâm ','Đình Xuyên'),
('Hoài Đức ','Thị trấn Trạm Trôi'),
('Hoài Đức ','An Khánh'),
('Hoài Đức ','An Thượng'),
('Hoài Đức ','Dương Liễu'),
('Hoài Đức ','Đắc Sở'),
('Hoài Đức ','Đông La'),
('Hoài Đức ','Di Trạch'),
('Hoài Đức ','La Phù'),
('Hoài Đức ','Lại Yên'),
('Hoài Đức ','Minh Khai'),
('Hoài Đức ','Sơn Đồng'),
('Hoài Đức ','Song Phương'),
('Hoài Đức ','Tiền Yên'),
('Hoài Đức ','Vân Canh'),
('Hoài Đức ','Vân Côn'),
('Hoài Đức ','Yên Sở'),
('Hoài Đức ','Cát Quế'),
('Hoài Đức ','Đức Giang'),
('Hoài Đức ','Kim Chung'),
('Thị xã Sơn Tây','Lê Lợi'),
('Thị xã Sơn Tây','Ngô Quyền'),
('Thị xã Sơn Tây','Phú Thịnh'),
('Thị xã Sơn Tây','Quang Trung'),
('Thị xã Sơn Tây','Sơn Lộc'),
('Thị xã Sơn Tây','Trung Hưng'),
('Thị xã Sơn Tây','Viên Sơn'),
('Thị xã Sơn Tây','Xuân Khanh'),
('Thị xã Sơn Tây','Đường Lâm'),
('Thị xã Sơn Tây','Kim Sơn'),
('Thị xã Sơn Tây','Thanh Mỹ'),
('Thị xã Sơn Tây','Cổ Đông'),
('Thị xã Sơn Tây','Sơn Đông'),
('Thị xã Sơn Tây','Trung Sơn Trầm'),
('Đan Phượng','Thị trấn Phùng'),
('Đan Phượng','Đan Phượng'),
('Đan Phượng','Đồng Tháp'),
('Đan Phượng','Hạ Mỗ'),
('Đan Phượng','Hồng Hà'),
('Đan Phượng','Liên Hà'),
('Đan Phượng','Liên Hồng'),
('Đan Phượng','Liên Trung'),
('Đan Phượng','Phương Đình'),
('Đan Phượng','Song Phượng'),
('Đan Phượng','Tân Hội'),
('Đan Phượng','Tân Lập'),
('Đan Phượng','Thọ An'),
('Đan Phượng','Thọ Xuân'),
('Đan Phượng','Thượng Mỗ'),
('Đan Phượng','Trung Châu'),
('Đông Anh','Thị trấn Đông Anh'),
('Đông Anh','Bắc Hồng'),
('Đông Anh','Cổ Loa'),
('Đông Anh','Dục Tú'),
('Đông Anh','Đại Mạch'),
('Đông Anh','Đông Hội'),
('Đông Anh','Hải Bối'),
('Đông Anh','Kim Chung'),
('Đông Anh','Kim Nỗ'),
('Đông Anh','Liên Hà'),
('Đông Anh','Mai Lâm'),
('Đông Anh','Nam Hồng'),
('Đông Anh','Nguyên Khê'),
('Đông Anh','Tàm Xá'),
('Đông Anh','Thụy Lâm'),
('Đông Anh','Tiên Dương'),
('Đông Anh','Uy Nỗ'),
('Đông Anh','Vĩnh Ngọc'),
('Đông Anh','Việt Hùng'),
('Đông Anh','Võng La'),
('Đông Anh','Xuân Canh'),
('Đông Anh','Vân Nội'),
('Đông Anh','Tiên Hội'),
('Đông Anh','Xuân Nộn'),
('Mê Linh','Thị trấn Chi Đông'),
('Mê Linh','Thị trấn Quang Minh'),
('Mê Linh','Đại Thịnh'),
('Mê Linh','Hoàng Kim'),
('Mê Linh','Kim Hoa'),
('Mê Linh','Liên Mạc'),
('Mê Linh','Mê Linh'),
('Mê Linh','Tam Đồng'),
('Mê Linh','Thạch Đà'),
('Mê Linh','Thanh Lâm'),
('Mê Linh','Tiến Thắng'),
('Mê Linh','Tiến Thịnh'),
('Mê Linh','Tráng Việt'),
('Mê Linh','Tự Lập'),
('Mê Linh','Văn Khê'),
('Mê Linh','Vạn Yên'),
('Mê Linh','Tiền Phong'),
('Phúc Thọ','Thị trấn Phúc Thọ'),
('Phúc Thọ','Vân Hà'),
('Phúc Thọ','Vân Phúc'),
('Phúc Thọ','Vân Nam'),
('Phúc Thọ','Phúc Hòa'),
('Phúc Thọ','Hiệp Thuận'),
('Phúc Thọ','Liên Hiệp'),
('Phúc Thọ','Tam Hiệp'),
('Phúc Thọ','Thọ Lộc'),
('Phúc Thọ','Phụng Thượng'),
('Phúc Thọ','Phụng Châu'),
('Phúc Thọ','Sen Chiểu'),
('Phúc Thọ','Thanh Đa'),
('Phúc Thọ','Trạch Mỹ Lộc'),
('Phúc Thọ','Xuân Đình'),
('Phúc Thọ','Long Xuyên'),
('Phúc Thọ','Võng Xuyên'),
('Quốc Oai','Thị trấn Quốc Oai'),
('Quốc Oai','Cấn Hữu'),
('Quốc Oai','Cộng Hoà'),
('Quốc Oai','Đại Thành'),
('Quốc Oai','Đồng Quang'),
('Quốc Oai','Đông Yên'),
('Quốc Oai','Hoà Thạch'),
('Quốc Oai','Liệp Tuyết'),
('Quốc Oai','Ngọc Mỹ'),
('Quốc Oai','Ngọc Liệp'),
('Quốc Oai','Phú Cát'),
('Quốc Oai','Phú Mãn'),
('Quốc Oai','Phượng Cách'),
('Quốc Oai','Sài Sơn'),
('Quốc Oai','Tân Hòa'),
('Quốc Oai','Tân Phú'),
('Quốc Oai','Thạch Thán'),
('Quốc Oai','Yên Sơn'),
('Quốc Oai','Đắc Sở'),
('Quốc Oai','Tuyết Nghĩa'),
('Quốc Oai','Nghĩa Hương'),
('Sóc Sơn','Thị trấn Sóc Sơn'),
('Sóc Sơn','Bắc Sơn'),
('Sóc Sơn','Dân Hòa'),
('Sóc Sơn','Đông Xuân'),
('Sóc Sơn','Hiền Ninh'),
('Sóc Sơn','Hồng Kỳ'),
('Sóc Sơn','Kim Lũ'),
('Sóc Sơn','Mai Đình'),
('Sóc Sơn','Minh Phú'),
('Sóc Sơn','Minh Trí'),
('Sóc Sơn','Nam Sơn'),
('Sóc Sơn','Phù Linh'),
('Sóc Sơn','Phù Lỗ'),
('Sóc Sơn','Quang Tiến'),
('Sóc Sơn','Tân Dân'),
('Sóc Sơn','Tân Minh'),
('Sóc Sơn','Thanh Xuân'),
('Sóc Sơn','Tiên Dược'),
('Sóc Sơn','Trung Giã'),
('Sóc Sơn','Việt Long'),
('Sóc Sơn','Xuân Giang'),
('Sóc Sơn','Xuân Thu'),
('Sóc Sơn','Đức Hoà'),
('Sóc Sơn','Tiến Xuân'),
('Sóc Sơn','Hải Bối'),
('Thường Tín','Thị trấn Thường Tín'),
('Thường Tín','Chương Dương'),
('Thường Tín','Dũng Tiến'),
('Thường Tín','Duyên Thái'),
('Thường Tín','Hòa Bình'),
('Thường Tín','Hiền Giang'),
('Thường Tín','Hồng Vân'),
('Thường Tín','Khánh Hà'),
('Thường Tín','Lê Lợi'),
('Thường Tín','Liên Phương'),
('Thường Tín','Minh Cường'),
('Thường Tín','Nghiêm Xuyên'),
('Thường Tín','Ngọc Hòa'),
('Thường Tín','Nhị Khê'),
('Thường Tín','Ninh Sở'),
('Thường Tín','Quất Động'),
('Thường Tín','Thắng Lợi'),
('Thường Tín','Thống Nhất'),
('Thường Tín','Thư Phú'),
('Thường Tín','Tiền Phong'),
('Thường Tín','Tô Hiệu'),
('Thường Tín','Tự Nhiên'),
('Thường Tín','Vạn Điểm'),
('Thường Tín','Vân Tảo'),
('Thường Tín','Văn Bình'),
('Thường Tín','Văn Phú'),
('Thường Tín','Yên Mỹ'),
('Thường Tín','Hà Hồi'),
('Thường Tín','Văn Tự'),
('Thanh Oai','Thị trấn Kim Bài'),
('Thanh Oai','Bích Hòa'),
('Thanh Oai','Bình Minh'),
('Thanh Oai','Cao Dương'),
('Thanh Oai','Cao Viên'),
('Thanh Oai','Cự Khê'),
('Thanh Oai','Dân Hòa'),
('Thanh Oai','Đỗ Động'),
('Thanh Oai','Hồng Dương'),
('Thanh Oai','Kim An'),
('Thanh Oai','Kim Thư'),
('Thanh Oai','Liên Châu'),
('Thanh Oai','Mỹ Hưng'),
('Thanh Oai','Phương Trung'),
('Thanh Oai','Tam Hưng'),
('Thanh Oai','Tân Ước'),
('Thanh Oai','Thanh Cao'),
('Thanh Oai','Thanh Mai'),
('Thanh Oai','Thanh Thùy'),
('Thanh Oai','Xuân Dương'),
('Ứng Hòa','Thị trấn Vân Đình'),
('Ứng Hòa','Đại Hùng'),
('Ứng Hòa','Đông Lỗ'),
('Ứng Hòa','Đồng Tân'),
('Ứng Hòa','Đồng Tiến'),
('Ứng Hòa','Hòa Lâm'),
('Ứng Hòa','Hòa Xá'),
('Ứng Hòa','Hoa Sơn'),
('Ứng Hòa','Hồng Quang'),
('Ứng Hòa','Kim Đường'),
('Ứng Hòa','Liên Bạt'),
('Ứng Hòa','Lưu Hoàng'),
('Ứng Hòa','Minh Đức'),
('Ứng Hòa','Phương Tú'),
('Ứng Hòa','Quảng Phú Cầu'),
('Ứng Hòa','Sơn Công'),
('Ứng Hòa','Tảo Dương Văn'),
('Ứng Hòa','Trầm Lộng'),
('Ứng Hòa','Trường Thịnh'),
('Ứng Hòa','Trung Tú'),
('Ứng Hòa','Vạn Thái'),
('Ứng Hòa','Viên An'),
('Ứng Hòa','Viên Nội'),
('Ứng Hòa','Phù Lưu'),
('Ứng Hòa','Hồng Dương'),
('Mỹ Đức','Thị trấn Đại Nghĩa'),
('Mỹ Đức','An Mỹ'),
('Mỹ Đức','An Phú'),
('Mỹ Đức','Bột Xuyên'),
('Mỹ Đức','Đại Hưng'),
('Mỹ Đức','Đốc Tín'),
('Mỹ Đức','Hồng Sơn'),
('Mỹ Đức','Hợp Thanh'),
('Mỹ Đức','Hùng Tiến'),
('Mỹ Đức','Lê Thanh'),
('Mỹ Đức','Mỹ Thành'),
('Mỹ Đức','Phù Lưu Tế'),
('Mỹ Đức','Phùng Xá'),
('Mỹ Đức','Phúc Lâm'),
('Mỹ Đức','Thượng Lâm'),
('Mỹ Đức','Tuy Lai'),
('Mỹ Đức','Vạn Kim'),
('Mỹ Đức','Xuy Xá'),
('Mỹ Đức','Hợp Đồng'),
('Mỹ Đức','Thủ Lễ'),
('Ba Vì','Thị trấn Tây Đằng'),
('Ba Vì','Ba Trại'),
('Ba Vì','Ba Vì'),
('Ba Vì','Cẩm Lĩnh'),
('Ba Vì','Cam Thượng'),
('Ba Vì','Châu Sơn'),
('Ba Vì','Chu Minh'),
('Ba Vì','Cổ Đô'),
('Ba Vì','Đông Quang'),
('Ba Vì','Đồng Thái'),
('Ba Vì','Khánh Thượng'),
('Ba Vì','Minh Châu'),
('Ba Vì','Minh Quang'),
('Ba Vì','Phong Vân'),
('Ba Vì','Phú Châu'),
('Ba Vì','Phú Cường'),
('Ba Vì','Phú Đông'),
('Ba Vì','Phú Phương'),
('Ba Vì','Sơn Đà'),
('Ba Vì','Tản Hồng'),
('Ba Vì','Tản Lĩnh'),
('Ba Vì','Thái Hòa'),
('Ba Vì','Thuần Mỹ'),
('Ba Vì','Thụy An'),
('Ba Vì','Tiên Phong'),
('Ba Vì','Vạn Thắng'),
('Ba Vì','Vật Lại'),
('Ba Vì','Yên Bài'),
('Ba Vì','Vân Hòa'),
('Ba Vì','Tòng Bạt'),
('Chương Mỹ','Thị trấn Chúc Sơn'),
('Chương Mỹ','Thị trấn Xuân Mai'),
('Chương Mỹ','Đại Yên'),
('Chương Mỹ','Đồng Lạc'),
('Chương Mỹ','Đồng Phú'),
('Chương Mỹ','Đông Phương Yên'),
('Chương Mỹ','Đông Sơn'),
('Chương Mỹ','Hòa Chính'),
('Chương Mỹ','Hoàng Diệu'),
('Chương Mỹ','Hoàng Văn Thụ'),
('Chương Mỹ','Hợp Đồng'),
('Chương Mỹ','Hợp Tiến'),
('Chương Mỹ','Lam Điền'),
('Chương Mỹ','Mỹ Lương'),
('Chương Mỹ','Nam Phương Tiến'),
('Chương Mỹ','Ngọc Hòa'),
('Chương Mỹ','Phú Nam An'),
('Chương Mỹ','Phú Nghĩa'),
('Chương Mỹ','Phụng Châu'),
('Chương Mỹ','Quảng Bị'),
('Chương Mỹ','Tân Tiến'),
('Chương Mỹ','Thanh Bình'),
('Chương Mỹ','Thụy Hương'),
('Chương Mỹ','Thủy Xuân Tiên'),
('Chương Mỹ','Tiên Phương'),
('Chương Mỹ','Tốt Động'),
('Chương Mỹ','Trần Phú'),
('Chương Mỹ','Trung Hòa'),
('Chương Mỹ','Trường Yên'),
('Chương Mỹ','Hữu Văn'),
('Chương Mỹ','Thượng Vực'),
('Chương Mỹ','Chính Mỹ'),
('Thạch Thất','Thị trấn Liên Quan'),
('Thạch Thất','Bình Phú'),
('Thạch Thất','Bình Yên'),
('Thạch Thất','Cẩm Yên'),
('Thạch Thất','Cần Kiệm'),
('Thạch Thất','Canh Nậu'),
('Thạch Thất','Chàng Sơn'),
('Thạch Thất','Di Nậu'),
('Thạch Thất','Dị Nậu'),
('Thạch Thất','Đại Đồng'),
('Thạch Thất','Đồng Trúc'),
('Thạch Thất','Hạ Bằng'),
('Thạch Thất','Hương Ngải'),
('Thạch Thất','Kim Quan'),
('Thạch Thất','Lại Thượng'),
('Thạch Thất','Phú Kim'),
('Thạch Thất','Phùng Xá'),
('Thạch Thất','Tân Xã'),
('Thạch Thất','Thạch Hòa'),
('Thạch Thất','Thạch Xá'),
('Thạch Thất','Tiến Xuân'),
('Thạch Thất','Yên Bình'),
('Thạch Thất','Yên Trung'),
('Thạch Thất','Hữu Bằng'),
('Phú Xuyên','Thị trấn Phú Xuyên'),
('Phú Xuyên','Thị trấn Đại Xuyên'),
('Phú Xuyên','Bạch Hạ'),
('Phú Xuyên','Châu Can'),
('Phú Xuyên','Chuyên Mỹ'),
('Phú Xuyên','Đại Thắng'),
('Phú Xuyên','Đại Xuyên'),
('Phú Xuyên','Hoàng Long'),
('Phú Xuyên','Hồng Minh'),
('Phú Xuyên','Khải Phú'),
('Phú Xuyên','Minh Tân'),
('Phú Xuyên','Nam Phong'),
('Phú Xuyên','Nam Triều'),
('Phú Xuyên','Phú Túc'),
('Phú Xuyên','Phú Yên'),
('Phú Xuyên','Phúc Tiến'),
('Phú Xuyên','Phượng Dực'),
('Phú Xuyên','Quang Lãng'),
('Phú Xuyên','Quang Trung'),
('Phú Xuyên','Sơn Hà'),
('Phú Xuyên','Tân Dân'),
('Phú Xuyên','Tri Thủy'),
('Phú Xuyên','Tri Trung'),
('Phú Xuyên','Văn Hoàng'),
('Phú Xuyên','Văn Nhân'),
('Phú Xuyên','Vân Từ'),
('Phú Xuyên','Hồng Thái');

-- Insert wards by joining to districts (FK-safe)
INSERT IGNORE INTO wards (district_id, name)
SELECT d.id, t.ward_name
FROM tmp_ward_seed t
JOIN districts d ON d.name = t.district_name;

DROP TEMPORARY TABLE tmp_ward_seed;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- END AREA ROUTING EXTENSION (FULL HANOI SEED)
-- ==========================================================


INSERT INTO users (name, email, password, phone, role, status, created_at)
VALUES (
  'Guest Customer',
  'guest@system.local',
  '$2y$10$h6zB3/vRQnN5OYwdFbBTOegeEJ3xuW.9t0Vzx.xCDK6lJuxuIQS/G',
  '0000000000',
  'customer',
  'active',
  NOW()
);

CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reset_token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  UNIQUE KEY uk_reset_token (reset_token),
  INDEX idx_password_resets_user (user_id),
  INDEX idx_password_resets_expire (expires_at)
) ENGINE=InnoDB;



ALTER TABLE orders 
ADD COLUMN expected_delivery_date DATE NULL 
AFTER created_at;


CREATE TABLE notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('order', 'system', 'warning') NOT NULL DEFAULT 'order',
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- NOTIFICATION TEMPLATES (Seed data for template-driven notifications)
-- ==========================================================
INSERT INTO notification_templates (name, type, title_template, message_template) VALUES
-- OPERATIONAL / SYSTEM NOTIFICATIONS (event-driven)
('order_created', 'order', 'New order created', 'Order {order_code} has been created and requires review.'),
('order_approved', 'order', 'Order approved', 'Order {order_code} has been approved and assigned to you.'),
('order_assigned', 'order', 'New assigned order', 'You have a new order {order_code} assigned for pickup.'),
('order_delivered', 'order', 'Order delivered', 'Your order {order_code} has been delivered successfully.'),
('order_failed', 'warning', 'Order failed', 'Order {order_code} has failed delivery and requires attention.'),
('order_failed_agent', 'warning', 'Order delivery failed', 'Order {order_code} assigned to you has failed delivery.'),
-- MANUAL / ADMIN / PROMO NOTIFICATIONS (admin-triggered)
('admin_announcement', 'system', 'System Announcement', '{extra_message}'),
('promo_discount', 'system', 'Special Promotion', 'Great news! {extra_message}');


-- ==========================================================
-- SEEDING INSTRUCTIONS (Enterprise - 100% Consistent)
-- ==========================================================
-- IMPORTANT: All orders are seeded via procedure to ensure
-- 100% consistency and full workflow compliance.
--
-- Step 1: Seed agents (fixed by district)
-- CALL seed_agents(10);  -- Creates agents for key districts
--
-- Step 2: Seed shippers (small pool)
-- CALL seed_shippers(10);
--
-- Step 3: Seed customers
-- CALL seed_customers(50);
--
-- Step 4: Seed orders (all via procedure - NO manual inserts)
-- CALL seed_orders_past(30, 365);   -- 30 orders, spread over 12 months
-- CALL seed_orders_past(100, 730);  -- 100 orders, spread over 24 months
--
-- Step 5: Seed admin/promo notifications (optional - for demo)
-- CALL seed_admin_notifications(5);  -- 5 admin/promo notifications
--
-- Note: seed_orders_with_approvals() is only needed if you have
-- existing orders without approval records (should not happen
-- if all orders are seeded via seed_orders_past)
-- ==========================================================

-- ==========================================================
-- ONE-TIME FIX: Clean up ORDTEMP codes (run once after seed)
-- ==========================================================
-- This query fixes any ORDTEMP codes that may exist in the database
-- Format: ORD0101 (4-digit padding, matching runtime format)
UPDATE orders
SET order_code = CONCAT('ORD', LPAD(id, 4, '0'))
WHERE order_code LIKE 'ORDTEMP%'
   OR order_code NOT REGEXP '^ORD[0-9]{4}$';
-- ==========================================================