// frontend/src/pages/admin/UserIdentityDashboard.jsx
// Enterprise Identity Dashboard - DQN Luxury

import React, { useState, useEffect } from "react";
import { Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "../../hooks/useUserProfile";
import { userService } from "../../services/user.service";
import IdentityCard from "../../components/user-identity/IdentityCard";
import IdentityMainPanel from "../../components/user-identity/IdentityMainPanel";
import "../../assets/styles/user_identity_dashboard.css";

/**
 * UserIdentityDashboard
 * 
 * Enterprise Identity Dashboard for Admin/Agent (loaded in AdminLayout)
 * 
 * Layout:
 * - AdminLayout has the ONLY sidebar (navigation)
 * - This page uses full-width layout:
 *   - TOP: Identity Card (full-width, similar to quick action cards)
 *   - BELOW: All sections full-width (Personal Information, System Overview, Security, etc.)
 * 
 * Answers: "Who am I in this system?"
 */
export default function UserIdentityDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Check authentication (supports all roles now)
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }
    // Role-based routing handled by ProtectedRoute
  }, [navigate]);

  // Get current user ID from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const userId = currentUser?.id || null;

  // Use profile hook
  const { user, loading, error, updateProfile, refresh } = useUserProfile(userId);
  
  // Get user role for CSS targeting (use user from hook if available, otherwise fallback to localStorage)
  const userRole = user?.role?.toLowerCase() || currentUser?.role?.toLowerCase() || "";

  // Load stats from real API (role-based)
  useEffect(() => {
    if (user?.id && user?.role) {
      setStatsLoading(true);
      const role = user.role.toLowerCase();
      
      // Admin: Use get_order_stats.php
      if (role === "admin") {
        fetch("http://localhost:8888/api/admin/get_order_stats.php", {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "success") {
              const statsData = data.data || {};
              setStats({
                total_orders: statsData.total_orders || 0,
                in_transit: statsData.in_transit || 0,
                delivered: statsData.delivered || 0,
                failed: statsData.failed || 0,
                total_revenue: statsData.total_revenue || 0,
                success_rate: statsData.success_rate || "0%",
              });
            }
          })
          .catch((err) => {
            console.error("Failed to load admin stats:", err);
            setStats({ total_orders: 0, in_transit: 0, delivered: 0, failed: 0 });
          })
          .finally(() => {
            setStatsLoading(false);
          });
      }
      // Agent: Fetch orders assigned to this agent
      else if (role === "agent") {
        fetch(`http://localhost:8888/api/admin/get_orders.php?page=1&limit=1000&agent_id=${user.id}`, {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "success") {
              const orders = data.data?.items || data.data || [];
              const total = orders.length;
              const inTransit = orders.filter((o) => [3, 4].includes(Number(o.status))).length; // ASSIGNED, PICKED_UP
              const delivered = orders.filter((o) => Number(o.status) === 5).length;
              const failed = orders.filter((o) => Number(o.status) === 6).length;
              
              setStats({
                total_orders: total,
                in_transit: inTransit,
                delivered: delivered,
                failed: failed,
              });
            }
          })
          .catch((err) => {
            console.error("Failed to load agent stats:", err);
            setStats({ total_orders: 0, in_transit: 0, delivered: 0, failed: 0 });
          })
          .finally(() => {
            setStatsLoading(false);
          });
      }
      // Customer: Fetch orders created by this user
      else if (role === "customer") {
        fetch(`http://localhost:8888/api/admin/get_orders.php?page=1&limit=1000&customer_id=${user.id}`, {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "success") {
              const orders = data.data?.items || data.data || [];
              const total = orders.length;
              const inTransit = orders.filter((o) => [3, 4].includes(Number(o.status))).length;
              const delivered = orders.filter((o) => Number(o.status) === 5).length;
              const failed = orders.filter((o) => Number(o.status) === 6).length;
              
              setStats({
                total_orders: total,
                in_transit: inTransit,
                delivered: delivered,
                failed: failed,
              });
            }
          })
          .catch((err) => {
            console.error("Failed to load customer stats:", err);
            setStats({ total_orders: 0, in_transit: 0, delivered: 0, failed: 0 });
          })
          .finally(() => {
            setStatsLoading(false);
          });
      }
      // Shipper: Fetch orders assigned to this shipper
      else if (role === "shipper") {
        fetch(`http://localhost:8888/api/admin/get_orders.php?page=1&limit=1000&shipper_id=${user.id}`, {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "success") {
              const orders = data.data?.items || data.data || [];
              const total = orders.length;
              const inTransit = orders.filter((o) => [3, 4].includes(Number(o.status))).length;
              const delivered = orders.filter((o) => Number(o.status) === 5).length;
              const failed = orders.filter((o) => Number(o.status) === 6).length;
              
              const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) + "%" : "0%";
              
              setStats({
                total_orders: total,
                in_transit: inTransit,
                delivered: delivered,
                failed: failed,
                success_rate: successRate,
              });
            }
          })
          .catch((err) => {
            console.error("Failed to load shipper stats:", err);
            setStats({ total_orders: 0, in_transit: 0, delivered: 0, failed: 0, success_rate: "0%" });
          })
          .finally(() => {
            setStatsLoading(false);
          });
      }
    }
  }, [user]);

  // Handle profile update (with optional avatar file)
  const handleUpdateProfile = async (data, avatarFile = null) => {
    try {
      if (avatarFile) {
        // Use FormData upload with avatar
        const formData = new FormData();
        formData.append("user_id", user.id.toString());
        if (data.name) formData.append("name", data.name);
        if (data.phone) formData.append("phone", data.phone);
        if (data.address !== undefined) formData.append("address", data.address || "");
        formData.append("avatar", avatarFile);

        const response = await fetch("http://localhost:8888/api/users/update_user.php", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const result = await response.json();
        if (result.status !== "success") {
          throw new Error(result.message || "Failed to update profile");
        }

        // Update localStorage with returned user data (includes updated avatar URL)
        if (result.data) {
          const updatedUserData = result.data;
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (currentUser.id === user.id) {
            if (updatedUserData.name) currentUser.name = updatedUserData.name;
            if (updatedUserData.address !== undefined) currentUser.address = updatedUserData.address || "";
            if (updatedUserData.phone !== undefined) currentUser.phone = updatedUserData.phone || "";
            if (updatedUserData.avatar) {
              // Ensure avatar URL is absolute or relative path
              const avatarUrl = updatedUserData.avatar.startsWith('http') 
                ? updatedUserData.avatar 
                : `http://localhost:8888${updatedUserData.avatar}`;
              // Add timestamp to bypass browser cache
              currentUser.avatar = `${avatarUrl}?v=${Date.now()}`;
            }
            localStorage.setItem("user", JSON.stringify(currentUser));
            
            // Dispatch custom event to notify AdminLayout to update user state
            window.dispatchEvent(new Event("userUpdated"));
          }
        }

        // Refresh profile after update to get latest data from DB
        // Wait a bit to ensure DB is updated
        setTimeout(async () => {
          await refresh();
        }, 300);
      } else {
        // Regular JSON update (no avatar)
        const result = await updateProfile(data);
        
        // Update localStorage with returned user data
        if (result && Object.keys(result).length > 0) {
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (currentUser.id === user.id) {
            if (result.name) currentUser.name = result.name;
            if (result.address !== undefined) currentUser.address = result.address || "";
            if (result.phone !== undefined) currentUser.phone = result.phone || "";
            if (result.avatar) {
              // Ensure avatar URL is absolute or relative path
              const avatarUrl = result.avatar.startsWith('http') 
                ? result.avatar 
                : `http://localhost:8888${result.avatar}`;
              // Add timestamp to bypass browser cache
              currentUser.avatar = `${avatarUrl}?v=${Date.now()}`;
            }
            localStorage.setItem("user", JSON.stringify(currentUser));
            
            // Dispatch custom event to notify AdminLayout to update user state
            window.dispatchEvent(new Event("userUpdated"));
          }
        }
        
        // Refresh profile to get latest data from DB
        await refresh();
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
      throw err;
    }
  };

  return (
    <div className="user-identity-dashboard admin-page" data-role={userRole}>
      <div className="dashboard-container">
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" className="dashboard-alert">
            {error}
          </Alert>
        )}

        {/* Identity Card - Full width at top */}
        {/* Use avatar URL as key to force re-render when avatar changes */}
        <IdentityCard key={`user-${user?.id || 'loading'}-avatar-${user?.avatar || 'no-avatar'}`} user={user} loading={loading} />

        {/* Main Panel - Full width sections below */}
        <IdentityMainPanel
          user={user}
          stats={stats}
          loading={loading || statsLoading}
          onUpdateProfile={handleUpdateProfile}
        />
      </div>
    </div>
  );
}

