import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
  X,
  BarChart2,
  Layers,
  Info,
  Sparkles,
  Download,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  DollarSign,
  Package,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

// Curated SaaS PowerBI color palette
const PALETTE = [
  "#3B82F6", // Electric Blue
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Magenta/Pink
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Coral
  "#84CC16", // Lime
];

/* ─── Page Icon Resolver ─── */
function getPageIcon(iconName) {
  const icon = (iconName || "").toLowerCase();
  if (icon.includes("over") || icon.includes("exec") || icon.includes("dash"))
    return LayoutDashboard;
  if (icon.includes("fin") || icon.includes("rev") || icon.includes("mon"))
    return DollarSign;
  if (icon.includes("prod") || icon.includes("cat") || icon.includes("item"))
    return Package;
  if (icon.includes("oper") || icon.includes("inv") || icon.includes("stock"))
    return Activity;
  if (icon.includes("cust") || icon.includes("user") || icon.includes("client"))
    return Users;
  if (icon.includes("alert") || icon.includes("risk") || icon.includes("warn"))
    return AlertTriangle;
  return BarChart2;
}

/* ─── Normalizer for Backward & Forward Compatibility ─── */
function normalizeDashboardSpec(spec) {
  if (!spec) return null;

  // If pages array is present and populated
  if (Array.isArray(spec.pages) && spec.pages.length > 0) {
    return {
      title: spec.title || "Enterprise Business Intelligence Report",
      subtitle: spec.subtitle || spec.description || "",
      pages: spec.pages.map((p, idx) => ({
        id: p.id || `page-${idx + 1}`,
        name: p.name || `Page ${idx + 1}`,
        icon: p.icon || "overview",
        summary: p.summary || p.description || "",
        insights: Array.isArray(p.insights) ? p.insights : [],
        kpis: Array.isArray(p.kpis) ? p.kpis : [],
        charts: Array.isArray(p.charts) ? p.charts : [],
      })),
    };
  }

  // Fallback: If legacy single-page spec (charts and/or kpis at top level)
  const legacyCharts = Array.isArray(spec.charts) ? spec.charts : [];
  const legacyKpis = Array.isArray(spec.kpis) ? spec.kpis : [];
  const legacyInsights = Array.isArray(spec.insights) ? spec.insights : [];

  if (legacyCharts.length > 0 || legacyKpis.length > 0) {
    return {
      title: spec.title || "Analytical Summary Report",
      subtitle: spec.description || "",
      pages: [
        {
          id: "page-1",
          name: spec.title || "Executive Overview",
          icon: "overview",
          summary: spec.description || "",
          insights: legacyInsights,
          kpis: legacyKpis,
          charts: legacyCharts,
        },
      ],
    };
  }

  return null;
}

