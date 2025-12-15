import "../../assets/styles/shipper/EditOrderShipper.css";

export default function EditOrderShipper() {
  const notAllowEdit = () => {
    alert("❌ Bạn không có quyền sửa thông tin này");
  };

  return (
    <div className="edit-order container my-5">
      <h2 className="mb-4 fw-bold">✏️ Sửa thông tin đơn hàng</h2>

      <div className="edit-card">
        <form>

          {/* ================= NGƯỜI GỬI ================= */}
          <h5 className="section-title mb-3">📦 Thông tin người gửi</h5>

          <div className="mb-3">
            <label className="form-label">Tên người gửi</label>
            <input
              type="text"
              className="form-control"
              defaultValue="Trần Văn B"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Số điện thoại người gửi</label>
            <input
              type="text"
              className="form-control"
              defaultValue="0912 333 444"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Địa chỉ người gửi</label>
            <textarea
              className="form-control"
              rows="2"
              defaultValue="12 Trần Duy Hưng, Cầu Giấy, Hà Nội"
              readOnly
              onClick={notAllowEdit}
            ></textarea>
          </div>

          {/* ================= NGƯỜI NHẬN ================= */}
          <h5 className="section-title mt-4 mb-3">🎯 Thông tin người nhận</h5>

          <div className="mb-3">
            <label className="form-label">Tên người nhận</label>
            <input
              type="text"
              className="form-control"
              defaultValue="Nguyễn Văn A"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Số điện thoại người nhận</label>
            <input
              type="text"
              className="form-control"
              defaultValue="0989 111 222"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Địa chỉ người nhận</label>
            <textarea
              className="form-control"
              rows="2"
              defaultValue="45 Nguyễn Trãi, Thanh Xuân, Hà Nội"
              readOnly
              onClick={notAllowEdit}
            ></textarea>
          </div>

          {/* ================= ĐƠN HÀNG ================= */}
          <h5 className="section-title mt-4 mb-3">📦 Thông tin đơn hàng</h5>

          <div className="mb-3">
            <label className="form-label">Cân nặng đơn hàng (kg)</label>
            <input
              type="number"
              className="form-control"
              defaultValue="2.5"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Ghi chú cho shipper</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Ví dụ: Giao giờ hành chính..."
            ></textarea>
          </div>

          {/* ================= THANH TOÁN ================= */}
          <h5 className="section-title mt-4 mb-3">💰 Thông tin thanh toán</h5>

          <div className="mb-3">
            <label className="form-label">Phí vận chuyển (VNĐ)</label>
            <input
              type="text"
              className="form-control"
              defaultValue="35,000"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Tiền thu hộ (COD)</label>
            <input
              type="text"
              className="form-control"
              defaultValue="250,000"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold text-danger">
              Tổng tiền cần thu khi giao
            </label>
            <input
              type="text"
              className="form-control"
              defaultValue="285,000 VNĐ"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <button className="btn btn-warning w-100 mt-4">
            💾 Lưu thay đổi
          </button>
        </form>
      </div>
    </div>
  );
}
