import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { App as AntApp, ConfigProvider, theme } from "antd";
import viVN from "antd/locale/vi_VN";
import MainLayout from "./layouts/MainLayout";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppMessageBridge from "./components/AppMessageBridge";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProcessPriorityPage from "./pages/ProcessPriorityPage";
import UserSettingsPage from "./pages/UserSettingsPage";
import { appColors } from "./theme/colors";

const FONT_STACK = [
  "Inter",
  "Outfit",
  "\"Segoe UI Variable Text\"",
  "\"Segoe UI\"",
  "Roboto",
  "system-ui",
  "-apple-system",
  "sans-serif"
].join(", ");

const appTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: appColors.primary,
    colorInfo: appColors.primary,
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorTextBase: "#0f172a",
    colorBgBase: "#f8fafc",
    colorBorder: "#e2e8f0",
    colorBorderSecondary: "#f1f5f9",
    colorFillSecondary: "#f1f5f9",
    colorFillTertiary: "#f8fafc",
    colorTextSecondary: "#475569",
    zIndexPopupBase: 1700,
    borderRadius: 12,
    borderRadiusLG: 16,
    fontFamily: FONT_STACK,
    fontSize: 14,
    lineHeight: 1.6,
    controlHeight: 40,
    controlHeightLG: 44,
    boxShadowSecondary: "0 4px 20px rgba(15, 23, 42, 0.05)"
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      bodyBg: "#f8fafc",
      siderBg: "#ffffff",
      footerBg: "transparent"
    },
    Menu: {
      itemBorderRadius: 10,
      itemHeight: 42,
      itemMarginBlock: 4,
      itemSelectedBg: appColors.primarySoft,
      itemSelectedColor: appColors.primary,
      itemColor: "#475569",
      iconSize: 18,
      subMenuItemBg: "transparent"
    },
    Card: {
      borderRadiusLG: 16,
      boxShadowTertiary: "0 10px 30px rgba(15, 23, 42, 0.03)",
      paddingLG: 24
    },
    Button: {
      borderRadius: 10,
      controlHeightLG: 44,
      fontWeight: 600,
      boxShadow: "none"
    },
    Input: {
      borderRadius: 10,
      controlHeightLG: 44,
      activeBorderColor: appColors.primary,
      hoverBorderColor: appColors.primaryFocus
    },
    Select: {
      borderRadius: 10,
      controlHeightLG: 44
    },
    Table: {
      borderColor: "#f1f5f9",
      headerBg: "#f8fafc",
      headerColor: "#475569",
      headerBorderRadius: 10,
      rowHoverBg: "#f8fafc",
      cellPaddingBlock: 14,
      cellPaddingInline: 20
    },
    Modal: {
      borderRadiusLG: 20
    },
    Drawer: {
      colorBgElevated: "#ffffff"
    },
    Tabs: {
      cardBg: "#f1f5f9",
      itemSelectedColor: appColors.primary,
      itemHoverColor: appColors.primary
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0
    }
  }
};

function App() {
  return (
    <ConfigProvider locale={viVN} theme={appTheme}>
      <AntApp message={{ maxCount: 3, top: 24 }}>
        <AppMessageBridge />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/process-priority" replace />} />
                <Route
                  path="process-priority"
                  element={
                    <ProtectedRoute>
                      <ProcessPriorityPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="user-settings"
                  element={
                    <ProtectedRoute roles={["Admin"]}>
                      <UserSettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
