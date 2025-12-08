import { FaTruck, FaCheckCircle, FaTimesCircle, FaEye } from "react-icons/fa";
import orders from "../../data/userOrders.json";
import "../../assets/styles/user_profile.css";

export default function UserOrdersPagePro() {
  const getStatusMeta = (status) => {
    switch (status) {
      case "Đã giao":
        return { className: "order-status success", icon: <FaCheckCircle /> };
      case "Đang giao":
        return { className: "order-status warning", icon: <FaTruck /> };
      case "Đã hủy":
        return { className: "order-status danger", icon: <FaTimesCircle /> };
      default:
        return { className: "order-status", icon: null };
    }
  };

  return (
    <div className="profile-layout">
      <main className="profile-main">
        {/* Header */}
        <div className="orders-header">
          <h2>Đơn hàng của tôi</h2>
          <p className="text-muted">Theo dõi toàn bộ lịch sử giao hàng của bạn</p>
        </div>

        {/* Stats mini */}
        <div className="orders-stats">
          <div className="stat-card">
            <h5>Tổng đơn</h5>
            <p>{orders.length}</p>
          </div>
          <div className="stat-card success">
            <h5>Đã giao</h5>
            <p>{orders.filter(o => o.status === "Đã giao").length}</p>
          </div>
          <div className="stat-card warning">
            <h5>Đang giao</h5>
            <p>{orders.filter(o => o.status === "Đang giao").length}</p>
          </div>
          <div className="stat-card danger">
            <h5>Đã hủy</h5>
            <p>{orders.filter(o => o.status === "Đã hủy").length}</p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="profile-card mt-4">
          <table className="table table-hover align-middle orders-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Người nhận</th>
                <th>Khu vực</th>
                <th>Ngày</th>
                <th>Trạng thái</th>
                <th className="text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const meta = getStatusMeta(order.status);
                return (
                  <tr key={order.id}>
                    <td className="fw-bold">{order.id}</td>
                    <td>{order.receiver}</td>
                    <td>{order.area}</td>
                    <td>{order.date}</td>
                    <td>
                      <span className={meta.className}>
                        {meta.icon} {order.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-primary">
                        <FaEye /> Xem
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
