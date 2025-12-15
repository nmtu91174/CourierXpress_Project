import { useState } from "react";
import "../../assets/styles/shipper/OrderHistoryShipper.css";

export default function OrderHistoryShipper() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState("all");

  const orders = [
    {
      id: "DH001",
      customerName: "Nguyễn Văn A",
      phone: "0987123456",
      from: "Kho Hà Đông",
      to: "12 Trần Duy Hưng, Hà Nội",
      status: "Đã giao",
      date: "15/12/2025"
    },
    {
      id: "DH002",
      customerName: "Trần Thị B",
      phone: "0912345678",
      from: "Kho Cầu Giấy",
      to: "88 Láng Hạ, Hà Nội",
      status: "Đã giao",
      date: "14/12/2025"
    },
    {
      id: "DH003",
      customerName: "Lê Văn C",
      phone: "0909998888",
      from: "Kho Long Biên",
      to: "20 Cầu Giấy, Hà Nội",
      status: "Hủy",
      reason: "Không liên lạc được với người nhận",
      date: "13/12/2025"
    },
    {
      id: "DH004",
      customerName: "Phạm Minh D",
      phone: "0977112233",
      from: "Kho Mỹ Đình",
      to: "Hoàng Mai, Hà Nội",
      status: "Đã giao",
      date: "12/12/2025"
    },
    {
      id: "DH005",
      customerName: "Hoàng Thị E",
      phone: "0966887766",
      from: "Kho Thanh Xuân",
      to: "Nam Từ Liêm, Hà Nội",
      status: "Hủy",
      reason: "Người gửi yêu cầu hủy đơn",
      date: "12/12/2025"
    },
    {
      id: "DH006",
      customerName: "Vũ Anh F",
      phone: "0944556677",
      from: "Kho Bắc Từ Liêm",
      to: "Tây Hồ, Hà Nội",
      status: "Đã giao",
      date: "11/12/2025"
    },
    {
      id: "DH007",
      customerName: "Đặng Thu G",
      phone: "0933445566",
      from: "Kho Gia Lâm",
      to: "Gia Lâm, Hà Nội",
      status: "Đã giao",
      date: "11/12/2025"
    },
    {
      id: "DH008",
      customerName: "Bùi Văn H",
      phone: "0922113344",
      from: "Kho Đông Anh",
      to: "Sóc Sơn, Hà Nội",
      status: "Hủy",
      reason: "Sai địa chỉ người nhận",
      date: "10/12/2025"
    },
    {
      id: "DH009",
      customerName: "Nguyễn Thị I",
      phone: "0977889900",
      from: "Kho Hoàng Mai",
      to: "Thanh Trì, Hà Nội",
      status: "Đã giao",
      date: "10/12/2025"
    },
    {
      id: "DH010",
      customerName: "Trần Văn K",
      phone: "0911223344",
      from: "Kho Hai Bà Trưng",
      to: "Hai Bà Trưng, Hà Nội",
      status: "Đã giao",
      date: "09/12/2025"
    },
    {
      id: "DH011",
      customerName: "Phạm Thị L",
      phone: "0966001122",
      from: "Kho Ba Đình",
      to: "Ba Đình, Hà Nội",
      status: "Hủy",
      reason: "Khách từ chối nhận hàng",
      date: "09/12/2025"
    },
    {
      id: "DH012",
      customerName: "Ngô Văn M",
      phone: "0988332211",
      from: "Kho Thanh Oai",
      to: "Thanh Oai, Hà Nội",
      status: "Đã giao",
      date: "08/12/2025"
    },
    {
      id: "DH013",
      customerName: "Lý Thị N",
      phone: "0933778899",
      from: "Kho Quốc Oai",
      to: "Quốc Oai, Hà Nội",
      status: "Đã giao",
      date: "08/12/2025"
    },
    {
      id: "DH014",
      customerName: "Đỗ Văn O",
      phone: "0955667788",
      from: "Kho Sơn Tây",
      to: "Sơn Tây, Hà Nội",
      status: "Hủy",
      reason: "Hàng hóa bị hư hỏng",
      date: "07/12/2025"
    },
    {
      id: "DH015",
      customerName: "Mai Thị P",
      phone: "0977009988",
      from: "Kho Phúc Thọ",
      to: "Phúc Thọ, Hà Nội",
      status: "Đã giao",
      date: "07/12/2025"
    }
  ];

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter(order => order.status === filter);

  return (
    <div className="order-history container my-5">
      <h2 className="title">📦 Lịch sử đơn hàng</h2>

      {/* FILTER BUTTONS */}
      <div className="filter-group">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Tất cả
        </button>
        <button
          className={filter === "Đã giao" ? "active" : ""}
          onClick={() => setFilter("Đã giao")}
        >
          Đã giao
        </button>
        <button
          className={filter === "Hủy" ? "active" : ""}
          onClick={() => setFilter("Hủy")}
        >
          Đã hủy
        </button>
      </div>

      <div className="row g-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="col-md-4">
            <div
              className="history-card"
              onClick={() => setSelectedOrder(order)}
            >
              <h5>#{order.id}</h5>
              <p>{order.to}</p>
              <span className={`status ${order.status === "Đã giao" ? "done" : "cancel"}`}>
                {order.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selectedOrder && (
        <div className="order-modal">
          <div className="modal-content">
            <h4>Chi tiết đơn #{selectedOrder.id}</h4>

            <p><strong>Khách hàng:</strong> {selectedOrder.customerName}</p>
            <p><strong>SĐT:</strong> {selectedOrder.phone}</p>
            <p><strong>Địa chỉ gửi:</strong> {selectedOrder.from}</p>
            <p><strong>Địa chỉ nhận:</strong> {selectedOrder.to}</p>
            <p><strong>Ngày:</strong> {selectedOrder.date}</p>
            <p><strong>Trạng thái:</strong> {selectedOrder.status}</p>

            {selectedOrder.status === "Hủy" && (
              <p className="cancel-reason">
                <strong>Lý do hủy:</strong> {selectedOrder.reason}
              </p>
            )}

            <button onClick={() => setSelectedOrder(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
