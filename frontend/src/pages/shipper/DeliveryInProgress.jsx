import { useState } from "react";
import "../../assets/styles/shipper/DeliveryInProgress.css";
import { FaCamera, FaCheckCircle, FaMapMarkerAlt } from "react-icons/fa";

export default function DeliveryInProgress() {
  const orders = [
    {
      id: "DH1001",
      address: "45 Nguyễn Trãi, Hà Nội",
      receiver: "Nguyễn Văn A",
      phone: "0989 111 222",
      status: "Đang giao"
    },
    {
      id: "DH1002",
      address: "52 Nguyễn Trãi, Hà Nội",
      receiver: "Trần Thị B",
      phone: "0977 888 999",
      status: "Đang giao"
    }
  ];

  const [images, setImages] = useState({});

  const handleImageChange = (orderId, file) => {
    if (file) {
      setImages(prev => ({
        ...prev,
        [orderId]: URL.createObjectURL(file)
      }));
    }
  };

  return (
    <div className="delivery-wrapper container my-5">
      <h2 className="delivery-title mb-4">🚚 Đơn hàng đang giao</h2>

      {orders.map(order => (
        <div key={order.id} className="delivery-block mb-5">

          {/* ORDER INFO */}
          <div className="delivery-card mb-3">
            <p><FaMapMarkerAlt /> <strong>Địa chỉ:</strong> {order.address}</p>
            <p><strong>Người nhận:</strong> {order.receiver}</p>
            <p><strong>SĐT:</strong> {order.phone}</p>
            <p><strong>Trạng thái:</strong> {order.status}</p>
          </div>

          {/* UPLOAD IMAGE */}
          <div className="delivery-upload mb-3">
            <label className="upload-box">
              <FaCamera size={28} />
              <span>Chụp ảnh xác nhận giao hàng</span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  handleImageChange(order.id, e.target.files[0])
                }
              />
            </label>

            {images[order.id] && (
              <div className="preview mt-3">
                <img src={images[order.id]} alt="Preview" />
              </div>
            )}
          </div>

          {/* COMPLETE BUTTON */}
          <button className="btn btn-success delivery-btn">
            <FaCheckCircle /> Đã giao thành công
          </button>

        </div>
      ))}
    </div>
  );
}
