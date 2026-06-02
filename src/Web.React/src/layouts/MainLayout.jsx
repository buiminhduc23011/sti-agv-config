import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Drawer, Grid, Layout, Menu, Space, Tag, Typography } from "antd";
import {
  ControlOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  UserOutlined
} from "@ant-design/icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getConfig } from "../config/api";
import { useAuth } from "../contexts/AuthContext";

const { Header, Content, Footer, Sider } = Layout;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

function MainLayout() {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const config = getConfig();

  const menuItems = useMemo(() => {
    return [
      {
        key: "/process-priority",
        icon: <ControlOutlined />,
        label: <NavLink to="/process-priority">Cấu hình ưu tiên</NavLink>
      }
    ];
  }, []);

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/process-priority")) {
      return "/process-priority";
    }
    return location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile, selectedKey]);

  const handleToggleNav = () => {
    if (isMobile) {
      setMobileMenuOpen(true);
      return;
    }
    setCollapsed((value) => !value);
  };

  const handleLogout = () => {
    logout(true);
    navigate("/login");
  };

  const navigation = (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#ffffff" }}>
      {/* Brand logo container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed && !isMobile ? "center" : "flex-start",
          gap: 12,
          padding: collapsed && !isMobile ? "20px 12px" : "20px 24px",
          borderBottom: "1px solid #f1f5f9"
        }}
      >
        <img
          src="/Logo.png"
          alt="Logo"
          style={{
            width: collapsed && !isMobile ? 36 : 42,
            height: collapsed && !isMobile ? 36 : 42,
            objectFit: "contain"
          }}
        />
        {collapsed && !isMobile ? null : (
          <div style={{ minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px", color: "#0f172a" }}>
              AGV Configuration
            </Title>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: "16px 12px" }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ borderInlineEnd: 0 }}
        />
      </div>
    </div>
  );

  const userPanel = currentUser ? (
    <Space size={16} align="center">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          lineHeight: 1.2
        }}
      >
        <Text strong style={{ fontSize: 13.5, color: "#0f172a", whiteSpace: "nowrap" }}>
          {currentUser.fullName}
        </Text>
        <Tag
          color="blue"
          bordered={false}
          style={{
            fontSize: 10,
            marginInlineEnd: 0,
            fontWeight: 600,
            padding: "0 6px",
            marginTop: 4
          }}
        >
          {currentUser.role.toUpperCase()}
        </Tag>
      </div>

      <Avatar
        size={36}
        icon={<UserOutlined />}
        style={{
          background: "#eaf2ff",
          color: "#0052cc",
          border: "1px solid #d0e2ff"
        }}
      />

      <Button
        type="text"
        icon={<LogoutOutlined style={{ color: "#ef4444" }} />}
        onClick={handleLogout}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#fef2f2",
          border: "none"
        }}
        title="Đăng xuất"
      />
    </Space>
  ) : (
    <Button
      type="primary"
      icon={<LoginOutlined />}
      onClick={() => navigate("/login")}
      style={{
        borderRadius: 10,
        background: "linear-gradient(135deg, #0052cc, #2684ff)",
        border: "none"
      }}
    >
      Đăng nhập
    </Button>
  );

  return (
    <Layout style={{ height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          closable={false}
          width={260}
          styles={{ body: { padding: 0 }, content: { background: "#fff" } }}
        >
          {navigation}
        </Drawer>
      ) : (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={80}
          style={{
            background: "#fff",
            borderRight: "1px solid #f1f5f9",
            height: "100vh",
            transition: "all 0.2s ease"
          }}
        >
          {navigation}
        </Sider>
      )}

      <Layout style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <Header
          style={{
            background: "#fff",
            borderBottom: "1px solid #f1f5f9",
            padding: isMobile ? "0 16px" : "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
            width: "100%"
          }}
        >
          <Space size={16} style={{ minWidth: 0 }}>
            <Button
              type="text"
              icon={
                isMobile
                  ? <MenuOutlined />
                  : collapsed
                    ? <MenuUnfoldOutlined />
                    : <MenuFoldOutlined />
              }
              onClick={handleToggleNav}
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8fafc",
                borderRadius: "8px"
              }}
              aria-label="Toggle navigation"
            />

            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
              <Text strong style={{ fontSize: 15, color: "#0f172a", fontWeight: 700 }}>
                Process Priority
              </Text>
              {!isMobile && (
                <Text type="secondary" style={{ fontSize: 11.5, color: "#64748b", marginTop: 1 }}>
                  Cấu hình mức độ ưu tiên của quy trình theo từng Line sản xuất
                </Text>
              )}
            </div>
          </Space>

          <div style={{ marginLeft: "auto" }}>
            {userPanel}
          </div>
        </Header>

        <Content style={{ padding: isMobile ? 12 : 20, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0, transition: "padding 0.2s" }}>
          <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            <Outlet />
          </div>
        </Content>

        <Footer style={{ textAlign: "center", color: "#94a3b8", background: "transparent", padding: "6px 24px 12px", fontSize: 12.5, flexShrink: 0 }}>
          AGV Configuration | Designed by STI.AI &copy; 2026
        </Footer>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
