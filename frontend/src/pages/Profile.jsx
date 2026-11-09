import { useState } from "react";
import {
  Database, Columns3, BarChart3, Search, AlertTriangle,
  CheckCircle2, Layers3, FileSpreadsheet, Download,
  Activity, TrendingUp, TrendingDown, Gauge,
} from "lucide-react";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }
  return String(value);
}

function KPICard({
  title, value, icon: Icon,
  iconBg = "bg-blue-50",
  iconColor = "text-blue-600",
  background = "bg-white",
}) {
  return (
    <div className={`${background} rounded-2xl p-4 border border-slate-100 shadow-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 shrink-0 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={20} className={iconColor} />
        </div>
        <p className="text-sm font-semibold text-slate-600">
          {title}
        </p>
      </div>
      <p className="text-2xl font-bold text-[#172d51]">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function downloadCSV(rows, filename) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const headers = ["Row Number", "Column", "Value", "Status"];
  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      headers.map((key) => escapeCSV(row[key])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const navItems = [
  {
    label: "Column Quality",
    target: "profile-column-quality",
    icon: Columns3,
  },
  {
    label: "Statistics",
    target: "profile-statistics",
    icon: BarChart3,
  },
  {
    label: "Outliers",
    target: "profile-outliers",
    icon: Activity,
  },
];

export default function Profile({ profile, loading, error }) {
  const [search, setSearch] = useState("");
  const [selectedOutlierColumn, setSelectedOutlierColumn] =
    useState("");

  const [activeSection, setActiveSection] = useState("");

  function navigateToSection(target) {
    setActiveSection(target);
    document.getElementById(target)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-5" />
        <h2 className="text-xl font-bold text-[#172d51]">
          Analyzing Dataset...
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          Preparing your data profiling report.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
        <AlertTriangle
          size={36}
          className="text-red-500 mx-auto mb-4"
        />
        <h2 className="text-xl font-bold text-red-700">
          Unable to Load Data Profile
        </h2>
        <p className="text-red-600 mt-3">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
        <Database
          size={40}
          className="mx-auto mb-4 text-blue-600"
        />
        <h2 className="text-2xl font-bold text-[#172d51]">
          Data Profiling
        </h2>
        <p className="text-slate-500 mt-3">
          Upload a CSV dataset from Home to explore your data.
        </p>
      </div>
    );
  }

  const columns = Array.isArray(profile.columns)
    ? profile.columns : [];

  const statistics = Array.isArray(profile.statistics)
    ? profile.statistics : [];

  const outliers = Array.isArray(profile.outliers)
    ? profile.outliers : [];

  const outlierDetails = profile.outlier_details || {};

  const totalMissing = columns.reduce(
    (sum, col) => sum + Number(col.missing || 0), 0
  );

  const columnsWithMissing = columns.filter(
    (col) => Number(col.missing || 0) > 0
  ).length;

  const filteredColumns = columns.filter((col) =>
    String(col.name || "").toLowerCase().includes(
      search.toLowerCase()
    )
  );

  const chartData = [...columns]
    .filter((col) => Number(col.missing || 0) > 0)
    .sort(
      (a, b) =>
        Number(b.missing_percentage || 0) -
        Number(a.missing_percentage || 0)
    )
    .slice(0, 10);

  const activeOutlierColumn = outliers.some(
    (item) => item.Column === selectedOutlierColumn
  )
    ? selectedOutlierColumn
    : outliers[0]?.Column || "";

  const selectedOutlier = outliers.find(
    (item) => item.Column === activeOutlierColumn
  );

  const selectedDetails = Array.isArray(
    outlierDetails[activeOutlierColumn]
  )
    ? outlierDetails[activeOutlierColumn]
    : [];

  const totalOutliers = outliers.reduce(
    (sum, item) =>
      sum + Number(item["Outlier Count"] || 0), 0
  );

  const columnsWithOutliers = outliers.filter(
    (item) => Number(item["Outlier Count"] || 0) > 0
  ).length;

  return (
    <div className="space-y-5 pb-5">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold tracking-widest mb-2">
            <Layers3 size={16} />
            DATA EXPLORATION
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-[#172d51]">
            Data Profiling
          </h2>

          <p className="text-slate-500 mt-2 text-sm">
            Explore dataset structure, missing values,
            numerical statistics and outliers.
          </p>
        </div>

        <span className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-semibold">
          <CheckCircle2 size={16} />
          Profile Generated
        </span>
      </div>

      {/* QUICK NAVIGATION */}
      <nav
        aria-label="Profile section navigation"
        className="sticky top-2 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
         

          {navItems.map(({ label, target, icon: Icon }) => (
            <button
              key={target}
              type="button"
              onClick={() => navigateToSection(target)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeSection === target
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Total Records"
          value={profile.rows}
          icon={Database}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          title="Total Columns"
          value={columns.length}
          icon={Columns3}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
        <KPICard
          title="Missing Cells"
          value={totalMissing}
          icon={AlertTriangle}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <KPICard
          title="Columns with Missing"
          value={columnsWithMissing}
          icon={FileSpreadsheet}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
      </div>

      {/* MISSING VALUES CHART */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <BarChart3 size={20} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-[#172d51]">
            Missing Values Distribution
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Top 10 columns with the highest missing value percentages.
        </p>

        {chartData.length > 0 ? (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 10, right: 15, left: 0, bottom: 60,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  angle={-30}
                  textAnchor="end"
                  height={90}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [
                    `${formatNumber(value)}%`,
                    "Missing Values",
                  ]}
                />
                <Bar
                  dataKey="missing_percentage"
                  fill="#3478ef"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={55}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 rounded-xl p-8 text-center">
            <CheckCircle2 size={30} className="mx-auto mb-3" />
            No Missing Values Detected
          </div>
        )}
      </section>

      {/* COLUMN QUALITY REPORT */}
      <section
        id="profile-column-quality"
        className="scroll-mt-28 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#172d51]">
              Column Quality Report
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Detailed information about dataset columns.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-3">
            <Search size={17} className="text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search columns..."
              className="bg-transparent outline-none text-sm w-40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
            
<table className="w-full text-sm text-left">
  <thead className="bg-slate-50 text-slate-600">
    <tr>
      <th className="p-3">Column Name</th>
      <th className="p-3">Data Type</th>
      <th className="p-3">Missing Count</th>
      <th className="p-3">Missing %</th>
      <th className="p-3">Unique Values</th>
      <th className="p-3">Status</th>
    </tr>
  </thead>

  <tbody>
    {filteredColumns.map((col) => (
      <tr
        key={col.name}
        className="border-b border-slate-100 hover:bg-slate-50"
      >
        <td className="p-3 font-semibold text-[#172d51]">
          {col.name}
        </td>

        <td className="p-3">
          <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs">
            {col.type}
          </span>
        </td>

        <td className="p-3">
          {formatNumber(col.missing)}
        </td>

        {/* MISSING PERCENTAGE - NO PROGRESS BAR */}
        <td className="p-3">
          <span
            className={`text-sm font-semibold ${
              Number(col.missing_percentage) > 20
                ? "text-red-600"
                : Number(col.missing_percentage) > 0
                ? "text-orange-600"
                : "text-green-600"
            }`}
          >
            {formatNumber(col.missing_percentage)}%
          </span>
        </td>

        <td className="p-3">
          {formatNumber(col.unique)}
        </td>

        <td className="p-3">
          {Number(col.missing) > 0 ? (
            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">
              <AlertTriangle size={13} />
              Missing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
              <CheckCircle2 size={13} />
              Complete
            </span>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>


          {filteredColumns.length === 0 && (
            <p className="text-center py-8 text-slate-500">
              No matching columns found.
            </p>
          )}
        </div>
      </section>

      {/* NUMERICAL STATISTICS */}
      <section
        id="profile-statistics"
        className="scroll-mt-28 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
            <BarChart3 size={20} className="text-violet-600" />
          </div>
          <h3 className="text-lg font-bold text-[#172d51]">
            Numerical Statistics
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Statistical summary of numeric columns.
        </p>

        {statistics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">Column</th>
                  <th className="p-3">Mean</th>
                  <th className="p-3">Median</th>
                  <th className="p-3">Minimum</th>
                  <th className="p-3">Maximum</th>
                </tr>
              </thead>

              <tbody>
                {statistics.map((item) => (
                  <tr
                    key={item.column}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-3 font-semibold text-[#172d51]">
                      {item.column}
                    </td>
                    <td className="p-3">
                      {formatNumber(item.mean)}
                    </td>
                    <td className="p-3">
                      {formatNumber(item.median)}
                    </td>
                    <td className="p-3">
                      {formatNumber(item.minimum)}
                    </td>
                    <td className="p-3">
                      {formatNumber(item.maximum)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-8 text-slate-500">
            No numerical columns found.
          </p>
        )}
      </section>

      {/* IQR OUTLIER DETECTION */}
      <section
        id="profile-outliers"
        className="scroll-mt-28 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center">
              <Activity size={22} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#172d51]">
                IQR Outlier Detection
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Detect unusual numerical values using
                the Interquartile Range method.
              </p>
            </div>
          </div>

          <span className="bg-blue-50 text-blue-700 px-3 py-2 rounded-full text-xs font-semibold">
            Python IQR Analysis
          </span>
        </div>

        {/* OUTLIER KPI CARDS */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <KPICard
            title="Total Outlier Flags"
            value={totalOutliers}
            icon={AlertTriangle}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            background="bg-orange-50"
          />
          <KPICard
            title="Columns with Outliers"
            value={columnsWithOutliers}
            icon={Columns3}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            background="bg-blue-50"
          />
        </div>

        {outliers.length > 0 ? (
          <>
            {/* OUTLIER SUMMARY */}
            <h4 className="text-lg font-bold text-[#172d51] mb-4">
              Outlier Summary
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3">Column</th>
                    <th className="p-3">Outlier Count</th>
                    <th className="p-3">Outlier %</th>
                    <th className="p-3">Lower Bound</th>
                    <th className="p-3">Upper Bound</th>
                  </tr>
                </thead>

                <tbody>
                  {outliers.map((item) => (
                    <tr
                      key={item.Column}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-3 font-semibold text-[#172d51]">
                        {item.Column}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            Number(item["Outlier Count"]) > 0
                              ? "text-orange-600 font-bold"
                              : "text-green-600"
                          }
                        >
                          {formatNumber(item["Outlier Count"])}
                        </span>
                      </td>
                      <td className="p-3">
                        {formatNumber(item["Outlier %"])}%
                      </td>
                      <td className="p-3">
                        {formatNumber(item["Lower Bound"])}
                      </td>
                      <td className="p-3">
                        {formatNumber(item["Upper Bound"])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SELECT OUTLIER COLUMN */}
            <div className="mt-7">
              <label
                htmlFor="outlier-column"
                className="block text-sm font-semibold text-[#172d51] mb-3"
              >
                Select Column for Outlier Analysis
              </label>

              <select
                id="outlier-column"
                value={activeOutlierColumn}
                onChange={(e) =>
                  setSelectedOutlierColumn(e.target.value)
                }
                className="w-full md:w-80 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              >
                {outliers.map((item) => (
                  <option
                    key={item.Column}
                    value={item.Column}
                  >
                    {item.Column}
                  </option>
                ))}
              </select>
            </div>

            {/* SELECTED OUTLIER METRICS */}
            {selectedOutlier && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                <KPICard
                  title="Potential Outliers"
                  value={selectedOutlier["Outlier Count"]}
                  icon={Gauge}
                  iconBg="bg-orange-50"
                  iconColor="text-orange-600"
                  background="bg-slate-50"
                />
                <KPICard
                  title="Lower Bound"
                  value={selectedOutlier["Lower Bound"]}
                  icon={TrendingDown}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  background="bg-slate-50"
                />
                <KPICard
                  title="Upper Bound"
                  value={selectedOutlier["Upper Bound"]}
                  icon={TrendingUp}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                  background="bg-slate-50"
                />
              </div>
            )}

            {/* OUTLIER DETAILS */}
            <div className="mt-7">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h4 className="text-lg font-bold text-[#172d51]">
                    Outlier Details
                  </h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Individual values flagged for review.
                  </p>
                </div>

                {selectedDetails.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadCSV(
                        selectedDetails,
                        "outlier_report.csv"
                      )
                    }
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                  >
                    <Download size={17} />
                    Download CSV
                  </button>
                )}
              </div>

              {selectedDetails.length > 0 ? (
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-3">Row Number</th>
                        <th className="p-3">Column</th>
                        <th className="p-3">Value</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedDetails.map((item, index) => (
                        <tr
                          key={index}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-3">
                            {item["Row Number"]}
                          </td>
                          <td className="p-3 font-medium">
                            {item.Column}
                          </td>
                          <td className="p-3">
                            {formatNumber(item.Value)}
                          </td>
                          <td className="p-3">
                            <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">
                              Review
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-green-50 text-green-700 rounded-xl p-7 text-center">
                  <CheckCircle2
                    size={30}
                    className="mx-auto mb-3"
                  />
                  <p className="font-semibold">
                    No outliers detected in this column.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <CheckCircle2
              size={30}
              className="text-green-600 mx-auto mb-3"
            />
            <p className="font-semibold text-[#172d51]">
              No suitable numeric columns for IQR analysis.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              The Python IQR method requires suitable
              numeric data with sufficient variation.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-6">
          Outliers are flagged for review only.
          No records are automatically removed.
        </p>
      </section>

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400 pb-4">
        DataQuality 360 • Data Profiling Workspace
      </p>
    </div>
  );
}