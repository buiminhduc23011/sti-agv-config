import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Grid,
  Input,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme
} from "antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  IdcardOutlined,
  LockOutlined,
  MailOutlined,
  MoreOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined
} from "@ant-design/icons";
import { apiClient, API_ENDPOINTS, getApiErrorMessage } from "../config/api";
import { showErrorMessage, showSuccessMessage } from "../utils/appMessage";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const ROLE_OPTIONS = [
  { value: "Admin", label: "Quản trị viên" },
  { value: "Technician", label: "Kỹ thuật viên" }
];

const STATUS_OPTIONS = [
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Tạm khóa" }
];

function getRoleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || role || "-";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function buildUserParams({ page, pageSize, searchText, roleFilter, statusFilter }) {
  const params = {
    page,
    pageSize
  };

  if (searchText.trim()) {
    params.search = searchText.trim();
  }

  if (roleFilter) {
    params.role = roleFilter;
  }

  if (statusFilter === "active") {
    params.isActive = true;
  }

  if (statusFilter === "inactive") {
    params.isActive = false;
  }

  return params;
}

function normalizePayload(values) {
  return {
    ...values,
    email: values.email?.trim() || null,
    fullName: values.fullName?.trim() || "",
    username: values.username?.trim() || "",
    password: values.password || undefined,
    newPassword: values.newPassword || undefined
  };
}

