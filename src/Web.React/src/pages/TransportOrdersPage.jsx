import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  theme
} from "antd";
import {
  ClockCircleOutlined,
  DeploymentUnitOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import { apiClient, API_ENDPOINTS, getApiErrorMessage } from "../config/api";
import { showErrorMessage, showSuccessMessage } from "../utils/appMessage";

const { Text } = Typography;

const STATUS_SORT_ORDER = {
  1: 0,
  0: 1
};

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

function formatOrderProgress(record) {
  if (!record.totalSteps) {
    return "-";
  }

  if (record.statusId === 0) {
    return "Cho cap AGV";
  }

  const currentStep = Math.min(record.currentStep + 1, record.totalSteps);
  return `Buoc ${currentStep}/${record.totalSteps}`;
}

function buildQueueQuery(lineId, processId) {
  const params = new URLSearchParams();

  if (lineId !== null && lineId !== undefined) {
    params.set("lineId", lineId);
  }

  if (processId !== null && processId !== undefined) {
    params.set("processId", processId);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function normalizePriority(value) {
  return Number.isInteger(value) ? value : 0;
}

function renderStatusTag(statusId) {
  if (statusId === 1) {
    return (
      <Tag
        bordered={false}
        style={{
          color: "#1d4ed8",
          background: "#dbeafe",
          fontWeight: 700,
          borderRadius: 999,
          padding: "4px 12px"
        }}
      >
        Dang chay
      </Tag>
    );
  }

  return (
    <Tag
      bordered={false}
      style={{
        color: "#b45309",
        background: "#fef3c7",
        fontWeight: 700,
        borderRadius: 999,
        padding: "4px 12px"
      }}
    >
      Dang cho
    </Tag>
  );
}

function renderPriorityValue(priority) {
  const normalizedPriority = normalizePriority(priority);
  const palette = {
    0: { color: "#64748b", background: "#f8fafc", border: "#e2e8f0" },
    1: { color: "#2563eb", background: "#dbeafe", border: "#bfdbfe" },
    2: { color: "#0891b2", background: "#cffafe", border: "#a5f3fc" },
    3: { color: "#059669", background: "#d1fae5", border: "#a7f3d0" },
    4: { color: "#d97706", background: "#fef3c7", border: "#fde68a" },
    5: { color: "#dc2626", background: "#fee2e2", border: "#fecaca" }
  }[normalizedPriority];

  return (
    <div
      style={{
        minWidth: 38,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        fontWeight: 800
      }}
    >
      {normalizedPriority}
    </div>
  );
}

function TransportOrdersPage() {
  const { token } = theme.useToken();

  const [lines, setLines] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [queue, setQueue] = useState({
    pendingOrders: [],
    runningOrders: []
  });
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [selectedProcessId, setSelectedProcessId] = useState(null);

  const fetchLines = useCallback(async () => {
    setLoadingLines(true);

    try {
      const response = await apiClient.get(API_ENDPOINTS.lines);
      setLines(response.data);
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, "Khong the tai danh sach line."));
    } finally {
      setLoadingLines(false);
    }
  }, []);

  const fetchProcesses = useCallback(async (lineId) => {
    if (!lineId) {
      setProcesses([]);
      return;
    }

    setLoadingProcesses(true);

    try {
      const response = await apiClient.get(`${API_ENDPOINTS.processes}?lineId=${lineId}`);
      setProcesses(response.data);
    } catch (error) {
      setProcesses([]);
      showErrorMessage(getApiErrorMessage(error, "Khong the tai danh sach quy trinh."));
    } finally {
      setLoadingProcesses(false);
    }
  }, []);

  const fetchOrders = useCallback(async (lineId, processId) => {
    setLoadingOrders(true);

    try {
      const response = await apiClient.get(`${API_ENDPOINTS.transportOrders}${buildQueueQuery(lineId, processId)}`);
      setQueue({
        pendingOrders: response.data.pendingOrders || [],
        runningOrders: response.data.runningOrders || []
      });
    } catch (error) {
      setQueue({
        pendingOrders: [],
        runningOrders: []
      });
      showErrorMessage(getApiErrorMessage(error, "Khong the tai danh sach lenh."));
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    if (selectedLineId === null) {
      setProcesses([]);
      setSelectedProcessId(null);
      return;
    }

    fetchProcesses(selectedLineId);
  }, [fetchProcesses, selectedLineId]);

  useEffect(() => {
    fetchOrders(selectedLineId, selectedProcessId);
  }, [fetchOrders, selectedLineId, selectedProcessId]);

  const handleCreateOrder = async () => {
    if (!selectedProcessId) {
      showErrorMessage("Vui long chon quy trinh truoc khi tao lenh.");
      return;
    }

    setCreatingOrder(true);

    try {
      await apiClient.post(API_ENDPOINTS.transportOrders, {
        processId: selectedProcessId
      });
      showSuccessMessage("Tao lenh thanh cong.");
      await fetchOrders(selectedLineId, selectedProcessId);
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, "Khong the tao lenh moi."));
    } finally {
      setCreatingOrder(false);
    }
  };

  const selectedLineName =
    selectedLineId !== null
      ? lines.find((line) => line.id === selectedLineId)?.name || "Chua xac dinh"
      : "Tat ca line";

  const selectedProcessName =
    selectedProcessId !== null
      ? processes.find((process) => process.id === selectedProcessId)?.name || "Chua xac dinh"
      : "Tat ca quy trinh";

  const mergedOrders = useMemo(() => {
    return [...queue.runningOrders, ...queue.pendingOrders].sort((left, right) => {
      const leftWeight = STATUS_SORT_ORDER[left.statusId] ?? Number.MAX_SAFE_INTEGER;
      const rightWeight = STATUS_SORT_ORDER[right.statusId] ?? Number.MAX_SAFE_INTEGER;

      if (leftWeight !== rightWeight) {
        return leftWeight - rightWeight;
      }

      return new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime();
    });
  }, [queue.pendingOrders, queue.runningOrders]);

  const filterLabelStyle = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#0f172a"
  };

  const columns = [
    {
      title: "Lenh",
      dataIndex: "id",
      key: "id",
      width: 90,
      render: (value) => (
        <Tag
          color="default"
          style={{
            fontWeight: 700,
            fontSize: 12,
            borderRadius: 999,
            padding: "3px 10px",
            borderColor: "#dbe2f0"
          }}
        >
          #{value}
        </Tag>
      )
    },
    {
      title: "Quy trinh",
      dataIndex: "processName",
      key: "processName",
      render: (value) => <Text strong style={{ color: "#172554" }}>{value}</Text>
    },
    {
      title: "Line",
      dataIndex: "lineName",
      key: "lineName",
      width: 190,
      render: (value) => (
        <Tag
          bordered={false}
          style={{
            color: token.colorPrimary,
            background: "#eef4ff",
            fontWeight: 700,
            borderRadius: 999,
            padding: "4px 12px"
          }}
        >
          {value}
        </Tag>
      )
    },
    {
      title: "Uu tien",
      dataIndex: "priority",
      key: "priority",
      width: 110,
      render: (value) => renderPriorityValue(value)
    },
    {
      title: "Trang thai",
      dataIndex: "statusId",
      key: "statusId",
      width: 140,
      render: (value) => renderStatusTag(value)
    },
    {
      title: "Tien do",
      key: "progress",
      width: 170,
      render: (_, record) => (
        <Text style={{ color: record.statusId === 1 ? "#1d4ed8" : "#475569", fontWeight: 600 }}>
          {formatOrderProgress(record)}
        </Text>
      )
    },
    {
      title: "AGV",
      key: "agv",
      width: 150,
      render: (_, record) => <Text type={record.agvName ? undefined : "secondary"}>{record.agvName || "-"}</Text>
    },
    {
      title: "Tao luc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 190,
      render: (value) => <Text>{formatDateTime(value)}</Text>
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", gap: 16 }}>
      <Row gutter={[16, 16]} style={{ flexShrink: 0 }} align="stretch">
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(15,23,42,0.07)", border: "1px solid #e2e8f0", background: "#fff", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DeploymentUnitOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
              </div>
              <div>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", color: "#0f172a" }}>
                  Line dang chon
                </Text>
                <Text strong style={{ fontSize: 16, fontWeight: 800, color: token.colorPrimary }}>
                  {selectedLineName}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(15,23,42,0.07)", border: "1px solid #e2e8f0", background: "#fff", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PlayCircleOutlined style={{ color: "#f59e0b", fontSize: 18 }} />
              </div>
              <div>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", color: "#0f172a" }}>
                  Quy trinh dang chon
                </Text>
                <Text strong style={{ fontSize: 16, fontWeight: 800, color: "#b45309" }}>
                  {selectedProcessName}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(15,23,42,0.07)", border: "1px solid #e2e8f0", background: "#fff", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ClockCircleOutlined style={{ color: "#d97706", fontSize: 18 }} />
              </div>
              <div>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", color: "#0f172a" }}>
                  Lenh dang cho
                </Text>
                <Text strong style={{ fontSize: 22, fontWeight: 800, color: "#d97706" }}>
                  {queue.pendingOrders.length}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(15,23,42,0.07)", border: "1px solid #e2e8f0", background: "#fff", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PlayCircleOutlined style={{ color: "#2563eb", fontSize: 18 }} />
              </div>
              <div>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", color: "#0f172a" }}>
                  Lenh dang chay
                </Text>
                <Text strong style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>
                  {queue.runningOrders.length}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 30px rgba(15,23,42,0.04)",
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column"
        }}
        styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 } }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #f1f5f9",
            background: "#ffffff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            flexShrink: 0
          }}
        >
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} md={8}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text style={filterLabelStyle}>Chon line</Text>
                <Select
                  allowClear
                  showSearch
                  style={{ width: "100%" }}
                  value={selectedLineId}
                  placeholder="Chon line san xuat"
                  loading={loadingLines}
                  optionFilterProp="label"
                  options={lines.map((line) => ({ value: line.id, label: line.name }))}
                  onChange={(value) => {
                    setSelectedLineId(value ?? null);
                    setSelectedProcessId(null);
                  }}
                />
              </Space>
            </Col>

            <Col xs={24} md={10}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text style={filterLabelStyle}>Chon quy trinh</Text>
                <Select
                  allowClear
                  showSearch
                  style={{ width: "100%" }}
                  value={selectedProcessId}
                  placeholder={selectedLineId ? "Chon quy trinh" : "Chon line truoc"}
                  loading={loadingProcesses}
                  disabled={selectedLineId === null}
                  optionFilterProp="label"
                  options={processes.map((process) => ({
                    value: process.id,
                    label: `${process.name} (#${process.id})`
                  }))}
                  onChange={(value) => setSelectedProcessId(value ?? null)}
                />
              </Space>
            </Col>

            <Col xs={24} md={6} style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button icon={<ReloadOutlined />} onClick={() => fetchOrders(selectedLineId, selectedProcessId)} loading={loadingOrders} style={{ borderRadius: 10 }}>
                Tai lai
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateOrder} loading={creatingOrder} disabled={selectedProcessId === null} style={{ borderRadius: 10 }}>
                Tao lenh
              </Button>
            </Col>
          </Row>
        </div>

        <div style={{ padding: "14px 24px 0", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text strong style={{ fontSize: 16, color: "#0f172a" }}>Danh sach lenh</Text>
          <Space size={8}>
            <Tag bordered={false} style={{ color: "#1d4ed8", background: "#dbeafe", fontWeight: 700, borderRadius: 999, padding: "4px 12px" }}>
              {queue.runningOrders.length} dang chay
            </Tag>
            <Tag bordered={false} style={{ color: "#b45309", background: "#fef3c7", fontWeight: 700, borderRadius: 999, padding: "4px 12px" }}>
              {queue.pendingOrders.length} dang cho
            </Tag>
          </Space>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", padding: "8px 24px 24px" }}>
          <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={mergedOrders}
              loading={loadingOrders}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              scroll={{ x: 1180 }}
              rowClassName={(record) => (record.statusId === 1 ? "running-order-row" : "")}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Khong co lenh nao"
                  />
                )
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default TransportOrdersPage;
