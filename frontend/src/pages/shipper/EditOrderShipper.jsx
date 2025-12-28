import "../../assets/styles/shipper/EditOrderShipper.css";

export default function EditOrderShipper() {
  const notAllowEdit = () => {
    alert("❌ You do not have permission to edit this information");
  };

  return (
    <div className="edit-order container my-5">
      <h2 className="mb-4 fw-bold">✏️ Edit Order Information</h2>

      <div className="edit-card">
        <form>

          {/* ================= SENDER ================= */}
          <h5 className="section-title mb-3">📦 Sender Information</h5>

          <div className="mb-3">
            <label className="form-label">Sender Name</label>
            <input
              type="text"
              className="form-control"
              defaultValue="Trần Văn B"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Sender Phone</label>
            <input
              type="text"
              className="form-control"
              defaultValue="0912 333 444"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Sender Address</label>
            <textarea
              className="form-control"
              rows="2"
              defaultValue="12 Trần Duy Hưng, Cầu Giấy, Hà Nội"
              readOnly
              onClick={notAllowEdit}
            ></textarea>
          </div>

          {/* ================= RECEIVER ================= */}
          <h5 className="section-title mt-4 mb-3">🎯 Receiver Information</h5>

          <div className="mb-3">
            <label className="form-label">Receiver Name</label>
            <input
              type="text"
              className="form-control"
              defaultValue="Nguyễn Văn A"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Receiver Phone</label>
            <input
              type="text"
              className="form-control"
              defaultValue="0989 111 222"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Receiver Address</label>
            <textarea
              className="form-control"
              rows="2"
              defaultValue="45 Nguyễn Trãi, Thanh Xuân, Hà Nội"
              readOnly
              onClick={notAllowEdit}
            ></textarea>
          </div>

          {/* ================= ORDER ================= */}
          <h5 className="section-title mt-4 mb-3">📦 Order Information</h5>

          <div className="mb-3">
            <label className="form-label">Order Weight (kg)</label>
            <input
              type="number"
              className="form-control"
              defaultValue="2.5"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Notes for Shipper</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Example: Deliver during business hours..."
            ></textarea>
          </div>

          {/* ================= PAYMENT ================= */}
          <h5 className="section-title mt-4 mb-3">💰 Payment Information</h5>

          <div className="mb-3">
            <label className="form-label">Shipping Fee (VND)</label>
            <input
              type="text"
              className="form-control"
              defaultValue="35,000"
              readOnly
              onClick={notAllowEdit}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">COD Amount</label>
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
              Total Amount to Collect on Delivery
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
            💾 Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
