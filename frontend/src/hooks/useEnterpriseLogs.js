// frontend/src/hooks/useEnterpriseLogs.js
"use client";

import { useEffect, useState, useCallback } from "react";

/* =========================
 * Helpers
 * ========================= */
const parseTimeDisplay = (rawTime) => {
  if (!rawTime) return "";
  try {
    const cleaned = String(rawTime).replace(/\[|\]/g, "").trim();

    // Try Date parse
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Fallback: "YYYY-MM-DD HH:MM:SS"
    const match = cleaned.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (match) {
      const [datePart, timePart] = match.slice(1);
      const [hour, minute] = timePart.split(":");
      return `${datePart.split("-").reverse().join("/")} ${hour}:${minute}`;
    }

    return cleaned;
  } catch {
    return String(rawTime);
  }
};

const mapBusinessMessage = (technicalMessage) => {
  const msg = String(technicalMessage || "").toLowerCase();

  if (msg.includes("thiếu cấu hình đơn giá") || msg.includes("thiếu cấu hình")) {
    return "Hệ thống chưa sẵn sàng xử lý đơn. Vui lòng liên hệ quản trị viên để cấu hình phí vận chuyển.";
  }
  if (msg.includes("không thể phân công") || msg.includes("assign")) {
    return "Không thể phân công. Vui lòng kiểm tra lại trạng thái đơn hàng.";
  }
  if (msg.includes("foreign key") || msg.includes("constraint")) {
    return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại thông tin đơn hàng.";
  }
  if (msg.includes("không tồn tại") || msg.includes("not found")) {
    return "Không tìm thấy dữ liệu yêu cầu. Vui lòng thử lại.";
  }
  if (msg.includes("không có quyền") || msg.includes("permission")) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (msg.includes("đã tồn tại") || msg.includes("already exists")) {
    return "Dữ liệu đã tồn tại trong hệ thống.";
  }

  return technicalMessage;
};

const parseAuditNotifications = (content, limit = 10) => {
  const lines = String(content || "")
    .split("\n")
    .filter((l) => l.trim());

  return lines
    .slice(-20)
    .reverse()
    .slice(0, limit)
    .map((line) => {
      const timeMatch = line.match(/\[([^\]]+)\]/);
      const roleMatch = line.match(/role=(\w+)/);
      const actionMatch = line.match(/action=(\w+)/);
      const orderMatch = line.match(/order=(\d+)/);
      const noteMatch = line.match(/note=([^\n]+)/);

      const action = actionMatch ? actionMatch[1] : "";
      const orderId = orderMatch ? orderMatch[1] : null;
      const note = noteMatch ? noteMatch[1].trim() : "";
      const role = roleMatch ? roleMatch[1] : "";

      const orderCode =
        note && note.startsWith("ORD")
          ? note
          : orderId
          ? `ORD${String(orderId).padStart(4, "0")}`
          : null;

      let message = "";
      switch (action) {
        case "CREATE_ORDER":
          message = orderCode ? `Đã tạo đơn hàng #${orderCode}` : "Đã tạo đơn hàng";
          break;
        case "UPDATE_STATUS":
          message = orderCode ? `Đã cập nhật trạng thái đơn #${orderCode}` : "Đã cập nhật trạng thái";
          break;
        case "ASSIGN_SHIPPER":
          message = orderCode ? `Đã phân công shipper cho đơn #${orderCode}` : "Đã phân công shipper";
          break;
        case "ASSIGN_AGENT":
          message = orderCode ? `Đã phân công agent cho đơn #${orderCode}` : "Đã phân công agent";
          break;
        case "DELETE_ORDER":
          message = orderCode ? `Đã xóa đơn #${orderCode}` : "Đã xóa đơn";
          break;
        case "LOGIN":
          message = `${role === "admin" ? "Admin" : role === "agent" ? "Đại lý" : role === "shipper" ? "Shipper" : "Người dùng"} đã đăng nhập`;
          break;
        case "REGISTER":
          message = `${role === "admin" ? "Admin" : role === "agent" ? "Đại lý" : role === "shipper" ? "Shipper" : "Khách hàng"} đã tạo tài khoản`;
          break;
        case "RESET_PASSWORD":
          message = "Đã cập nhật mật khẩu";
          break;
        case "UPDATE_USER":
          message = "Đã cập nhật thông tin người dùng";
          break;
        case "CONFIRM_PICKUP":
          message = orderCode ? `Shipper đã xác nhận lấy hàng #${orderCode}` : "Shipper đã xác nhận lấy hàng";
          break;
        case "CONFIRM_DELIVERY":
          message = orderCode ? `Shipper đã giao hàng thành công #${orderCode}` : "Shipper đã giao hàng thành công";
          break;
        default:
          message = note || action || "Hành động hệ thống";
      }

      return {
        time: timeMatch ? timeMatch[1] : "",
        timeDisplay: parseTimeDisplay(timeMatch ? timeMatch[1] : ""),
        event: action,
        message,
        orderId,
        orderCode,
        note,
      };
    });
};

