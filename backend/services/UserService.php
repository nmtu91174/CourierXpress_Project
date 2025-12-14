<?php
// backend/services/UserService.php

// dùng cho login / register / update / get users / disable // login.php // register.php // update_user.php // get_users.php // disable_user.php

require_once __DIR__ . "/../core/BaseService.php";

class UserService extends BaseService
{
    /* =====================================================
     * LOGIN
     * ===================================================== */
    public function login(string $email, string $password)
    {
        $stmt = $this->prepare(
            "SELECT id, name, email, password, role, phone, status
             FROM users
             WHERE email = ?"
        );
        $stmt->bind_param("s", $email);
        $stmt->execute();

        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            throw new Exception("Email không tồn tại");
        }

        $user = $result->fetch_assoc();

        if (!password_verify($password, $user["password"])) {
            throw new Exception("Sai mật khẩu");
        }

        if (isset($user["status"]) && $user["status"] === "inactive") {
            throw new Exception("Tài khoản đã bị khóa");
        }

        // update last login
        $update = $this->prepare(
            "UPDATE users SET last_login = NOW() WHERE id = ?"
        );
        $update->bind_param("i", $user["id"]);
        $update->execute();

        unset($user["password"]);
        return $user;
    }

    /* =====================================================
     * REGISTER
     * ===================================================== */
    public function register(array $data)
    {
        $name     = trim($data["name"]);
        $email    = trim($data["email"]);
        $password = $data["password"];
        $role     = $data["role"] ?? "customer";

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Email không hợp lệ");
        }

        $allowedRoles = ["admin", "agent", "shipper", "customer"];
        if (!in_array($role, $allowedRoles)) {
            $role = "customer";
        }

        // check email exists
        $check = $this->prepare(
            "SELECT id FROM users WHERE email = ?"
        );
        $check->bind_param("s", $email);
        $check->execute();
        $check->store_result();

        if ($check->num_rows > 0) {
            throw new Exception("Email đã được sử dụng");
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $insert = $this->prepare(
            "INSERT INTO users (name, email, password, role, status)
             VALUES (?, ?, ?, ?, 'active')"
        );
        $insert->bind_param("ssss", $name, $email, $hash, $role);
        $insert->execute();

        return [
            "id"    => $this->conn->insert_id,
            "name"  => $name,
            "email" => $email,
            "role"  => $role
        ];
    }

    /* =====================================================
     * UPDATE USER (admin / self)
     * ===================================================== */
    public function update(int $userId, array $data)
    {
        $fields = [];
        $params = [];
        $types  = "";

        if (!empty($data["name"])) {
            $fields[] = "name = ?";
            $params[] = $data["name"];
            $types   .= "s";
        }

        if (!empty($data["phone"])) {
            $fields[] = "phone = ?";
            $params[] = $data["phone"];
            $types   .= "s";
        }

        if (!empty($data["role"])) {
            $fields[] = "role = ?";
            $params[] = $data["role"];
            $types   .= "s";
        }

        if (!empty($data["status"])) {
            $fields[] = "status = ?";
            $params[] = $data["status"];
            $types   .= "s";
        }

        if (!empty($data["password"])) {
            $fields[] = "password = ?";
            $params[] = password_hash($data["password"], PASSWORD_DEFAULT);
            $types   .= "s";
        }

        if (empty($fields)) {
            throw new Exception("Không có dữ liệu để cập nhật");
        }

        $params[] = $userId;
        $types   .= "i";

        $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
        $stmt = $this->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        return true;
    }

    /* =====================================================
     * GET USERS (admin)
     * ===================================================== */
    public function getUsers(?string $role = null)
    {
        if ($role) {
            $stmt = $this->prepare(
                "SELECT id, name, email, role, phone, status, created_at
                 FROM users WHERE role = ?"
            );
            $stmt->bind_param("s", $role);
        } else {
            $stmt = $this->prepare(
                "SELECT id, name, email, role, phone, status, created_at
                 FROM users"
            );
        }

        $stmt->execute();
        $result = $stmt->get_result();

        return $result->fetch_all(MYSQLI_ASSOC);
    }

    /* =====================================================
     * DISABLE USER
     * ===================================================== */
    public function disable(int $userId)
    {
        $stmt = $this->prepare(
            "UPDATE users SET status = 'inactive' WHERE id = ?"
        );
        $stmt->bind_param("i", $userId);
        $stmt->execute();

        return true;
    }
}
