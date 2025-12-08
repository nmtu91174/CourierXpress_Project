export default function ProfileInfo({ user }) {
  return (
    <div className="profile-info-pro viettel-profile-form">

      <div className="viettel-form-header">
        <h4>Thông tin cá nhân</h4>
      </div>

      <div className="viettel-form-grid">

        <div className="viettel-form-item">
          <label>Email</label>
          <input type="text" value={user.email} disabled />
        </div>

        <div className="viettel-form-item">
          <label>Điện thoại</label>
          <input type="text" value={user.phone} disabled />
        </div>

        <div className="viettel-form-item">
          <label>Địa chỉ</label>
          <input type="text" value={user.address} disabled />
        </div>

        <div className="viettel-form-item">
          <label>Khu vực giao</label>
          <input type="text" value={user.area} disabled />
        </div>

        <div className="viettel-form-item">
          <label>Biển số xe</label>
          <input type="text" value={user.vehicle} disabled />
        </div>

      </div>
    </div>
  );
}
