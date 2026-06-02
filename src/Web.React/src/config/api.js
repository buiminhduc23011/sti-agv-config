import axios from "axios";

const AUTO_API_BASE_URL = "auto";

let runtimeConfig = {
  API_BASE_URL: AUTO_API_BASE_URL,
  APP_NAME: "STI.AgvSystemConfiguration"
};

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(runtimeConfig.API_BASE_URL)
});

export async function loadConfig() {
  try {
    const response = await fetch("/config.json", {
      cache: "no-store",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
    if (!response.ok) {
      runtimeConfig = applyResolvedConfig(runtimeConfig);
      apiClient.defaults.baseURL = runtimeConfig.API_BASE_URL;
      return runtimeConfig;
    }

    const config = await response.json();
    runtimeConfig = applyResolvedConfig({
      ...runtimeConfig,
      ...config
    });

    apiClient.defaults.baseURL = runtimeConfig.API_BASE_URL;
    return runtimeConfig;
  } catch {
    runtimeConfig = applyResolvedConfig(runtimeConfig);
    apiClient.defaults.baseURL = runtimeConfig.API_BASE_URL;
    return runtimeConfig;
  }
}

export function getConfig() {
  return runtimeConfig;
}

export function setAuthToken(token) {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    return;
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function getApiErrorMessage(error, fallbackMessage) {
  const detail = error?.response?.data?.detail;
  if (detail) {
    return detail;
  }

  const title = error?.response?.data?.title;
  if (title) {
    return title;
  }

  const message = error?.response?.data;
  if (typeof message === "string" && message) {
    return message;
  }

  const validationErrors = error?.response?.data?.errors;
  if (validationErrors) {
    const firstError = Object.values(validationErrors).flat()[0];
    if (firstError) {
      return firstError;
    }
  }

  return fallbackMessage;
}

export const API_ENDPOINTS = {
  authLogin: "/api/auth/login",
  authMe: "/api/auth/me",
  lines: "/api/lines",
  processes: "/api/processes",
  updatePriority: (id) => `/api/processes/${id}/priority`
};

function applyResolvedConfig(config) {
  return {
    ...config,
    API_BASE_URL: resolveApiBaseUrl(config.API_BASE_URL)
  };
}

function resolveApiBaseUrl(configuredBaseUrl) {
  const browserOrigin = getBrowserOrigin();

  if (!browserOrigin) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  // Nếu đang chạy local dev server (cổng 3000) và cấu hình là auto, tự động trỏ về API Backend (cổng 5251)
  if ((!configuredBaseUrl || configuredBaseUrl === AUTO_API_BASE_URL) && typeof window !== "undefined" && window.location?.port === "3000") {
    return "http://localhost:5251";
  }

  if (!configuredBaseUrl || configuredBaseUrl === AUTO_API_BASE_URL) {
    return browserOrigin;
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl, browserOrigin);
    const browserUrl = new URL(browserOrigin);

    if (isLoopbackHostname(configuredUrl.hostname) && !isLoopbackHostname(browserUrl.hostname)) {
      return browserOrigin;
    }

    return normalizeBaseUrl(configuredUrl.toString());
  } catch {
    return browserOrigin;
  }
}

function normalizeBaseUrl(value) {
  return (value || "").replace(/\/+$/, "");
}

function getBrowserOrigin() {
  if (typeof window === "undefined" || !window.location?.origin) {
    return "";
  }

  return normalizeBaseUrl(window.location.origin);
}

function isLoopbackHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
