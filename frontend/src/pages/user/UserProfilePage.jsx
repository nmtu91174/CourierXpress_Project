import React, { useState } from "react";
import { useLocation } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import ProfileHeader from "../../components/ProfileHeader";
import ProfileStats from "../../components/ProfileStats";

import "../../assets/styles/user_profile.css";
import userDataJson from "../../data/userProfile.json";

export default function UserProfilePage() {
  const location = useLocation();
  const isActive = (path) => (location.pathname === path ? "active" : "");

  //  CHUYỂN DATA TĨNH → STATE
  const [userData, setUserData] = useState(userDataJson);

  return (
    <>

      <div className="admin-wrapper">
        <main className="admin-content full-dashboard">
          <div className="dashboard-grid">
            {/* ===== CỘT TRÁI ===== */}
            <div className="dashboard-main">
              <div className="dashboard-block">
                {/*  TRUYỀN setUserData XUỐNG */}
                <ProfileHeader user={userData} setUser={setUserData} />
              </div>

              <div className="dashboard-block">
                <ProfileStats user={userData} />
              </div>

              <div className="profile-info-pro">
                <h4>Thông tin cá nhân</h4>

                <div className="info-grid-pro">
                  <div><label>Email</label><p>{userData.email}</p></div>
                  <div><label>Điện thoại</label><p>{userData.phone}</p></div>
                  <div><label>Địa chỉ</label><p>{userData.address}</p></div>
                  <div><label>Khu vực giao</label><p>{userData.area}</p></div>
                  <div><label>Biển số xe</label><p>{userData.vehicle}</p></div>
                  <div><label>CCCD</label><p>{userData.cccd}</p></div>
                  <div><label>Ngày tham gia</label><p>{userData.ngayThamGia}</p></div>
                  <div><label>Cấp độ</label><p>{userData.capDo}</p></div>
                  <div><label>Phương tiện</label><p>{userData.phuongTien}</p></div>
                  <div><label>Khu vực phụ trách</label><p>{userData.khuVucPhuTrach}</p></div>
                  <div><label>Tài khoản ngân hàng</label><p>{userData.taiKhoanNganHang}</p></div>
                </div>
              </div>
            </div>

            {/* ===== CỘT PHẢI ===== */}
            <div className="dashboard-side">
              <div className="profile-card">
                <h5>Hoạt động gần đây</h5>
                <ul className="activity-list">
                  <li>Giao thành công đơn CX004</li>
                  <li>Nhận đơn mới CX005</li>
                  <li>Đang giao đơn CX002</li>
                </ul>
              </div>

              <div className="profile-card">
                <h5>Hiệu suất hôm nay</h5>
                <p>Đơn hoàn thành: <b>6</b></p>
                <p>Tỉ lệ thành công: <b>95%</b></p>
                <p>Thu nhập: <b>460.000đ</b></p>
              </div>

              <div className="profile-card">
                <h5>Bảo mật & tài khoản</h5>
                <p>Email: ✅ Đã xác thực</p>
                <p>CCCD: ✅ Đã duyệt</p>
                <p>Thiết bị: Windows 10 - Chrome</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
