import React from "react";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
      <Result
        status="404"
        title="404"
        subTitle="Trang bạn tìm kiếm không tồn tại."
        extra={
          <Button type="primary" onClick={() => navigate("/process-priority")}>
            Quay lại trang chủ
          </Button>
        }
      />
    </div>
  );
}
