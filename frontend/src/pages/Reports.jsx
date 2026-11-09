
import { useEffect, useState } from "react";

import {
  FileChartColumn,
  Download,
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  ClipboardList,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";


const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");


// COMPACT KPI CARD
function MetricCard({
  title,
  value,
  icon: Icon,
  color = "bg-blue-50 text-blue-600",
  background = "bg-white",
}) {
  return (
    <div
      className={`${background} rounded-2xl p-4 border border-slate-100 shadow-sm`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 shrink-0 rounded-xl ${color} flex items-center justify-center`}
        >
          <Icon size={20} />
        </div>

        <p className="text-sm font-semibold text-slate-600">
          {title}
        </p>
      </div>

      <p className="text-2xl font-bold text-[#172d51]">
        {value ?? "—"}
      </p>
    </div>
  );
}

// REPORT TABLE
function ReportTable({ rows, emptyMessage }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-5">
        {emptyMessage}
      </p>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="p-3 text-slate-600 font-semibold whitespace-nowrap"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-b border-slate-100"
            >
              {columns.map((column) => (
                <td
                  key={column}
                  className="p-3 text-slate-600 whitespace-nowrap"
                >
                  {row[column] == null
                    ? "—"
                    : String(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports({ datasetId, data }) {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState("");

  // LOAD VALIDATION RESULTS
  useEffect(() => {
    setValidation(null);
    setError("");
    setDownloadError("");

    if (!datasetId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchValidation() {
      setLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/api/validate/${encodeURIComponent(datasetId)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            "Could not load validation results."
          );
        }

        const result = await response.json();

        if (!controller.signal.aborted) {
          setValidation(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.message || "Unable to load validation report."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchValidation();

    return () => controller.abort();
  }, [datasetId]);

  // DOWNLOAD FILE FROM BACKEND
  async function downloadFile(type) {
    if (!datasetId || downloading) return;

    setDownloadError("");
    setDownloading(type);

    try {
      const response = await fetch(
        `${API_URL}/api/download/${encodeURIComponent(
          datasetId
        )}/${type}`
      );

      if (!response.ok) {
        const details = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          typeof details.detail === "string"
            ? details.detail
            : "Report is unavailable. Run Smart Cleaning first."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const names = {
        cleaned: "cleaned_dataset.csv",
        quality: "quality_report.csv",
        audit: "audit_log.csv",
      };

      const link = document.createElement("a");
      link.href = url;
      link.download = names[type] || "report.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setDownloadError(
        err.message || "Download failed."
      );
    } finally {
      setDownloading("");
    }
  }

  // EXPORT SUMMARY CSV
  function exportSummary() {
    if (!data) return;

    const rows = [
      ["Metric", "Value"],
      ["Filename", data.filename || ""],
      ["Total Records", data.rows ?? ""],
      ["Total Columns", data.columns ?? ""],
      ["Missing Values", data.missing_values ?? ""],
      ["Duplicate Rows", data.duplicates ?? ""],
      ["Quality Score (%)", data.quality_score ?? ""],
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value).replace(/"/g, '""');
            return `"${text}"`;
          })
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "data_quality_summary.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // EMPTY STATE
  if (!datasetId || !data) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
        <Database
          size={40}
          className="mx-auto mb-4 text-blue-600"
        />

        <h2 className="text-2xl font-bold text-[#172d51]">
          No Dataset Available
        </h2>

        <p className="text-slate-500 mt-3">
          Upload a CSV dataset from Home to generate reports.
        </p>
      </div>
    );
  }

  // REPORT DATA
  const missingChart = Array.isArray(data.column_missing)
    ? data.column_missing
    : [];

  const issueSummary = Array.isArray(
    validation?.issue_summary
  )
    ? validation.issue_summary
    : [];

  const totalIssues = validation?.total_issues;

  const reports = [
    {
      title: "Data Quality Summary",
      description:
        "Dataset overview, missing values, duplicates and quality score.",
      icon: FileChartColumn,
      action: exportSummary,
      loading: false,
    },
    {
      title: "Cleaned Dataset",
      description:
        "Download the processed dataset after running Smart Cleaning.",
      icon: FileSpreadsheet,
      action: () => downloadFile("cleaned"),
      loading: downloading === "cleaned",
    },
    {
      title: "Quality Report",
      description:
        "Download the column-level quality report.",
      icon: ShieldCheck,
      action: () => downloadFile("quality"),
      loading: downloading === "quality",
    },
    {
      title: "Cleaning Audit Log",
      description:
        "Review the recorded changes made during cleaning.",
      icon: ClipboardList,
      action: () => downloadFile("audit"),
      loading: downloading === "audit",
    },
  ];

  return (
    <div className="space-y-5 pb-5">

      {/* PAGE HEADER */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 text-xs font-bold tracking-widest mb-2">
          <FileChartColumn size={17} />
          REPORTING WORKSPACE
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-[#172d51]">
          Data Quality Reports
        </h2>

        <p className="text-slate-500 mt-2 text-sm">
          Explore dataset quality, review validation results,
          and download reports.
        </p>

        <div className="flex items-center gap-2 text-sm text-slate-500 mt-3">
          <FileSpreadsheet
            size={17}
            className="text-blue-600"
          />

          {data.filename || "Uploaded Dataset"}
        </div>
      </div>

      {/* COMPACT KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Records"
          value={data.rows ?? "—"}
          icon={Database}
          color="bg-blue-50 text-blue-600"
        />

        <MetricCard
          title="Missing Values"
          value={data.missing_values ?? "—"}
          icon={AlertTriangle}
          color="bg-orange-50 text-orange-600"
        />

        <MetricCard
          title="Duplicate Rows"
          value={data.duplicates ?? "—"}
          icon={FileSpreadsheet}
          color="bg-violet-50 text-violet-600"
        />

        <MetricCard
          title="Quality Score"
          value={
            data.quality_score != null
              ? `${data.quality_score}%`
              : "—"
          }
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* MISSING VALUES CHART */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileChartColumn
              size={20}
              className="text-blue-600"
            />
          </div>

          <h3 className="text-lg font-bold text-[#172d51]">
            Missing Values by Column
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Number of missing values in each dataset column.
        </p>

        {missingChart.length > 0 ? (
          <div className="w-full h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={missingChart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="column"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Bar
                  dataKey="missing"
                  fill="#3478ef"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            No column-level information available.
          </p>
        )}
      </section>

      {/* VALIDATION SUMMARY */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <ShieldCheck
              size={20}
              className="text-blue-600"
            />
          </div>

          <h3 className="text-lg font-bold text-[#172d51]">
            Validation Summary
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-blue-600">
            <RefreshCw
              size={18}
              className="animate-spin"
            />
            Loading validation results...
          </div>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <>
            <div className="mb-5 max-w-sm">
              <MetricCard
                title="Total Validation Issues"
                value={totalIssues ?? "—"}
                icon={AlertTriangle}
                color="bg-orange-50 text-orange-600"
                background="bg-slate-50"
              />
            </div>

            <ReportTable
              rows={issueSummary}
              emptyMessage="No validation issue categories reported."
            />
          </>
        )}
      </section>

      {/* EXPORT REPORTS */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Download
              size={20}
              className="text-blue-600"
            />
          </div>

          <h3 className="text-lg font-bold text-[#172d51]">
            Export Reports
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Download your data quality results as CSV files.
          Cleaning-related downloads require Smart Cleaning
          to have been run first.
        </p>

        {downloadError && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-5 text-sm">
            {downloadError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reports.map((report) => {
            const Icon = report.icon;

            return (
              <div
                key={report.title}
                className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Icon
                        size={20}
                        className="text-blue-600"
                      />
                    </div>

                    <h4 className="font-bold text-[#172d51]">
                      {report.title}
                    </h4>
                  </div>

                  <p className="text-sm text-slate-500">
                    {report.description}
                  </p>
                </div>

                <button
                  onClick={report.action}
                  disabled={Boolean(downloading)}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition"
                >
                  {report.loading ? (
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Download size={17} />
                  )}

                  {report.loading
                    ? "Downloading..."
                    : "Download CSV"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400 pb-4">
        DataQuality 360 • Reporting Workspace
      </p>
    </div>
  );
}
