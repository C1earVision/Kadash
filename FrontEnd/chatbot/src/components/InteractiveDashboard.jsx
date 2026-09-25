import React, { useState } from "react";
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
  X,
  BarChart2,
  Layers,
  Info,
} from "lucide-react";

// Curated sleek SaaS palette
const PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

/* ─── Custom Dark Tooltip ─── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-[#272B35] bg-[#0C0E13]/95 backdrop-blur-md p-2.5 shadow-xl text-xs">
      {label && <p className="font-medium text-[#F3F4F6] mb-1.5">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const val =
            typeof entry.value === "number"
              ? entry.value.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : entry.value;

          return (
            <div key={idx} className="flex items-center justify-between gap-3 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: entry.color || entry.fill || "#3B82F6" }}
                />
                <span className="text-[#9CA3AF]">{entry.name}:</span>
              </div>
              <span className="font-mono font-medium text-[#F3F4F6]">{val}</span>
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

  return (
    <div className="p-3.5 rounded-xl bg-[#151820] border border-[#272B35] shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-medium mb-1">
        <span className="truncate">{kpi.label}</span>
        {kpi.change && (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isNegative
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            }`}
          >
            {isPositive && <TrendingUp size={11} />}
            {isNegative && <TrendingDown size={11} />}
            {kpi.change}
          </span>
        )}
      </div>

      <div className="text-[20px] font-semibold text-[#F3F4F6] tracking-tight font-mono">
        {typeof kpi.value === "number"
          ? kpi.value.toLocaleString()
          : kpi.value}
      </div>

      {kpi.description && (
        <p className="text-[11px] text-[#6B7280] mt-1 truncate">
          {kpi.description}
        </p>
      )}
    </div>
  );
}

/* ─── Individual Chart Card ─── */
function ChartCard({ chart, onExpand }) {
  const chartType = (chart.type || "bar").toLowerCase();
  const xAxisKey = chart.xAxisKey || "name";
  const data = Array.isArray(chart.data) ? chart.data : [];

  // Determine metric data keys
  const dataKeys =
    Array.isArray(chart.dataKeys) && chart.dataKeys.length > 0
      ? chart.dataKeys
      : [{ key: "value", name: chart.metricName || "Value", color: PALETTE[0] }];

  return (
    <div className="flex flex-col rounded-xl bg-[#151820] border border-[#272B35] p-4 shadow-sm">
      {/* Chart Header */}
      <div className="flex items-start justify-between mb-3.5">
        <div>
          <h4 className="text-[14px] font-medium text-[#F3F4F6] tracking-tight">
            {chart.title}
          </h4>
          {chart.description && (
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">
              {chart.description}
            </p>
          )}
        </div>
        {onExpand && (
          <button
            onClick={() => onExpand(chart)}
            className="p-1.5 rounded-md text-[#6B7280] hover:text-[#D1D5DB] hover:bg-[#272B35] transition-colors"
            title="Expand chart"
          >
            <Maximize2 size={13} />
          </button>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[270px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#6B7280]">
            No data points available
          </div>
        ) : chartType === "line" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
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
                innerRadius={chartType === "donut" ? 52 : 0}
                outerRadius={82}
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
            <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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

/* ─── Lightbox Modal for Enlarged Chart ─── */
function ChartModal({ chart, onClose }) {
  if (!chart) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#11131A] border border-[#272B35] rounded-2xl p-6 shadow-2xl relative"
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
          <ChartCard chart={chart} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dynamic Interactive Dashboard Component ─── */
export default function InteractiveDashboard({ spec }) {
  const [modalChart, setModalChart] = useState(null);

  if (!spec) return null;

  const kpis = Array.isArray(spec.kpis) ? spec.kpis : [];
  const charts = Array.isArray(spec.charts) ? spec.charts : [];

  if (kpis.length === 0 && charts.length === 0) return null;

  // Grid columns based on chart count
  const chartGridCols =
    charts.length === 1
      ? "grid-cols-1"
      : charts.length === 2
      ? "grid-cols-1 lg:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2";

  return (
    <div className="my-4 rounded-2xl border border-[#272B35] bg-[#0E1017] p-5 shadow-lg space-y-4">
      {/* Dashboard Top Banner (Title & Context) */}
      {(spec.title || spec.description) && (
        <div className="border-b border-[#1E2230] pb-3.5">
          {spec.title && (
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BarChart2 size={15} />
              </span>
              <h3 className="text-[15px] font-semibold text-[#F3F4F6] tracking-tight">
                {spec.title}
              </h3>
            </div>
          )}
          {spec.description && (
            <p className="text-[12.5px] text-[#9CA3AF] mt-1">
              {spec.description}
            </p>
          )}
        </div>
      )}

      {/* KPI Scorecards Grid */}
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

      {/* Interactive Charts Grid */}
      {charts.length > 0 && (
        <div className={`grid gap-4 ${chartGridCols}`}>
          {charts.map((chart, idx) => (
            <ChartCard
              key={chart.id || idx}
              chart={chart}
              onExpand={setModalChart}
            />
          ))}
        </div>
      )}

      {/* Full-Screen Chart Modal */}
      {modalChart && (
        <ChartModal chart={modalChart} onClose={() => setModalChart(null)} />
      )}
    </div>
  );
}
