import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Card,
  Col,
  Row,
  Select,
  Space,
  Table,
  Typography,
  Spin,
  Badge,
  Input,
  Statistic,
  Tag,
  Grid,
  Pagination,
  theme
} from "antd";
import {
  SaveOutlined,
  DeploymentUnitOutlined,
  SearchOutlined,
  BlockOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { apiClient, API_ENDPOINTS, getApiErrorMessage } from "../config/api";
import { showSuccessMessage, showErrorMessage } from "../utils/appMessage";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const PRIORITY_OPTIONS = [
  { value: 0, label: <Badge color="default" text="0 - Bỏ qua / Không ưu tiên" /> },
  { value: 1, label: <Badge color="blue"    text="1 - Ưu tiên Thấp nhất" /> },
  { value: 2, label: <Badge color="cyan"    text="2 - Ưu tiên Thấp" /> },
  { value: 3, label: <Badge color="green"   text="3 - Ưu tiên Trung bình" /> },
  { value: 4, label: <Badge color="orange"  text="4 - Ưu tiên Cao" /> },
  { value: 5, label: <Badge color="red"     text="5 - Ưu tiên Cao nhất" /> },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: null,  label: "Tất cả mức ưu tiên" },
  { value: 0,     label: "0 - Bỏ qua / Không ưu tiên" },
  { value: 1,     label: "1 - Ưu tiên Thấp nhất" },
  { value: 2,     label: "2 - Ưu tiên Thấp" },
  { value: 3,     label: "3 - Ưu tiên Trung bình" },
  { value: 4,     label: "4 - Ưu tiên Cao" },
  { value: 5,     label: "5 - Ưu tiên Cao nhất" },
];

function priorityTag(val) {
  const map = {
    1: { color: "blue",   text: "ƯU TIÊN 1" },
    2: { color: "cyan",   text: "ƯU TIÊN 2" },
    3: { color: "green",  text: "ƯU TIÊN 3" },
    4: { color: "orange", text: "ƯU TIÊN 4" },
    5: { color: "red",    text: "ƯU TIÊN 5" },
  };
  const m = map[val];
  if (!m) return <Tag bordered={false} style={{ fontWeight: 600, padding: "2px 10px", borderRadius: 20 }}>CHƯA ĐẶT</Tag>;
  return (
    <Tag color={m.color} bordered={false} style={{ fontWeight: 600, padding: "2px 10px", borderRadius: 20 }}>
      {m.text}
    </Tag>
  );
}

function ProcessPriorityPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const { token } = theme.useToken();
  const primaryColor = token.colorPrimary;

  const [lines, setLines] = useState([]);
  const [allProcesses, setAllProcesses] = useState([]); // enriched with lineId, lineName
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterLineId, setFilterLineId] = useState(null);   // null = all lines
  const [filterName, setFilterName] = useState("");
  const [filterPriority, setFilterPriority] = useState(null); // null = all priorities

  // Pending changes: { [processId]: newPriority }
  const [dirtyPriorities, setDirtyPriorities] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Fetch lines on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetchLines();
  }, []);

  const fetchLines = async () => {
    setLoadingLines(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.lines);
      setLines(res.data);
      return res.data;
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, "Không thể tải danh sách Line sản xuất."));
      return [];
    } finally {
      setLoadingLines(false);
    }
  };

  // ── Fetch ALL processes for all lines ────────────────────────────────────
  const fetchAllProcesses = useCallback(async (lineList) => {
    if (!lineList || lineList.length === 0) return;
    setLoadingProcesses(true);
    setDirtyPriorities({});
    try {
      const results = await Promise.all(
        lineList.map(async (line) => {
          const res = await apiClient.get(`${API_ENDPOINTS.processes}?lineId=${line.id}`);
          return res.data.map((p) => ({ ...p, lineId: line.id, lineName: line.name }));
        })
      );
      setAllProcesses(results.flat());
      setCurrentPage(1);
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, "Không thể tải danh sách quy trình."));
    } finally {
      setLoadingProcesses(false);
    }
  }, []);

  // After lines load → fetch all processes
  useEffect(() => {
    if (lines.length > 0) {
      fetchAllProcesses(lines);
    }
  }, [lines, fetchAllProcesses]);

  // ── Priority change ───────────────────────────────────────────────────────
  const handlePriorityChange = (processId, value) => {
    setDirtyPriorities((prev) => ({ ...prev, [processId]: value }));
  };

  // ── Save all dirty ────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    const dirtyIds = Object.keys(dirtyPriorities);
    if (dirtyIds.length === 0) {
      showSuccessMessage("Không có thay đổi nào cần lưu.");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        dirtyIds.map((id) =>
          apiClient.put(API_ENDPOINTS.updatePriority(id), { priority: dirtyPriorities[id] })
        )
      );
      showSuccessMessage("Cập nhật cấu hình mức độ ưu tiên thành công!");
      setDirtyPriorities({});
      await fetchAllProcesses(lines);
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, "Lỗi xảy ra khi lưu cấu hình mức độ ưu tiên."));
    } finally {
      setSaving(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const isDirty = Object.keys(dirtyPriorities).length > 0;
  const selectedLineId = filterLineId ?? null;
  const selectedPriority = filterPriority ?? null;

  const filteredProcesses = allProcesses.filter((p) => {
    if (selectedLineId !== null && p.lineId !== selectedLineId) return false;
    if (filterName.trim()) {
      const q = filterName.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.id.toString().includes(q)) return false;
    }
    if (selectedPriority !== null) {
      const cur = dirtyPriorities[p.id] !== undefined ? dirtyPriorities[p.id] : p.priority;
      if (cur !== selectedPriority) return false;
    }
    return true;
  });

  const pagedProcesses = filteredProcesses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const selectedLineName =
    selectedLineId !== null
      ? lines.find((l) => l.id === selectedLineId)?.name || "Chưa xác định"
      : "Tất cả";
  const filterLabelStyle = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#0f172a"
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 90,
      render: (id) => (
        <Tag color="default" style={{ fontWeight: 600, fontSize: 12, borderRadius: 6, padding: "2px 8px" }}>
          #{id}
        </Tag>
      ),
    },
    {
      title: "Tên Quy trình",
      dataIndex: "name",
      key: "name",
      render: (name, record) => {
        const hasChanges = dirtyPriorities[record.id] !== undefined;
        return (
          <Space size={8}>
            <Text strong style={{ color: "#1e293b", fontSize: 13 }}>{name}</Text>
            {hasChanges && (
              <Badge
                status="processing"
                text={
                  <Text type="warning" strong style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Chưa lưu
                  </Text>
                }
              />
            )}
          </Space>
        );
      },
    },
    {
      title: "Line Sản xuất",
      dataIndex: "lineName",
      key: "lineName",
      width: 160,
      render: (lineName) => (
        <Tag color="geekblue" bordered={false} style={{ fontWeight: 600, borderRadius: 20, padding: "2px 10px" }}>
          {lineName}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_, record) => {
        const cur =
          dirtyPriorities[record.id] !== undefined ? dirtyPriorities[record.id] : record.priority;
        return priorityTag(cur);
      },
    },
    {
      title: "Cấu hình Độ ưu tiên",
      key: "priority",
      width: 300,
      render: (_, record) => {
        const cur =
          dirtyPriorities[record.id] !== undefined ? dirtyPriorities[record.id] : record.priority;
        return (
          <Select
            value={cur}
            onChange={(value) => handlePriorityChange(record.id, value)}
            style={{ width: "100%", maxWidth: 270 }}
            placeholder="Chọn mức ưu tiên"
            options={PRIORITY_OPTIONS}
          />
        );
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", gap: 16 }}>

      {/* Stats – single row */}
      <Row gutter={[16, 16]} style={{ flexShrink: 0 }} align="stretch">
        {/* Card 1: Line đang lọc */}
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(15,23,42,0.07)", border: "1px solid #e2e8f0", background: "#fff", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DeploymentUnitOutlined style={{ color: primaryColor, fontSize: 18 }} />
              </div>
              <div>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", color: "#0f172a" }}>Line đang lọc</Text>
                <Text strong style={{ fontSize: 16, fontWeight: 800, color: primaryColor }}>{selectedLineName}</Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 2: Số Line */}
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(15,23,42,0.07)", border: "1px solid #e2e8f0", background: "#fff", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DeploymentUnitOutlined style={{ color: primaryColor, fontSize: 18 }} />
              </div>
              <div>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", color: "#0f172a" }}>Số Line</Text>
                <Text strong style={{ fontSize: 22, fontWeight: 800, color: primaryColor }}>{lines.length}</Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 3: Số Quy trình */}
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(15,23,42,0.07)", border: "1px solid #e2e8f0", background: "#fff", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BlockOutlined style={{ color: primaryColor, fontSize: 18 }} />
              </div>
              <div>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", color: "#0f172a" }}>Số Quy trình</Text>
                <Text strong style={{ fontSize: 22, fontWeight: 800, color: primaryColor }}>{allProcesses.length}</Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 4: Phân bổ ưu tiên */}
        <Col xs={24} sm={12} md={10}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(15,23,42,0.07)", border: "1px solid #e2e8f0", background: "#fff", height: "100%" }}>
            <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8, color: "#0f172a" }}>
              Phân bổ ưu tiên
            </Text>
            <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
              {[
                { level: 0, label: "Bỏ qua",    color: "#94a3b8" },
                { level: 1, label: "Thấp nhất", color: "#3b82f6" },
                { level: 2, label: "Thấp",       color: "#06b6d4" },
                { level: 3, label: "TB",          color: "#10b981" },
                { level: 4, label: "Cao",         color: "#f59e0b" },
                { level: 5, label: "Cao nhất",   color: "#ef4444" },
              ].map(({ level, label, color }) => {
                const count = allProcesses.filter((p) => {
                  const cur = dirtyPriorities[p.id] !== undefined ? dirtyPriorities[p.id] : p.priority;
                  return cur === level;
                }).length;
                return (
                  <div key={level} style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                    <Text strong style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{count}</Text>
                    <Text style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{label}</Text>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>



      {/* Main Card */}
      <Card
        style={{
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 30px rgba(15,23,42,0.04)",
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 } }}
      >
        {/* Toolbar */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #f1f5f9",
            background: "#ffffff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            flexShrink: 0,
          }}
        >
          <Row gutter={[12, 12]} align="bottom">
            {/* Filter: Name */}
            <Col xs={24} sm={12} md={7}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text style={filterLabelStyle}>
                  <SearchOutlined style={{ marginRight: 4 }} />Tên quy trình / ID
                </Text>
                <Input
                  placeholder="Tìm kiếm theo Tên hoặc ID..."
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  value={filterName}
                  onChange={(e) => { setFilterName(e.target.value); setCurrentPage(1); }}
                  size="large"
                  allowClear
                />
              </Space>
            </Col>

            {/* Filter: Line */}
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text style={filterLabelStyle}>
                  <FilterOutlined style={{ marginRight: 4 }} />Line sản xuất
                </Text>
                <Select
                  placeholder="Tất cả line"
                  value={selectedLineId}
                  onChange={(v) => { setFilterLineId(v ?? null); setCurrentPage(1); }}
                  loading={loadingLines}
                  style={{ width: "100%" }}
                  size="large"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={lines.map((l) => ({ value: l.id, label: l.name }))}
                />
              </Space>
            </Col>

            {/* Filter: Priority */}
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text style={filterLabelStyle}>
                  <FilterOutlined style={{ marginRight: 4 }} />Mức độ ưu tiên
                </Text>
                <Select
                  placeholder="Tất cả mức ưu tiên"
                  value={selectedPriority}
                  onChange={(v) => { setFilterPriority(v ?? null); setCurrentPage(1); }}
                  style={{ width: "100%" }}
                  size="large"
                  allowClear
                  options={PRIORITY_FILTER_OPTIONS}
                />
              </Space>
            </Col>

            {/* Actions */}
            <Col xs={24} sm={12} md={5} style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveAll}
                disabled={!isDirty || saving}
                loading={saving}
                size="large"
                style={{ borderRadius: 10 }}
              >
                Lưu cấu hình
              </Button>
            </Col>
          </Row>
        </div>

        {/* Table */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Spin spinning={loadingProcesses} wrapperClassName="flex-spin-wrapper">
            <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              <Table
                dataSource={pagedProcesses}
                columns={columns}
                rowKey="id"
                sticky
                pagination={false}
                rowClassName={(record) =>
                  dirtyPriorities[record.id] !== undefined ? "dirty-table-row" : ""
                }
                locale={{
                  emptyText:
                    allProcesses.length === 0
                      ? "Đang tải dữ liệu..."
                      : "Không tìm thấy quy trình nào khớp với bộ lọc",
                }}
              />
            </div>
          </Spin>
        </div>

        {/* Pagination footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #f1f5f9",
            background: "#ffffff",
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 16,
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tổng số <b>{filteredProcesses.length}</b> quy trình
          </Text>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredProcesses.length}
            showSizeChanger
            pageSizeOptions={["10", "20", "50", "100"]}
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }}
            onShowSizeChange={(_, size) => {
              setCurrentPage(1);
              setPageSize(size);
            }}
          />
        </div>
      </Card>
    </div>
  );
}

export default ProcessPriorityPage;
