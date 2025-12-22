// frontend/src/services/user.service.js
// Enterprise User Service - API communication layer

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8888/api";

/**
 * User Service - Clean API abstraction
 * All user-related API calls go through here
 */
export const userService = {
  /**
   * Get user profile by ID
   * @param {number} userId - User ID (defaults to current user)
   * @returns {Promise<Object>} User profile data
   */
  async getProfile(userId = null) {
    try {
      // If no userId provided, get from localStorage (current user)
      if (!userId) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "null");
        if (!currentUser?.id) {
          throw new Error("No user logged in");
        }
        userId = currentUser.id;
      }

      const response = await fetch(`${API_BASE}/users/get_user.php?user_id=${userId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to fetch user profile");
      }

      return result.data;
    } catch (error) {
      console.error("userService.getProfile error:", error);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} data - Update data (name, phone, address, avatar)
   * @returns {Promise<Object>} Success response
   */
  async updateProfile(userId, data) {
    try {
      // Only allow updating: name, phone, address, avatar
      // Email, role, status are protected fields
      const allowedFields = ["name", "phone", "address", "avatar"];
      const updateData = {
        user_id: userId,
      };

      // Only include allowed fields
      Object.keys(data).forEach((key) => {
        if (allowedFields.includes(key) && data[key] !== undefined) {
          updateData[key] = data[key];
        }
      });

      const response = await fetch(`${API_BASE}/users/update_user.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to update profile");
      }

      return result.data || {};
    } catch (error) {
      console.error("userService.updateProfile error:", error);
      throw error;
    }
  },

  /**
   * Update user profile with avatar upload (using FormData)
   * @param {number} userId - User ID
   * @param {Object} data - Update data (name, phone, address)
   * @param {File} avatarFile - Avatar image file
   * @returns {Promise<Object>} Success response
   */
  async updateProfileWithAvatar(userId, data, avatarFile) {
    try {
      const formData = new FormData();
      formData.append("user_id", userId.toString());

      // Add text fields
      if (data.name) formData.append("name", data.name);
      if (data.phone) formData.append("phone", data.phone);
      if (data.address !== undefined) formData.append("address", data.address || "");

      // Add avatar file
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const response = await fetch(`${API_BASE}/users/update_user.php`, {
        method: "POST",
        credentials: "include",
        body: formData, // Don't set Content-Type header - browser will set it with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to update profile");
      }

      return result.data || {};
    } catch (error) {
      console.error("userService.updateProfileWithAvatar error:", error);
      throw error;
    }
  },

  /**
   * Change user password
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success response
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await fetch(`${API_BASE}/users/change_password.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to change password");
      }

      return result.data || {};
    } catch (error) {
      console.error("userService.changePassword error:", error);
      throw error;
    }
  },

  /**
   * Get user statistics (orders summary)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User stats
   */
  async getUserStats(userId = null) {
    try {
      if (!userId) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "null");
        if (!currentUser?.id) {
          throw new Error("No user logged in");
        }
        userId = currentUser.id;
      }

      // TODO: Implement API endpoint /api/users/get_user_stats.php
      // For now, return placeholder data
      // This will be connected to real API later
      return {
        total_orders: 0,
        completed: 0,
        in_progress: 0,
        failed: 0,
      };
    } catch (error) {
      console.error("userService.getUserStats error:", error);
      return {
        total_orders: 0,
        completed: 0,
        in_progress: 0,
        failed: 0,
      };
    }
  },
};

