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
  Maximize2,
  Minimize2,
  X,
  BarChart2,
  Table as TableIcon,
} from "lucide-react";

/* ─── Chart color palette — muted, professional, distinguishable ─── */
const COLORS = [
  "#5B8DEF",
  "#3EBD93",
  "#E8A44A",
  "#8B7FDE",
  "#E06C75",
  "#56B6C2",
  "#98C379",
  "#D19A66",
];

/* ─── Normalizer for Backward & Forward Compatibility ─── */
function normalizeDashboardSpec(spec) {
  if (!spec) return null;

  if (Array.isArray(spec.pages) && spec.pages.length > 0) {
    return {
      title: spec.title || "Business Intelligence Report",
      subtitle: spec.subtitle || spec.description || "",
      pages: spec.pages.map((p, idx) => ({
        id: p.id || `page-${idx + 1}`,
        name: p.name || `Page ${idx + 1}`,
        summary: p.summary || p.description || "",
        insights: Array.isArray(p.insights) ? p.insights : [],
        kpis: Array.isArray(p.kpis) ? p.kpis : [],
        charts: Array.isArray(p.charts) ? p.charts : [],
      })),
    };
  }

  const legacyCharts = Array.isArray(spec.charts) ? spec.charts : [];
  const legacyKpis = Array.isArray(spec.kpis) ? spec.kpis : [];
  const legacyInsights = Array.isArray(spec.insights) ? spec.insights : [];

  if (legacyCharts.length > 0 || legacyKpis.length > 0) {
    return {
      title: spec.title || "Analytical Summary",
      subtitle: spec.description || "",
      pages: [
        {
          id: "page-1",
          name: spec.title || "Overview",
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

/* ─── Tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded bg-[#1A1D24] border border-[#262A32] px-3 py-2 shadow-lg text-[11px]">
      {label && (
        <p className="font-medium text-[#D0D3D8] mb-1.5 pb-1.5 border-b border-[#262A32]">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const val =
            typeof entry.value === "number"
              ? entry.value.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : entry.value;
          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      entry.color || entry.fill || COLORS[idx % COLORS.length],
                  }}
                />
                <span className="text-[#8B8F98]">{entry.name}</span>
              </div>
              <span className="font-mono font-medium text-[#D0D3D8]">
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Shared axis/grid props ─── */
const GRID_PROPS = { stroke: "#1E2128", vertical: false };
const X_AXIS_PROPS = {
  stroke: "#4A4E58",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
};
const Y_AXIS_PROPS = {
  stroke: "#4A4E58",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  width: 48,
  tickFormatter: (v) =>
    v >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)}M`
      : v >= 1_000
      ? `${(v / 1_000).toFixed(0)}k`
      : v,
};
const LEGEND_PROPS = {
  wrapperStyle: { fontSize: "11px", paddingTop: "12px", color: "#6B7075" },
  iconType: "circle",
  iconSize: 6,
};
const MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };

/* ─── Chart Card ─── */
function ChartCard({ chart, onExpand, expanded = false }) {
  const [view, setView] = useState("chart");
  const type = (chart.type || "bar").toLowerCase();
  const xKey = chart.xAxisKey || "name";
  const data = Array.isArray(chart.data) ? chart.data : [];

  const dataKeys =
    Array.isArray(chart.dataKeys) && chart.dataKeys.length > 0
      ? chart.dataKeys
      : [{ key: "value", name: chart.metricName || "Value", color: COLORS[0] }];

  const h = expanded ? 360 : 260;

  return (
    <div className="group flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-2.5 gap-2">
        <div className="min-w-0">
          <h4 className="text-[13px] font-medium text-[#D0D3D8] leading-snug">
            {chart.title}
          </h4>
          {chart.description && (
            <p className="text-[11px] text-[#4A4E58] mt-0.5 leading-normal">
              {chart.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
            className={`p-1 rounded transition-colors ${
              view === "table"
                ? "text-[#5B8DEF]"
                : "text-[#3A3E48] hover:text-[#8B8F98]"
            }`}
            title={view === "chart" ? "View data" : "View chart"}
          >
            {view === "chart" ? (
              <TableIcon size={14} />
            ) : (
              <BarChart2 size={14} />
            )}
          </button>
          {onExpand && (
            <button
              onClick={() => onExpand(chart)}
              className="p-1 rounded text-[#3A3E48] hover:text-[#8B8F98] transition-colors"
              title="Expand"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ height: `${h}px` }} className="w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-[#4A4E58]">
            No data available
          </div>
        ) : view === "table" ? (
          /* ── Data Table ── */
          <div className="h-full overflow-auto rounded border border-[#1E2128] bg-[#0E1017]">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#14161C] text-[#6B7075] sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-medium w-8">#</th>
                  <th className="px-3 py-2 font-medium">{xKey}</th>
                  {dataKeys.map((dk) => (
                    <th
                      key={dk.key}
                      className="px-3 py-2 font-medium text-right"
                    >
                      {dk.name || dk.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[#B0B4BC] divide-y divide-[#1A1D24]">
                {data.map((row, ri) => (
                  <tr key={ri} className="hover:bg-[#14161C]/60">
                    <td className="px-3 py-2 text-[#4A4E58] font-mono">
                      {ri + 1}
                    </td>
                    <td className="px-3 py-2 text-[#D0D3D8]">
                      {String(row[xKey] ?? "")}
                    </td>
                    {dataKeys.map((dk) => (
                      <td
                        key={dk.key}
                        className="px-3 py-2 text-right font-mono"
                      >
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
        ) : type === "line" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey={xKey} {...X_AXIS_PROPS} />
              <YAxis {...Y_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <Legend {...LEGEND_PROPS} />
              {dataKeys.map((dk, i) => (
                <Line
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name || dk.key}
                  stroke={dk.color || COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: dk.color || COLORS[i % COLORS.length], r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : type === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={MARGIN}>
              <defs>
                {dataKeys.map((dk, i) => {
                  const c = dk.color || COLORS[i % COLORS.length];
                  return (
                    <linearGradient
                      key={`g_${dk.key}`}
                      id={`g_${dk.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={c} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey={xKey} {...X_AXIS_PROPS} />
              <YAxis {...Y_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <Legend {...LEGEND_PROPS} />
              {dataKeys.map((dk, i) => {
                const c = dk.color || COLORS[i % COLORS.length];
                return (
                  <Area
                    key={dk.key}
                    type="monotone"
                    dataKey={dk.key}
                    name={dk.name || dk.key}
                    stroke={c}
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill={`url(#g_${dk.key})`}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : type === "pie" || type === "donut" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<ChartTooltip />} />
              <Legend {...LEGEND_PROPS} />
              <Pie
                data={data}
                dataKey={dataKeys[0]?.key || "value"}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                innerRadius={type === "donut" ? 50 : 0}
                outerRadius={80}
                paddingAngle={1}
                stroke="#0C0D12"
                strokeWidth={1}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`c-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          /* Default: Bar */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey={xKey} {...X_AXIS_PROPS} />
              <YAxis {...Y_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <Legend {...LEGEND_PROPS} />
              {dataKeys.map((dk, i) => (
                <Bar
                  key={dk.key}
                  dataKey={dk.key}
                  name={dk.name || dk.key}
                  fill={dk.color || COLORS[i % COLORS.length]}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ─── Chart Expand Modal ─── */
function ChartModal({ chart, onClose }) {
  if (!chart) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#12141A] rounded p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded text-[#6B7075] hover:text-[#D0D3D8] transition-colors"
        >
          <X size={16} />
        </button>
        <h3 className="text-[15px] font-semibold text-[#D0D3D8] mb-1">
          {chart.title}
        </h3>
        {chart.description && (
          <p className="text-[12px] text-[#6B7075] mb-4">{chart.description}</p>
        )}
        <div className="w-full">
          <ChartCard chart={chart} expanded />
        </div>
      </div>
    </div>
  );
}

/* ─── CSV Export ─── */
function exportPageToCsv(page, reportTitle) {
  if (!page || !Array.isArray(page.charts) || page.charts.length === 0) return;

  let csv = "";
  csv += `Report,${JSON.stringify(reportTitle || "Report")}\r\n`;
  csv += `Page,${JSON.stringify(page.name || "Overview")}\r\n\r\n`;

  page.charts.forEach((chart, idx) => {
    csv += `--- ${chart.title || `Chart ${idx + 1}`} ---\r\n`;
    const xKey = chart.xAxisKey || "name";
    const dks =
      Array.isArray(chart.dataKeys) && chart.dataKeys.length > 0
        ? chart.dataKeys
        : [{ key: "value", name: "Value" }];

    const headers = [xKey, ...dks.map((dk) => dk.name || dk.key)];
    csv += headers.map((h) => JSON.stringify(h)).join(",") + "\r\n";

    (Array.isArray(chart.data) ? chart.data : []).forEach((row) => {
      const line = [
        row[xKey],
        ...dks.map((dk) => (row[dk.key] !== undefined ? row[dk.key] : "")),
      ];
      csv +=
        line
          .map((v) => JSON.stringify(v !== undefined ? v : ""))
          .join(",") + "\r\n";
    });
    csv += "\r\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (page.name || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  a.download = `${safeName}_data.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════════
   Main Dashboard Component
   ════════════════════════════════════════════════════════════════ */
export default function InteractiveDashboard({ spec }) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modalChart, setModalChart] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (modalChart) setModalChart(null);
        else if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalChart, isFullscreen]);

  const report = normalizeDashboardSpec(spec);
  if (!report || report.pages.length === 0) return null;

  const pages = report.pages;
  const page = pages[activePageIndex] || pages[0];
  const kpis = page.kpis || [];
  const charts = page.charts || [];
  const insights = page.insights || [];

  const gridCols =
    charts.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2";

  /* ─── Dashboard body (shared between inline and fullscreen) ─── */
  const body = (fs = false) => (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold text-[#E0E2E6] tracking-tight leading-tight">
            {report.title}
          </h3>
          {(page.summary || report.subtitle) && (
            <p className="text-[12px] text-[#6B7075] mt-1 leading-normal">
              {page.summary || report.subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0 pt-0.5">
          <button
            onClick={() => exportPageToCsv(page, report.title)}
            className="text-[11px] text-[#4A4E58] hover:text-[#8B8F98] transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => setIsFullscreen(!fs)}
            className="text-[11px] text-[#4A4E58] hover:text-[#8B8F98] transition-colors flex items-center gap-1"
          >
            {fs ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{fs ? "Close" : "Expand"}</span>
          </button>
        </div>
      </div>

      {/* ── Page tabs ── */}
      {pages.length > 1 && (
        <div className="flex items-center gap-5 border-b border-[#1E2128] mb-5 overflow-x-auto">
          {pages.map((p, idx) => {
            const active = idx === activePageIndex;
            return (
              <button
                key={p.id || idx}
                onClick={() => setActivePageIndex(idx)}
                className={`pb-2.5 text-[12px] font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                  active
                    ? "text-[#D0D3D8] border-[#5B8DEF]"
                    : "text-[#4A4E58] border-transparent hover:text-[#8B8F98]"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── KPIs ── */}
      {kpis.length > 0 && (
        <div
          className={`grid gap-x-6 gap-y-4 mb-6 ${
            kpis.length <= 2
              ? "grid-cols-2"
              : kpis.length === 3
              ? "grid-cols-3"
              : "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          {kpis.map((kpi, idx) => {
            const isPos =
              typeof kpi.change === "string" &&
              kpi.change.trim().startsWith("+");
            const isNeg =
              typeof kpi.change === "string" &&
              kpi.change.trim().startsWith("-");

            return (
              <div key={idx} className="min-w-0">
                <div className="text-[10px] text-[#5A5E66] font-medium uppercase tracking-wider mb-1 truncate">
                  {kpi.label}
                </div>
                <div className="text-[20px] font-semibold text-[#E0E2E6] tracking-tight font-mono leading-none">
                  {typeof kpi.value === "number"
                    ? kpi.value.toLocaleString()
                    : kpi.value}
                </div>
                {kpi.change && (
                  <div
                    className={`text-[11px] mt-1.5 leading-tight ${
                      isPos
                        ? "text-[#3EBD93]"
                        : isNeg
                        ? "text-[#E06C75]"
                        : "text-[#5A5E66]"
                    }`}
                  >
                    {kpi.change}
                    {kpi.description && (
                      <span className="text-[#3E424B] ml-1.5">
                        · {kpi.description}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] text-[#5A5E66] font-medium uppercase tracking-wider mb-2">
            Key Insights
          </div>
          <ul className="space-y-1 text-[12.5px] text-[#8B8F98] leading-relaxed">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-[7px] w-1 h-1 rounded-full bg-[#4A4E58] shrink-0" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Charts ── */}
      {charts.length > 0 && (
        <div className={`grid gap-5 ${gridCols}`}>
          {charts.map((chart, idx) => (
            <div
              key={chart.id || idx}
              className="bg-[#12141A] rounded px-4 py-4"
            >
              <ChartCard
                chart={chart}
                onExpand={setModalChart}
                expanded={fs}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Inline dashboard */}
      <div className="my-5 pt-5 border-t border-[#1E2128]">{body(false)}</div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#0A0C10] overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6 relative">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 p-1.5 rounded text-[#6B7075] hover:text-[#D0D3D8] transition-colors"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
            {body(true)}
          </div>
        </div>
      )}

      {/* Chart expand modal */}
      {modalChart && (
        <ChartModal chart={modalChart} onClose={() => setModalChart(null)} />
      )}
    </>
  );
}
