export default function ProfileStats({ user }) {
  return (
    <div className="stats-grid-pro viettel-stats">

      <div className="stat-card-pro">
        <span className="stat-label">Tổng đơn</span>
        <p className="stat-value">{user?.totalOrders ?? 0}</p>
      </div>

      <div className="stat-card-pro">
        <span className="stat-label">Đang giao</span>
        <p className="stat-value">{user?.inDelivery ?? 0}</p>
      </div>

      <div className="stat-card-pro">
        <span className="stat-label">Đã giao</span>
        <p className="stat-value">{user?.completed ?? 0}</p>
      </div>

      <div className="stat-card-pro">
        <span className="stat-label">Đã hủy</span>
        <p className="stat-value">{user?.canceled ?? 0}</p>
      </div>

    </div>
  );
}
