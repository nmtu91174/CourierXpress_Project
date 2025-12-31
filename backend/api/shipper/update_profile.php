<?php
// backend/api/shipper/update_profile.php
ob_clean(); // Xóa mọi ký tự lạ hoặc khoảng trắng trước khi output JSON
header('Content-Type: application/json');
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

$shipperId = (int)$GLOBALS["auth_user"]["id"];

// 1) Read JSON
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
  Response::error("Invalid JSON body");
}

// 2) Build UPDATE (WHITELIST)
$fields = [];
$params = [];
$types  = "";

// helper add field
$addField = function(string $sqlField, $value, string $type = "s") use (&$fields, &$params, &$types) {
  $fields[] = "$sqlField = ?";
  $params[] = $value;
  $types   .= $type;
};

// name
if (array_key_exists("name", $data)) {
  $name = trim((string)$data["name"]);
  if ($name !== "") $addField("name", $name, "s");
}

// phone
if (array_key_exists("phone", $data)) {
  $phone = trim((string)$data["phone"]);
  // cho phép rỗng để clear
  $addField("phone", ($phone === "" ? null : $phone), "s");
}

// address
if (array_key_exists("address", $data)) {
  $address = trim((string)$data["address"]);
  $addField("address", ($address === "" ? null : $address), "s");
}

// gender (ENUM) - CHỈ update nếu hợp lệ
if (array_key_exists("gender", $data)) {
  $gender = trim((string)$data["gender"]);
  if (in_array($gender, ["male", "female", "other"], true)) {
    $addField("gender", $gender, "s");
  }
  // rỗng hoặc khác 3 giá trị => bỏ qua, không update
}

// birthday (DATE) - rỗng => NULL
if (array_key_exists("birthday", $data)) {
  $birthday = trim((string)$data["birthday"]);
  if ($birthday === "") {
    $addField("birthday", null, "s");
  } else {
    // Expect YYYY-MM-DD
    $addField("birthday", $birthday, "s");
  }
}

// citizen_id
if (array_key_exists("citizen_id", $data)) {
  $cid = trim((string)$data["citizen_id"]);
  $addField("citizen_id", ($cid === "" ? null : $cid), "s");
}

// vehicle_plate
if (array_key_exists("vehicle_plate", $data)) {
  $plate = trim((string)$data["vehicle_plate"]);
  $addField("vehicle_plate", ($plate === "" ? null : $plate), "s");
}

if (count($fields) === 0) {
  Response::error("No valid fields to update");
}

// 3) Update
$sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ? AND role = 'shipper' LIMIT 1";
$params[] = $shipperId;
$types   .= "i";

$stmt = $conn->prepare($sql);
if (!$stmt) {
  Response::serverError("SQL prepare failed: " . $conn->error);
}

$stmt->bind_param($types, ...$params);

if (!$stmt->execute()) {
  Response::serverError("Update failed: " . $stmt->error);
}
$stmt->close();

// 4) Return fresh profile
$stmt2 = $conn->prepare("
  SELECT id, name, email, phone, address, avatar, gender, birthday, role, status,
         citizen_id, vehicle_plate, created_at, updated_at
  FROM users
  WHERE id = ?
  LIMIT 1
");
$stmt2->bind_param("i", $shipperId);
$stmt2->execute();
$profile = $stmt2->get_result()->fetch_assoc();
$stmt2->close();

$conn->close();

Response::success("Profile updated successfully", $profile);
