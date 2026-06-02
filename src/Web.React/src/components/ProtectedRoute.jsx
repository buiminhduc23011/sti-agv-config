import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Result, Spin } from "antd";
import { useAuth } from "../contexts/AuthContext";

function ProtectedRoute({ children, roles }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length > 0 && !roles.includes(currentUser.role)) {
    return (
      <div style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle="Tài khoản hiện tại không có quyền xem nội dung này."
        />
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
