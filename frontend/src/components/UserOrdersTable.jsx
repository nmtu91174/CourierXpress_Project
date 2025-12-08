import userOrders from "../data/userOrders.json";

export default function UserOrdersTable() {
  const getStatusClass = (status) => {
    if (status === "Đã giao") return "status-success";
    if (status === "Đang giao") return "status-warning";
    if (status === "Đã hủy") return "status-danger";
    return "";
  };

  return (
    <div className="profile-card">
      <h4 className="mb-3">Đơn hàng gần đây</h4>

      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Người nhận</th>
            <th>Khu vực</th>
            <th>Ngày</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {userOrders.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.receiver}</td>
              <td>{order.area}</td>
              <td>{order.date}</td>
              <td>
                <span className={`status-pill ${getStatusClass(order.status)}`}>
                  {order.status}
                </span>
              </td>
              <td>
                <button className="btn btn-sm btn-outline-primary">
                  Xem chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