const parseAppLogs = (content, perTypeLimit = 10) => {
  const lines = String(content || "")
    .split("\n")
    .filter((l) => l.trim());

  const systemErrors = [];
  const businessErrors = [];

  lines
    .filter((line) => line.includes("[ERROR]"))
    .slice(-50)
    .reverse()
    .forEach((line) => {
      const timeMatch = line.match(/\[([^\]]+)\]/);
      const errorMatch = line.match(/\[ERROR\]\s*(.+)/);

      const message = errorMatch ? errorMatch[1].trim() : line;
      const businessMessage = mapBusinessMessage(message);
      const isBusiness = businessMessage !== message;

      const entry = {
        time: timeMatch ? timeMatch[1] : "",
        timeDisplay: parseTimeDisplay(timeMatch ? timeMatch[1] : ""),
        message,
        businessMessage,
        fullMessage: line,
      };

      if (isBusiness) businessErrors.push(entry);
      else systemErrors.push(entry);
    });

  return {
    systemLogs: systemErrors.slice(0, perTypeLimit),
    businessLogs: businessErrors.slice(0, perTypeLimit),
  };
};

/* =========================
 * Hook
 * ========================= */
export default function useEnterpriseLogs({
  baseUrl = "http://localhost:8888",
  refreshMs = 30000,
  auditLines = 20,
  appLines = 100,
} = {}) {
  const [notifications, setNotifications] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [businessLogs, setBusinessLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);

      // Audit -> notifications
      const auditRes = await fetch(
        `${baseUrl}/api/admin/view_logs.php?type=audit&lines=${auditLines}`,
        { method: "GET", credentials: "include" }
      );
      if (auditRes.ok) {
        const auditJson = await auditRes.json();
        if (auditJson?.status === "success" && auditJson?.data?.content) {
          setNotifications(parseAuditNotifications(auditJson.data.content, 10));
        } else {
          setNotifications([]);
        }
      }

      // App -> system/business
      const appRes = await fetch(
        `${baseUrl}/api/admin/view_logs.php?type=app&lines=${appLines}`,
        { method: "GET", credentials: "include" }
      );
      if (appRes.ok) {
        const appJson = await appRes.json();
        if (appJson?.status === "success" && appJson?.data?.content) {
          const { systemLogs, businessLogs } = parseAppLogs(appJson.data.content, 10);
          setSystemLogs(systemLogs);
          setBusinessLogs(businessLogs);
        } else {
          setSystemLogs([]);
          setBusinessLogs([]);
        }
      }
    } catch (e) {
      console.error("Logs fetch error:", e);
    } finally {
      setLoadingLogs(false);
    }
  }, [baseUrl, auditLines, appLines]);

  useEffect(() => {
    fetchLogs();
    const t = setInterval(fetchLogs, refreshMs);
    return () => clearInterval(t);
  }, [fetchLogs, refreshMs]);

  return { notifications, systemLogs, businessLogs, loadingLogs, refetchLogs: fetchLogs };
}