/* ─── Custom Dark Tooltip ─── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-[#2E3446] bg-[#0A0C12]/95 backdrop-blur-md p-3 shadow-2xl text-xs z-50 min-w-[140px]">
      {label && (
        <p className="font-semibold text-[#F3F4F6] pb-1.5 mb-2 border-b border-[#1E2230]">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, idx) => {
          const val =
            typeof entry.value === "number"
              ? entry.value.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : entry.value;

          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 text-[12px]"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                  style={{
                    backgroundColor:
                      entry.color || entry.fill || PALETTE[idx % PALETTE.length],
                  }}
                />
                <span className="text-[#9CA3AF] truncate max-w-[110px]">
                  {entry.name}:
                </span>
              </div>
              <span className="font-mono font-medium text-[#F3F4F6]">
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── KPI Scorecard Component ─── */
function KpiCard({ kpi }) {
  if (!kpi) return null;
  const isPositive =
    typeof kpi.change === "string" && kpi.change.trim().startsWith("+");
  const isNegative =
    typeof kpi.change === "string" && kpi.change.trim().startsWith("-");
  const isWarning =
    typeof kpi.change === "string" &&
    (kpi.change.toLowerCase().includes("warn") ||
      kpi.change.toLowerCase().includes("risk") ||
      kpi.change.toLowerCase().includes("alert"));

  return (
    <div className="group relative p-4 rounded-xl bg-gradient-to-b from-[#161922] to-[#12141C] border border-[#272B35] hover:border-[#383F50] transition-all shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-medium mb-1.5 gap-2">
        <span className="truncate tracking-wide">{kpi.label}</span>
        {kpi.change && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isNegative
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : isWarning
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            }`}
          >
            {isPositive && <TrendingUp size={11} />}
            {isNegative && <TrendingDown size={11} />}
            {isWarning && <AlertTriangle size={11} />}
            {kpi.change}
          </span>
        )}
      </div>

      <div className="text-[22px] font-bold text-[#F9FAFB] tracking-tight font-mono my-1">
        {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
      </div>

      {kpi.description && (
        <p className="text-[11px] text-[#6B7280] mt-1 truncate">
          {kpi.description}
        </p>
      )}
    </div>
  );
}

/* ─── Individual Chart Card with View Toggle & Data Table ─── */
function ChartCard({ chart, onExpand, isFullscreen = false }) {
  const [viewMode, setViewMode] = useState("chart"); // 'chart' | 'table'
  const chartType = (chart.type || "bar").toLowerCase();
  const xAxisKey = chart.xAxisKey || "name";
  const data = Array.isArray(chart.data) ? chart.data : [];

  // Determine metric data keys
  const dataKeys =
    Array.isArray(chart.dataKeys) && chart.dataKeys.length > 0
      ? chart.dataKeys
      : [{ key: "value", name: chart.metricName || "Value", color: PALETTE[0] }];

  const chartHeight = isFullscreen ? 340 : 270;

  return (
    <div className="flex flex-col rounded-xl bg-gradient-to-b from-[#151821] to-[#11131A] border border-[#272B35] p-4 shadow-sm hover:border-[#383F50] transition-colors">
      {/* Chart Header */}
      <div className="flex items-start justify-between mb-3.5 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[14px] font-semibold text-[#F3F4F6] tracking-tight truncate">
              {chart.title}
            </h4>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1F2430] text-[#9CA3AF] border border-[#2E3446]">
              {chartType}
            </span>
          </div>
          {chart.description && (
            <p className="text-[12px] text-[#9CA3AF] mt-0.5 truncate">
              {chart.description}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}
            className={`p-1.5 rounded-md transition-colors text-xs flex items-center gap-1 ${
              viewMode === "table"
                ? "bg-blue-600 text-white"
                : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1E2230]"
            }`}
            title={viewMode === "chart" ? "View data table" : "View chart visual"}
          >
            {viewMode === "chart" ? <TableIcon size={13} /> : <BarChart2 size={13} />}
          </button>
          {onExpand && (
            <button
              onClick={() => onExpand(chart)}
              className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1E2230] transition-colors"
              title="Expand visual"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas or Data Table */}
      <div style={{ height: `${chartHeight}px` }} className="w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#6B7280]">
            No data points available
          </div>
        ) : viewMode === "table" ? (
          /* Data Table View */
          <div className="h-full overflow-auto rounded-lg border border-[#222734] bg-[#0E1017]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#161922] text-[#9CA3AF] sticky top-0 border-b border-[#222734] z-10">
                <tr>
                  <th className="p-2.5 font-medium text-[#6B7280] w-10">#</th>
                  <th className="p-2.5 font-medium capitalize">{xAxisKey}</th>
                  {dataKeys.map((dk) => (
                    <th key={dk.key} className="p-2.5 font-medium text-right capitalize">
                      {dk.name || dk.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1E29] text-[#E5E7EB]">
                {data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#161A24] transition-colors">
                    <td className="p-2.5 text-[#6B7280] font-mono">{rIdx + 1}</td>
                    <td className="p-2.5 font-medium text-[#F3F4F6]">
                      {String(row[xAxisKey] ?? "")}
                    </td>
                    {dataKeys.map((dk) => (
                      <td key={dk.key} className="p-2.5 text-right font-mono text-[#93C5FD]">
                        {typeof row[dk.key] === "number"
                          ? row[dk.key].toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : String(row[dk.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : chartType === "line" ? (
          /* Line Chart */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid stroke="#1E2230" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#272B35" }}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
              />
              {dataKeys.map((dk, i) => (
                <Line
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name || dk.key}
                  stroke={dk.color || PALETTE[i % PALETTE.length]}
                  strokeWidth={2.5}
                  dot={{ fill: dk.color || PALETTE[i % PALETTE.length], r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : chartType === "area" ? (
          /* Area Chart */
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                {dataKeys.map((dk, i) => {
                  const color = dk.color || PALETTE[i % PALETTE.length];
                  return (
                    <linearGradient
                      key={`grad_${dk.key}`}
                      id={`grad_${dk.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={color} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid stroke="#1E2230" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#272B35" }}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
              />
              {dataKeys.map((dk, i) => {
                const color = dk.color || PALETTE[i % PALETTE.length];
                return (
                  <Area
                    key={dk.key}
                    type="monotone"
                    dataKey={dk.key}
                    name={dk.name || dk.key}
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#grad_${dk.key})`}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : chartType === "pie" || chartType === "donut" ? (
          /* Pie / Donut Chart */
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
              />
              <Pie
                data={data}
                dataKey={dataKeys[0]?.key || "value"}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                innerRadius={chartType === "donut" ? 54 : 0}
                outerRadius={85}
                paddingAngle={2}
                stroke="#151820"
                strokeWidth={2}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PALETTE[index % PALETTE.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          /* Default: Bar Chart */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid stroke="#1E2230" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#272B35" }}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
              />
              {dataKeys.map((dk, i) => (
                <Bar
                  key={dk.key}
                  dataKey={dk.key}
                  name={dk.name || dk.key}
                  fill={dk.color || PALETTE[i % PALETTE.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ─── Client-side CSV Exporter ─── */
function exportPageToCsv(page, reportTitle) {
  if (!page || !Array.isArray(page.charts) || page.charts.length === 0) return;

  let csvContent = "";
  csvContent += `Report,${JSON.stringify(reportTitle || "PowerBI Report")}\r\n`;
  csvContent += `Page,${JSON.stringify(page.name || "Overview")}\r\n\r\n`;

  // Append each chart's aggregated data
  page.charts.forEach((chart, idx) => {
    csvContent += `--- Chart ${idx + 1}: ${chart.title || "Visual"} ---\r\n`;
    const xAxisKey = chart.xAxisKey || "name";
    const dataKeys =
      Array.isArray(chart.dataKeys) && chart.dataKeys.length > 0
        ? chart.dataKeys
        : [{ key: "value", name: "Value" }];

    // Column Headers
    const headers = [xAxisKey, ...dataKeys.map((dk) => dk.name || dk.key)];
    csvContent += headers.map((h) => JSON.stringify(h)).join(",") + "\r\n";

    // Rows
    const rows = Array.isArray(chart.data) ? chart.data : [];
    rows.forEach((row) => {
      const line = [
        row[xAxisKey],
        ...dataKeys.map((dk) => (row[dk.key] !== undefined ? row[dk.key] : "")),
      ];
      csvContent +=
        line.map((val) => JSON.stringify(val !== undefined ? val : "")).join(",") +
        "\r\n";
    });
    csvContent += "\r\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const safeName = (page.name || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  link.setAttribute("download", `${safeName}_data.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ─── Enlarged Lightbox Modal ─── */
function ChartModal({ chart, onClose }) {
  if (!chart) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#10121A] border border-[#272B35] rounded-2xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#1E2230] text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors"
        >
          <X size={18} />
        </button>

        <h3 className="text-[17px] font-semibold text-[#F3F4F6] mb-1">
          {chart.title}
        </h3>
        {chart.description && (
          <p className="text-[13px] text-[#9CA3AF] mb-4">{chart.description}</p>
        )}

        <div className="w-full h-[450px]">
          <ChartCard chart={chart} isFullscreen={true} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dynamic Multi-Page PowerBI Dashboard ─── */
export default function InteractiveDashboard({ spec }) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modalChart, setModalChart] = useState(null);

  // Close fullscreen on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (modalChart) setModalChart(null);
        else if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalChart, isFullscreen]);

  const report = normalizeDashboardSpec(spec);
  if (!report || report.pages.length === 0) return null;

  const pages = report.pages;
  const activePage = pages[activePageIndex] || pages[0];
  const kpis = activePage.kpis || [];
  const charts = activePage.charts || [];
  const insights = activePage.insights || [];

  // Dynamic grid columns based on chart count
  const chartGridCols =
    charts.length === 1
      ? "grid-cols-1"
      : charts.length === 2
      ? "grid-cols-1 lg:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2";

  // Dashboard content renderer (shared between standard and fullscreen views)
  const renderDashboardBody = (fullscreen = false) => (
    <div className="space-y-4">
      {/* ─── Top Control Header (PowerBI Style) ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 border-b border-[#1E2230] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              PowerBI Report View
            </span>
            <span className="text-xs text-[#6B7280]">
              {pages.length} {pages.length === 1 ? "Page" : "Pages"} •{" "}
              {charts.length} {charts.length === 1 ? "Visual" : "Visuals"}
            </span>
          </div>
          <h3 className="text-[17px] font-bold text-[#F3F4F6] tracking-tight mt-1">
            {report.title}
          </h3>
          {(report.subtitle || activePage.summary) && (
            <p className="text-[12.5px] text-[#9CA3AF] mt-0.5">
              {activePage.summary || report.subtitle}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => exportPageToCsv(activePage, report.title)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#1E2230] text-[#D1D5DB] border border-[#272B35] text-xs font-medium transition-colors"
            title="Export this page's chart data to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!fullscreen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
            title={fullscreen ? "Exit presentation mode" : "Open in full canvas mode"}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{fullscreen ? "Exit View" : "Full Canvas"}</span>
          </button>
        </div>
      </div>

      {/* ─── Multi-Page Navigation Tab Bar ─── */}
      {pages.length > 1 && (
        <div className="flex items-center justify-between border-b border-[#1E2230] pb-2 pt-0.5 gap-2 flex-wrap">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {pages.map((page, idx) => {
              const isActive = idx === activePageIndex;
              const IconComp = getPageIcon(page.icon);
              return (
                <button
                  key={page.id || idx}
                  onClick={() => setActivePageIndex(idx)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20 border border-blue-400/40"
                      : "bg-[#151820] text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1E2230] border border-[#272B35]"
                  }`}
                >
                  <IconComp
                    size={14}
                    className={isActive ? "text-white" : "text-[#9CA3AF]"}
                  />
                  <span>{page.name}</span>
                  {page.charts && page.charts.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-[#272B35] text-[#9CA3AF]"
                      }`}
                    >
                      {page.charts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Page Counter & Arrows */}
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] shrink-0">
            <span className="font-mono text-[11px]">
              Page {activePageIndex + 1} of {pages.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                disabled={activePageIndex === 0}
                className="p-1 rounded bg-[#151820] border border-[#272B35] disabled:opacity-40 hover:bg-[#1E2230] text-[#D1D5DB]"
                title="Previous page"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() =>
                  setActivePageIndex((p) => Math.min(pages.length - 1, p + 1))
                }
                disabled={activePageIndex === pages.length - 1}
                className="p-1 rounded bg-[#151820] border border-[#272B35] disabled:opacity-40 hover:bg-[#1E2230] text-[#D1D5DB]"
                title="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Executive Insights & Key Takeaways Banner ─── */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded bg-amber-500/20 text-amber-300">
              <Sparkles size={14} />
            </span>
            <h4 className="text-[12.5px] font-bold text-amber-200 tracking-wider uppercase">
              Executive Insights & Key Takeaways
            </h4>
          </div>
          <ul className="space-y-1.5 text-[12.5px] text-[#E5E7EB]">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── KPI Scorecard Cards Grid ─── */}
      {kpis.length > 0 && (
        <div
          className={`grid gap-3 ${
            kpis.length === 1
              ? "grid-cols-1"
              : kpis.length === 2
              ? "grid-cols-2"
              : kpis.length === 3
              ? "grid-cols-1 sm:grid-cols-3"
              : "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          {kpis.map((kpi, idx) => (
            <KpiCard key={idx} kpi={kpi} />
          ))}
        </div>
      )}

      {/* ─── Interactive Charts Grid ─── */}
      {charts.length > 0 && (
        <div className={`grid gap-4 ${chartGridCols}`}>
          {charts.map((chart, idx) => (
            <ChartCard
              key={chart.id || idx}
              chart={chart}
              onExpand={setModalChart}
              isFullscreen={fullscreen}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Standard In-Chat Dashboard Container */}
      <div className="my-4 rounded-2xl border border-[#272B35] bg-[#0C0E14] p-5 shadow-xl space-y-4">
        {renderDashboardBody(false)}
      </div>

      {/* ─── Full-Screen Presentation Mode Overlay ─── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#080A10]/95 backdrop-blur-xl p-4 md:p-8 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-7xl mx-auto bg-[#0C0E14] border border-[#272B35] rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-5 right-5 p-2 rounded-lg bg-[#1E2230] text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors"
              title="Close full canvas mode (Esc)"
            >
              <X size={18} />
            </button>
            {renderDashboardBody(true)}
          </div>
        </div>
      )}

      {/* ─── Single Chart Lightbox Zoom Modal ─── */}
      {modalChart && (
        <ChartModal chart={modalChart} onClose={() => setModalChart(null)} />
      )}
    </>
  );
}
