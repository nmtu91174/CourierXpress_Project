<?php
$plain = "Shipper2024!";   // mật khẩu tạm
$hash = password_hash($plain, PASSWORD_DEFAULT);

echo "Plain: $plain\n";
echo "Hash:  $hash\n";