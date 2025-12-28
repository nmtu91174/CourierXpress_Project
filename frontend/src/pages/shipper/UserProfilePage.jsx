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
                <h4>Personal Information</h4>

                <div className="info-grid-pro">
                  <div><label>Email</label><p>{userData.email}</p></div>
                  <div><label>Phone</label><p>{userData.phone}</p></div>
                  <div><label>Address</label><p>{userData.address}</p></div>
                  <div><label>Delivery Area</label><p>{userData.area}</p></div>
                  <div><label>Vehicle Plate</label><p>{userData.vehicle}</p></div>
                  <div><label>ID Card</label><p>{userData.cccd}</p></div>
                  <div><label>Join Date</label><p>{userData.ngayThamGia}</p></div>
                  <div><label>Level</label><p>{userData.capDo}</p></div>
                  <div><label>Vehicle</label><p>{userData.phuongTien}</p></div>
                  <div><label>Assigned Area</label><p>{userData.khuVucPhuTrach}</p></div>
                  <div><label>Bank Account</label><p>{userData.taiKhoanNganHang}</p></div>
                </div>
              </div>
            </div>

            {/* ===== CỘT PHẢI ===== */}
            <div className="dashboard-side">
              <div className="profile-card">
                <h5>Recent Activity</h5>
                <ul className="activity-list">
                  <li>Successfully delivered order CX004</li>
                  <li>Received new order CX005</li>
                  <li>Delivering order CX002</li>
                </ul>
              </div>

              <div className="profile-card">
                <h5>Today's Performance</h5>
                <p>Completed Orders: <b>6</b></p>
                <p>Success Rate: <b>95%</b></p>
                <p>Earnings: <b>460,000 VND</b></p>
              </div>

              <div className="profile-card">
                <h5>Security & Account</h5>
                <p>Email: ✅ Verified</p>
                <p>ID Card: ✅ Approved</p>
                <p>Device: Windows 10 - Chrome</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
