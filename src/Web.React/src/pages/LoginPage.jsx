import React, { useState } from "react";
import { Alert, Card, Button, Form, Input, Space, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../config/api";
import { useAuth } from "../contexts/AuthContext";
import { showSuccessMessage } from "../utils/appMessage";

const { Paragraph, Text, Title } = Typography;

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const redirectTo = location.state?.from?.pathname || "/process-priority";

  const handleSubmit = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      await login(values.username, values.password);
      showSuccessMessage("Đăng nhập hệ thống thành công.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không thể đăng nhập. Vui lòng kiểm tra lại tài khoản và mật khẩu."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Decorative background glow circles */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(0, 82, 204, 0.05)",
          top: "-10%",
          left: "-10%",
          filter: "blur(80px)",
          pointerEvents: "none"
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(38, 132, 255, 0.06)",
          bottom: "-15%",
          right: "-10%",
          filter: "blur(100px)",
          pointerEvents: "none"
        }}
      />

      <Card 
        style={{ 
          width: "100%", 
          maxWidth: 440, 
          borderRadius: 24, 
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)"
        }} 
        styles={{ body: { padding: "48px 40px" } }}
      >
        <Space direction="vertical" size={32} style={{ display: "flex" }}>
          <Space align="center" size={16}>
            <img
              src="/Logo.png"
              alt="Logo"
              style={{
                width: 48,
                height: 48,
                objectFit: "contain"
              }}
            />
            <div>
              <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700 }}>
                AGV System
              </Text>
              <Title level={3} style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
                Đăng Nhập
              </Title>
            </div>
          </Space>

          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13.5, color: "#475569", lineHeight: 1.6 }}>
            Hệ thống quản lý cấu hình tập trung STI AgvSystemConfiguration. Vui lòng đăng nhập để tiếp tục.
          </Paragraph>

          {errorMessage ? (
            <Alert
              type="error"
              showIcon
              message="Đăng nhập thất bại"
              description={errorMessage}
              style={{ borderRadius: 10 }}
            />
          ) : null}

          <Form layout="vertical" onFinish={handleSubmit} requiredMark={false} style={{ marginTop: -8 }}>
            <Form.Item
              label={<Text style={{ fontWeight: 600, fontSize: 13, color: "#334155" }}>Tên đăng nhập</Text>}
              name="username"
              rules={[{ required: true, message: "Vui lòng nhập tên đăng nhập." }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: "#94a3b8" }} />} 
                size="large" 
                placeholder="Ví dụ: admin" 
                style={{ borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item
              label={<Text style={{ fontWeight: 600, fontSize: 13, color: "#334155" }}>Mật khẩu</Text>}
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu." }]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: "#94a3b8" }} />} 
                size="large" 
                placeholder="Nhập mật khẩu" 
                style={{ borderRadius: 10 }}
              />
            </Form.Item>

            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block 
              size="large" 
              style={{ 
                marginTop: 16, 
                height: 46,
                borderRadius: 10,
                background: "linear-gradient(135deg, #0052cc, #2684ff)",
                border: "none",
                boxShadow: "0 4px 12px rgba(0, 82, 204, 0.2)"
              }}
            >
              Đăng nhập hệ thống
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}

export default LoginPage;
