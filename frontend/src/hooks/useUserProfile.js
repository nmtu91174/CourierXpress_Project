// frontend/src/hooks/useUserProfile.js
// Enterprise User Profile Hook

import { useState, useEffect, useCallback } from "react";
import { userService } from "../services/user.service";

/**
 * useUserProfile - Custom hook for user profile management
 * 
 * Provides:
 * - user: User profile data
 * - loading: Loading state
 * - error: Error message
 * - updateProfile: Function to update profile
 * - refresh: Function to refresh profile data
 */
export const useUserProfile = (userId = null) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch user profile
   */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const profileData = await userService.getProfile(userId);
      setUser(profileData);
    } catch (err) {
      setError(err.message || "Failed to load user profile");
      console.error("useUserProfile.fetchProfile error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Initialize - fetch profile on mount
   */
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Update user profile
   * @param {Object} data - Update data (name, phone, address, avatar)
   */
  const updateProfile = useCallback(
    async (data) => {
      if (!user?.id) {
        throw new Error("No user loaded");
      }

      setError(null);

      try {
        await userService.updateProfile(user.id, data);

        // Refresh profile data after update
        await fetchProfile();

        // Also update localStorage user data if name/avatar changed
        if (data.name || data.avatar) {
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (currentUser.id === user.id) {
            if (data.name) currentUser.name = data.name;
            if (data.avatar) {
              // Ensure avatar URL is absolute and add timestamp to bypass cache
              const avatarUrl = data.avatar.startsWith('http') 
                ? data.avatar 
                : `http://localhost:8888${data.avatar}`;
              currentUser.avatar = `${avatarUrl}?v=${Date.now()}`;
            }
            localStorage.setItem("user", JSON.stringify(currentUser));
            
            // Dispatch custom event to notify AdminLayout to update user state
            window.dispatchEvent(new Event("userUpdated"));
          }
        }
      } catch (err) {
        setError(err.message || "Failed to update profile");
        throw err;
      }
    },
    [user, fetchProfile]
  );

  /**
   * Refresh profile data (force refetch from server)
   */
  const refresh = useCallback(async () => {
    // Force reload by calling fetchProfile
    await fetchProfile();
  }, [fetchProfile]);

  return {
    user,
    loading,
    error,
    updateProfile,
    refresh,
  };
};

