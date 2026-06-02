import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, API_ENDPOINTS, setAuthToken } from "../config/api";
import { showInfoMessage } from "../utils/appMessage";

const STORAGE_TOKEN_KEY = "sti.auth.token";
const STORAGE_USER_KEY = "sti.auth.user";
const STORAGE_EXPIRES_KEY = "sti.auth.expiresAt";

export const AuthContext = createContext({
  currentUser: null,
  loading: true,
  login: async () => {},
  logout: () => {}
});

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      const expiresAt = localStorage.getItem(STORAGE_EXPIRES_KEY);

      if (!token || !expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
        clearAuthState();
        setLoading(false);
        return;
      }

      try {
        setAuthToken(token);
        const response = await apiClient.get(API_ENDPOINTS.authMe);
        setCurrentUser(response.data);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(response.data));
      } catch {
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await apiClient.post(API_ENDPOINTS.authLogin, {
      username,
      password
    });

    const { token, expiresAt, user } = response.data;
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_EXPIRES_KEY, expiresAt);
    return user;
  }, []);

  const logout = useCallback((notify = false) => {
    setCurrentUser(null);
    clearAuthState();
    if (notify) {
      showInfoMessage("Bạn đã đăng xuất.");
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      login,
      logout
    }),
    [currentUser, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

function clearAuthState() {
  setAuthToken(null);
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
  localStorage.removeItem(STORAGE_EXPIRES_KEY);
}
