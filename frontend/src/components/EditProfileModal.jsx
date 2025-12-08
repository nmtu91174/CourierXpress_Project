import { useState } from "react";

export default function EditProfileModal({ user, setUser, onClose }) {
  const [form, setForm] = useState(user);
  const [preview, setPreview] = useState(user.avatar);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  //  XỬ LÝ CHỌN ẢNH
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Chỉ cho phép ảnh
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh!");
      return;
    }

    // Giới hạn 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert("Ảnh phải nhỏ hơn 2MB!");
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setPreview(imageUrl);
    setForm({
      ...form,
      avatar: imageUrl,
    });
  };

  const handleSave = () => {
    setUser(form);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        {/* ===== HEADER ===== */}
        <div className="modal-header">
          <h4>Chỉnh sửa hồ sơ</h4>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* ===== BODY ===== */}
        <div className="modal-body modal-grid">

  {/* ===== CỘT TRÁI: AVATAR ===== */}
  <div className="avatar-left">
    <img
      src={preview}
      alt="avatar"
      className="avatar-preview"
    />

    <label className="avatar-btn">
      Đổi ảnh đại diện
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={handleAvatarChange}
      />
    </label>
  </div>

  {/* ===== CỘT PHẢI: FORM ===== */}
  <div className="profile-form-right">

    <input name="name" value={form.name} onChange={handleChange} placeholder="Họ tên" />
    <input name="email" value={form.email} onChange={handleChange} placeholder="Email" />
    <input name="phone" value={form.phone} onChange={handleChange} placeholder="Điện thoại" />
    <input name="address" value={form.address} onChange={handleChange} placeholder="Địa chỉ" />

    <input name="area" value={form.area} onChange={handleChange} placeholder="Khu vực giao" />
    <input name="vehicle" value={form.vehicle} onChange={handleChange} placeholder="Biển số xe" />
    <input name="cccd" value={form.cccd} onChange={handleChange} placeholder="CCCD" />

    <input
      name="ngayThamGia"
      value={form.ngayThamGia}
      onChange={handleChange}
      placeholder="Ngày tham gia"
    />

    <div className="select-pro">
      <select name="role" value={form.role} onChange={handleChange}>
        <option value="Shipper">Shipper</option>
        <option value="Shipper chính thức">Shipper chính thức</option>
        <option value="Shipper tự do">Shipper tự do</option>
        <option value="Quản lý">Quản lý</option>
      </select>
    </div>

    <input name="phuongTien" value={form.phuongTien} onChange={handleChange} placeholder="Phương tiện" />

    <input
      name="khuVucPhuTrach"
      value={form.khuVucPhuTrach}
      onChange={handleChange}
      placeholder="Khu vực phụ trách"
    />

    <input
      name="taiKhoanNganHang"
      value={form.taiKhoanNganHang}
      onChange={handleChange}
      placeholder="Tài khoản ngân hàng"
    />

  </div>
</div>


        {/* ===== FOOTER ===== */}
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
