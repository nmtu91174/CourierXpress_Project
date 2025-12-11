import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, ShoppingCart } from "lucide-react";
import "../../assets/styles/auth/Option.css";

export default function LandingPage() {
  const [hoveredSide, setHoveredSide] = useState(null);
  const navigate = useNavigate();

  const handleStart = (role) => {
    navigate(`/register?role=${role}`);
  };

  return (
    <div className="landing-container">
      {/* Backgrounds */}
      <div
        className={`bg-left ${hoveredSide === "left" ? "scale-110" : hoveredSide === "right" ? "scale-95" : "scale-100"}`}
        style={{ backgroundImage: 'url("https://cdn-media.sforum.vn/storage/app/media/wp-content/uploads/2024/01/Shipper-la-gi-thumbnail.jpg")' }}
      />
      <div
        className={`bg-right ${hoveredSide === "right" ? "scale-110" : "scale-100"}`}
        style={{ backgroundImage: 'url("https://indochinapost.vn/wp-content/uploads/2018/06/giao-hang-thu-tien.jpg")' }}
      />

      {/* Left Section */}
      <div
        className={`section-link section-link-left ${hoveredSide === "right" ? "dimmed" : "full"} ${hoveredSide === "left" ? "hovered" : ""}`}
        onMouseEnter={() => setHoveredSide("left")}
        onMouseLeave={() => setHoveredSide(null)}
      >
        <div className="overlay" />
        <div className={`${hoveredSide === "left" ? "hovered" : ""}`}>
          <Package strokeWidth={1.5} size={64} color="rgba(255,255,255,0.9)" />
        </div>
        <h1>Shipper</h1>
        <p>Quản lý đơn hàng và giao vận hiệu quả</p>
        <button
          className="btn-start text-white"
          onClick={() => handleStart("shipper")}
        >
          Start
        </button>
        <div className="stats">
          <div>
            <p>24/7</p>
            <p>Hỗ trợ</p>
          </div>
          <div className="divider"></div>
          <div>
            <p>500+</p>
            <p>Đối tác</p>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div
        className={`section-link section-link-right ${hoveredSide === "left" ? "dimmed" : "full"} ${hoveredSide === "right" ? "hovered" : ""}`}
        onMouseEnter={() => setHoveredSide("right")}
        onMouseLeave={() => setHoveredSide(null)}
      >
        <div className="overlay" />
        <div className={`${hoveredSide === "right" ? "hovered" : ""}`}>
          <ShoppingCart strokeWidth={1.5} size={64} color="rgba(255,255,255,0.9)" />
        </div>
        <h1>Khách Hàng</h1>
        <p>Đặt hàng và theo dõi vận chuyển dễ dàng</p>
        <button
          className="btn-start text-white"
          onClick={() => handleStart("customer")}
        >
          Start
        </button>
        <div className="stats">
          <div>
            <p>100K+</p>
            <p>Khách hàng</p>
          </div>
          <div className="divider"></div>
          <div>
            <p>99.8%</p>
            <p>Độ chính xác</p>
          </div>
        </div>
      </div>
    </div>
  );
}
