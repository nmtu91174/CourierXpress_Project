<?php
/**
 * Response.php
 * ------------------------------------
 * Chuẩn hóa JSON response cho toàn bộ API
 * Dùng cho success / error / validation
 */

class Response
{
    /**
     * Trả về response thành công
     *
     * @param string $message Thông báo
     * @param mixed  $data    Dữ liệu trả về
     * @param int    $code    HTTP status code
     */
    public static function success($message = "Success", $data = null, $code = 200)
    {
        http_response_code($code);
        header("Content-Type: application/json; charset=utf-8");

        echo json_encode([
            "status"  => "success",
            "message" => $message,
            "data"    => $data
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    /**
     * Trả về JSON response tùy chỉnh
     *
     * @param array $data Dữ liệu trả về
     * @param int   $code HTTP status code
     */
    public static function json(array $data, $code = 200)
    {
        http_response_code($code);
        header("Content-Type: application/json; charset=utf-8");

        echo json_encode($data, JSON_UNESCAPED_UNICODE);

        exit;
    }

    /**
     * Trả về response lỗi chung
     *
     * @param string $message Thông báo lỗi
     * @param int    $code    HTTP status code
     */
    public static function error($message = "Error", $code = 400)
    {
        http_response_code($code);
        header("Content-Type: application/json; charset=utf-8");

        echo json_encode([
            "status"  => "error",
            "message" => $message
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    /**
     * Trả về lỗi validate input
     *
     * @param array $errors Danh sách lỗi
     */
    public static function validation(array $errors)
    {
        http_response_code(422);
        header("Content-Type: application/json; charset=utf-8");

        echo json_encode([
            "status" => "error",
            "message" => "Validation failed",
            "errors" => $errors
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    /**
     * Trả về lỗi unauthorized
     */
    public static function unauthorized($message = "Unauthorized")
    {
        http_response_code(401);
        header("Content-Type: application/json; charset=utf-8");

        echo json_encode([
            "status"  => "error",
            "message" => $message
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    /**
     * Trả về lỗi forbidden (không đủ quyền)
     */
    public static function forbidden($message = "Forbidden")
    {
        http_response_code(403);
        header("Content-Type: application/json; charset=utf-8");

        echo json_encode([
            "status"  => "error",
            "message" => $message
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    /**
     * Trả về lỗi server
     */
    public static function serverError($message = "Internal Server Error")
    {
        http_response_code(500);
        header("Content-Type: application/json; charset=utf-8");

        echo json_encode([
            "status"  => "error",
            "message" => $message
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }
}
