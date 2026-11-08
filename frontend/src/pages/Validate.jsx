
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  RefreshCw,
  Database,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

// COMPACT KPI CARD
function KPICard({
  title,
  value,
  icon: Icon,
  iconBg = "bg-blue-50",
  iconColor = "text-blue-600",
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 shrink-0 rounded-xl ${iconBg} flex items-center justify-center`}
        >
          <Icon size={20} className={iconColor} />
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

// EXPORT VALIDATION ISSUES
function downloadCSV(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const headers = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row)))
  );

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
  link.download = "validation_issues.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Validate({ datasetId }) {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState("All");
  const [refreshCount, setRefreshCount] = useState(0);

  // LOAD VALIDATION RESULTS
  useEffect(() => {
    setValidation(null);
    setError("");
    setSearch("");
    setSelectedIssue("All");

    if (!datasetId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadValidation() {
      setLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/api/validate/${encodeURIComponent(datasetId)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          const details = await response.json().catch(() => ({}));

          throw new Error(
            typeof details.detail === "string"
              ? details.detail
              : "Unable to validate dataset."
          );
        }

        const result = await response.json();

        if (!controller.signal.aborted) {
          setValidation(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Validation failed.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadValidation();

    return () => controller.abort();
  }, [datasetId, refreshCount]);

  // EMPTY STATE
  if (!datasetId) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
        <Database
          size={40}
          className="text-blue-600 mx-auto mb-4"
        />

        <h2 className="text-2xl font-bold text-[#172d51]">
          No Dataset Uploaded
        </h2>

        <p className="text-slate-500 mt-3">
          Upload a CSV dataset from Home to start data validation.
        </p>
      </div>
    );
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-5" />

        <h2 className="text-xl font-bold text-[#172d51]">
          Validating Dataset...
        </h2>

        <p className="text-slate-500 mt-2">
          Running Python validation rules.
        </p>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertTriangle
          size={36}
          className="text-red-500 mx-auto mb-4"
        />

        <h2 className="text-xl font-bold text-red-700">
          Validation Failed
        </h2>

        <p className="text-red-600 mt-3">{error}</p>

        <button
          onClick={() => setRefreshCount((count) => count + 1)}
          className="mt-5 bg-red-600 text-white px-5 py-3 rounded-xl"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!validation) return null;

  // VALIDATION DATA
  const issues = Array.isArray(validation.issues)
    ? validation.issues
    : [];

  const issueSummary = Array.isArray(validation.issue_summary)
    ? validation.issue_summary
    : [];

  const totalIssues = Number(validation.total_issues || 0);
  const issueTypes = issueSummary.length;

  const filteredIssues = issues.filter((issue) => {
    const matchesType =
      selectedIssue === "All" ||
      issue.Issue === selectedIssue;

    const matchesSearch = Object.values(issue).some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );

    return matchesType && matchesSearch;
  });

  const issueColumns = Array.from(
    new Set(issues.flatMap((issue) => Object.keys(issue)))
  );

  return (
    <div className="space-y-5 pb-5">

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold tracking-widest mb-2">
            <ShieldCheck size={17} />
            DATA VALIDATION
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-[#172d51]">
            Data Validation
          </h2>

          <p className="text-slate-500 mt-2 text-sm">
            Detect data quality issues using your existing
            Python validation rules.
          </p>
        </div>

        <button
          onClick={() => setRefreshCount((count) => count + 1)}
          className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#172d51] hover:bg-slate-50"
        >
          <RefreshCw size={17} />
          Run Validation
        </button>
      </div>

      {/* COMPACT KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard
          title="Total Issues"
          value={formatNumber(totalIssues)}
          icon={AlertTriangle}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />

        <KPICard
          title="Issue Categories"
          value={formatNumber(issueTypes)}
          icon={ShieldCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <KPICard
          title="Validation Status"
          value={totalIssues === 0 ? "Passed" : "Review"}
          icon={CheckCircle2}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
      </div>

      {/* ISSUE DISTRIBUTION */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <ShieldCheck
              size={20}
              className="text-blue-600"
            />
          </div>

          <h3 className="text-lg font-bold text-[#172d51]">
            Issue Distribution
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Number of validation findings by issue type.
        </p>

        {issueSummary.length > 0 ? (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={issueSummary}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 25,
                  bottom: 5,
                  left: 15,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                />

                <YAxis
                  dataKey="Issue Type"
                  type="category"
                  width={145}
                  tick={{ fontSize: 11 }}
                />

                <Tooltip />

                <Bar
                  dataKey="Count"
                  fill="#3478ef"
                  radius={[0, 7, 7, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-green-50 rounded-xl p-8 text-center text-green-700">
            <CheckCircle2
              size={32}
              className="mx-auto mb-3"
            />

            <p className="font-semibold">
              No Validation Issues Detected
            </p>

            <p className="text-sm mt-2">
              The dataset passed the configured validation rules.
            </p>
          </div>
        )}
      </section>

      {/* VALIDATION ISSUES TABLE */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#172d51]">
              Validation Issues
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Review individual validation findings.
            </p>
          </div>

          <button
            onClick={() => downloadCSV(filteredIssues)}
            disabled={filteredIssues.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>

        {/* SEARCH AND FILTER */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-3">
            <Search
              size={18}
              className="text-slate-400"
            />

            <input
              type="text"
              placeholder="Search issues..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-transparent outline-none text-sm w-44"
            />
          </div>

          <select
            value={selectedIssue}
            onChange={(event) =>
              setSelectedIssue(event.target.value)
            }
            className="bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none"
          >
            <option value="All">All Issue Types</option>

            {issueSummary.map((item) => (
              <option
                key={item["Issue Type"]}
                value={item["Issue Type"]}
              >
                {item["Issue Type"]}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Showing {filteredIssues.length.toLocaleString()} of{" "}
          {issues.length.toLocaleString()} findings
        </p>

        {filteredIssues.length > 0 ? (
          <div className="overflow-auto max-h-125">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  {issueColumns.map((column) => (
                    <th
                      key={column}
                      className="p-3 whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredIssues.map((issue, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    {issueColumns.map((column) => (
                      <td
                        key={column}
                        className="p-3 whitespace-nowrap"
                      >
                        {issue[column] === null ||
                        issue[column] === undefined
                          ? "—"
                          : String(issue[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">
            <CheckCircle2
              size={32}
              className="mx-auto mb-3 text-green-600"
            />

            No matching validation issues.
          </div>
        )}
      </section>

      {/* FOOTER */}
      <div className="text-center text-xs text-slate-400 pb-4">
        DataQuality 360 • Validation Workspace
      </div>
    </div>
  );
}