function UserSettingsPage() {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const { token } = theme.useToken();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingUserIds, setTogglingUserIds] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  const isEditing = Boolean(editingUser);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.users, {
        params: buildUserParams({
          page: pagination.current,
          pageSize: pagination.pageSize,
          searchText,
          roleFilter,
          statusFilter
        })
      });

      setUsers(response.data.items || []);
      setPagination((prev) => ({
        ...prev,
        current: response.data.page || prev.current,
        pageSize: response.data.pageSize || prev.pageSize,
        total: response.data.total || 0
      }));
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, "Không thể tải danh sách người dùng."));
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, roleFilter, searchText, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetToFirstPage = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      role: "Technician",
      isActive: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    if (user.isSystemAccount) {
      showErrorMessage("Tài khoản seed mặc định không được phép chỉnh sửa.");
      return;
    }

    setEditingUser(user);
    form.resetFields();
    form.setFieldsValue({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = normalizePayload(values);

    setSaving(true);
    try {
      if (isEditing) {
        await apiClient.put(API_ENDPOINTS.userById(editingUser.id), {
          fullName: payload.fullName,
          email: payload.email,
          role: payload.role,
          isActive: payload.isActive,
          newPassword: payload.newPassword
        });
        showSuccessMessage("Cập nhật tài khoản người dùng thành công.");
      } else {
        await apiClient.post(API_ENDPOINTS.users, {
          username: payload.username,
          password: payload.password,
          fullName: payload.fullName,
          email: payload.email,
          role: payload.role,
          isActive: payload.isActive
        });
        showSuccessMessage("Tạo tài khoản người dùng thành công.");
      }

      handleCloseModal();
      await fetchUsers();
    } catch (error) {
      if (!isEditing && error?.response?.status === 409) {
        form.setFields([
          {
            name: "username",
            errors: [getApiErrorMessage(error, "Tên đăng nhập đã tồn tại.")]
          }
        ]);
        return;
      }

      showErrorMessage(getApiErrorMessage(error, "Không thể lưu tài khoản người dùng."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (record, isActive) => {
    if (record.isSystemAccount) {
      showErrorMessage("Tài khoản seed mặc định không được phép chỉnh sửa.");
      return;
    }

    setTogglingUserIds((prev) => ({ ...prev, [record.id]: true }));
    try {
      await apiClient.put(API_ENDPOINTS.userById(record.id), {
        fullName: record.fullName,
        email: record.email,
        role: record.role,
        isActive
      });

      showSuccessMessage(isActive ? "Đã kích hoạt tài khoản." : "Đã tạm khóa tài khoản.");
      await fetchUsers();
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, "Không thể cập nhật trạng thái tài khoản."));
    } finally {
      setTogglingUserIds((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
    }
  };

  const validateUsernameAvailability = useCallback(async (_, value) => {
    if (isEditing) {
      return;
    }

    const username = value?.trim();
    if (!username || username.length > 100) {
      return;
    }

    try {
      const response = await apiClient.get(API_ENDPOINTS.userAvailability, {
        params: { username }
      });

      if (response.data?.exists) {
        throw new Error("Tên đăng nhập đã tồn tại.");
      }
    } catch (error) {
      if (error.message === "Tên đăng nhập đã tồn tại.") {
        throw error;
      }

      throw new Error(getApiErrorMessage(error, "Không thể kiểm tra tên đăng nhập."));
    }
  }, [isEditing]);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      fixed: "left",
      render: (id, record) => (
        <Space size={6}>
          <Tag style={{ marginInlineEnd: 0, fontWeight: 700 }}>#{id}</Tag>
          {record.isSystemAccount ? (
            <Tooltip title="Tài khoản seed mặc định, không được chỉnh sửa">
              <SafetyCertificateOutlined style={{ color: token.colorPrimary }} />
            </Tooltip>
          ) : null}
        </Space>
      )
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      width: 210,
      fixed: "left",
      render: (username, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{username}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getRoleLabel(record.role)}
          </Text>
        </Space>
      )
    },
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      key: "fullName",
      width: 220,
      render: (fullName) => <Text>{fullName || "-"}</Text>
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 230,
      render: (email) => <Text type={email ? undefined : "secondary"}>{email || "Chưa thiết lập"}</Text>
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 150,
      render: (isActive) => (
        <Tag
          color={isActive ? "green" : "red"}
          icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
          bordered={false}
          style={{ fontWeight: 700 }}
        >
          {isActive ? "Đang hoạt động" : "Tạm khóa"}
        </Tag>
      )
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updatedAtUtc",
      key: "updatedAtUtc",
      width: 190,
      render: (value) => <Text>{formatDateTime(value)}</Text>
    },
    {
      title: "Người cập nhật",
      dataIndex: "updatedBy",
      key: "updatedBy",
      width: 170,
      render: (value) => <Text>{value || "-"}</Text>
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 130,
      fixed: "right",
      render: (_, record) => (
        <Space size={8} align="center">
          <Tooltip title={record.isSystemAccount ? "Tài khoản seed mặc định không được chỉnh sửa" : record.isActive ? "Tạm khóa nhanh" : "Kích hoạt nhanh"}>
            <Switch
              size="small"
              checked={record.isActive}
              disabled={record.isSystemAccount}
              loading={Boolean(togglingUserIds[record.id])}
              onChange={(checked) => handleToggleActive(record, checked)}
            />
          </Tooltip>

          <Dropdown
            trigger={["click"]}
            disabled={record.isSystemAccount}
            menu={{
              items: [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "Chỉnh sửa",
                  onClick: () => handleOpenEdit(record)
                }
              ]
            }}
          >
            <Tooltip title={record.isSystemAccount ? "Tài khoản seed mặc định không được chỉnh sửa" : "Tùy chọn"}>
              <Button
                type="text"
                icon={<MoreOutlined />}
                disabled={record.isSystemAccount}
                style={{
                  width: 36,
                  height: 36,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              />
            </Tooltip>
          </Dropdown>
        </Space>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", gap: 16, overflow: "hidden" }}>
      <Card
        style={{
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 30px rgba(15,23,42,0.04)",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        styles={{ body: { padding: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } }}
      >
        <div
          style={{
            padding: isMobile ? 16 : "16px 24px",
            borderBottom: "1px solid #f1f5f9",
            flexShrink: 0
          }}
        >
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} lg={8}>
              <Space direction="vertical" size={2}>
                <Title level={4} style={{ margin: 0, color: "#0f172a", fontWeight: 800 }}>
                  Danh sách người dùng
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Admin có thể cấp tài khoản mới và cập nhật tài khoản không thuộc seed mặc định.
                </Text>
              </Space>
            </Col>

            <Col xs={24} md={8} lg={5}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Tìm username, họ tên, email"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  resetToFirstPage();
                }}
              />
            </Col>

            <Col xs={12} md={5} lg={4}>
              <Select
                allowClear
                placeholder="Vai trò"
                value={roleFilter}
                onChange={(value) => {
                  setRoleFilter(value ?? null);
                  resetToFirstPage();
                }}
                options={ROLE_OPTIONS}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={12} md={5} lg={4}>
              <Select
                allowClear
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value ?? null);
                  resetToFirstPage();
                }}
                options={STATUS_OPTIONS}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} md={4} lg={3} style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end" }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
                style={{ borderRadius: 10 }}
              >
                Cấp tài khoản
              </Button>
            </Col>
          </Row>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <Table
              dataSource={users}
              columns={columns}
              rowKey="id"
              loading={loading}
              sticky
              scroll={{ x: 1380, y: "calc(100vh - 420px)" }}
              pagination={false}
              locale={{
                emptyText: "Không tìm thấy tài khoản người dùng nào."
              }}
            />
          </div>

          <div
            style={{
              padding: isMobile ? "12px 16px" : "14px 24px",
              borderTop: "1px solid #f1f5f9",
              background: "#ffffff",
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 16,
              flexWrap: "wrap",
              flexShrink: 0
            }}
          >
            <Text type="secondary" style={{ fontSize: 13 }}>
              Tổng số <Text strong>{pagination.total}</Text> tài khoản
            </Text>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              showSizeChanger
              pageSizeOptions={["10", "20", "50", "100"]}
              onChange={(page, pageSize) => {
                setPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize
                }));
              }}
              onShowSizeChange={(_, pageSize) => {
                setPagination((prev) => ({
                  ...prev,
                  current: 1,
                  pageSize
                }));
              }}
            />
          </div>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={
          <Space size={10}>
            {isEditing ? <EditOutlined /> : <UserAddOutlined />}
            <span>{isEditing ? "Cập nhật tài khoản" : "Cấp tài khoản mới"}</span>
          </Space>
        }
        onCancel={handleCloseModal}
        onOk={handleSave}
        confirmLoading={saving}
        okText={isEditing ? "Lưu thay đổi" : "Tạo tài khoản"}
        cancelText="Hủy"
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          style={{ marginTop: 20 }}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Tên đăng nhập</Text>}
                name="username"
                validateFirst
                validateTrigger="onChange"
                validateDebounce={400}
                rules={
                  isEditing
                    ? []
                    : [
                        { required: true, message: "Vui lòng nhập tên đăng nhập." },
                        { max: 100, message: "Tên đăng nhập không được vượt quá 100 ký tự." },
                        { validator: validateUsernameAvailability }
                      ]
                }
              >
                <Input
                  size="large"
                  disabled={isEditing}
                  prefix={<IdcardOutlined style={{ color: "#94a3b8" }} />}
                  placeholder="Ví dụ: operator01"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>{isEditing ? "Mật khẩu mới" : "Mật khẩu"}</Text>}
                name={isEditing ? "newPassword" : "password"}
                rules={
                  isEditing
                    ? [{ min: 6, message: "Mật khẩu mới phải có ít nhất 6 ký tự." }]
                    : [
                        { required: true, message: "Vui lòng nhập mật khẩu." },
                        { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự." }
                      ]
                }
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                  placeholder={isEditing ? "Để trống nếu không đổi" : "Nhập mật khẩu ban đầu"}
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Họ và tên</Text>}
                name="fullName"
                rules={[
                  { required: true, message: "Vui lòng nhập họ và tên." },
                  { max: 150, message: "Họ và tên không được vượt quá 150 ký tự." }
                ]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                  placeholder="Nhập họ và tên"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Email</Text>}
                name="email"
                rules={[
                  { type: "email", message: "Email không hợp lệ." },
                  { max: 255, message: "Email không được vượt quá 255 ký tự." }
                ]}
              >
                <Input
                  size="large"
                  prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
                  placeholder="email@sti.com"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Vai trò</Text>}
                name="role"
                rules={[{ required: true, message: "Vui lòng chọn vai trò." }]}
              >
                <Select
                  size="large"
                  options={ROLE_OPTIONS}
                  prefix={<SafetyCertificateOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Trạng thái</Text>}
                name="isActive"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Hoạt động"
                  unCheckedChildren="Tạm khóa"
                />
              </Form.Item>
            </Col>
          </Row>

          {isEditing ? (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                background: "#f8fafc",
                padding: "12px 14px"
              }}
            >
              <Space size={10} wrap>
                <TeamOutlined style={{ color: token.colorPrimary }} />
                <Text type="secondary">
                  Người cập nhật gần nhất: <Text strong>{editingUser?.updatedBy || "-"}</Text> lúc{" "}
                  <Text strong>{formatDateTime(editingUser?.updatedAtUtc)}</Text>
                </Text>
              </Space>
            </div>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}

export default UserSettingsPage;
