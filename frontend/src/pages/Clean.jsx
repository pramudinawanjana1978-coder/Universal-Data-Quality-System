
import { useEffect, useState } from "react";
import {
  WandSparkles,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Database,
  Lightbulb,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  Info,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

const VALID_METHODS = [
  "Keep Missing",
  "Mean",
  "Median",
  "Mode",
  "Unknown",
];

function formatNumber(value) {
  if (value === null || value === undefined) return "—";

  return typeof value === "number"
    ? value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
    : String(value);
}

function normalizeMethod(value) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim().toLowerCase();

  const aliases = {
    mean: "Mean",
    median: "Median",
    mode: "Mode",
    unknown: "Unknown",
    "keep missing": "Keep Missing",
    "keep as missing": "Keep Missing",
    "leave missing": "Keep Missing",
    "do nothing": "Keep Missing",
    "no cleaning": "Keep Missing",
  };

  return aliases[text] || null;
}

function getField(row, possibleKeys) {
  if (!row || typeof row !== "object") return null;

  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }

  const entries = Object.entries(row);

  for (const key of possibleKeys) {
    const match = entries.find(
      ([name]) =>
        name.trim().toLowerCase() === key.trim().toLowerCase()
    );

    if (match) return match[1];
  }

  return null;
}

function getRecommendationColumn(row) {
  return getField(row, [
    "Column",
    "column",
    "Column Name",
    "column_name",
    "name",
  ]);
}

function getRecommendationMethod(row) {
  const direct = getField(row, [
    "Recommended Method",
    "Recommended Cleaning Method",
    "Recommended",
    "Recommendation",
    "Suggested Method",
    "Cleaning Method",
    "Method",
    "recommended_method",
    "recommended_cleaning_method",
    "suggested_method",
  ]);

  const normalized = normalizeMethod(direct);

  if (normalized) return normalized;

  if (typeof direct === "string") {
    const text = direct.toLowerCase();

    if (
      text.includes("manual review") ||
      text.includes("keep missing") ||
      text.includes("leave missing")
    ) {
      return "Keep Missing";
    }

    for (const method of [
      "Median",
      "Mean",
      "Mode",
      "Unknown",
    ]) {
      const pattern = new RegExp(
        `\\b${method.toLowerCase()}\\b`,
        "i"
      );

      if (pattern.test(text)) return method;
    }
  }

  return null;
}

function getRecommendationReason(row) {
  const reason = getField(row, [
    "Reason",
    "Explanation",
    "Description",
    "Rationale",
    "Why",
    "Notes",
    "reason",
    "explanation",
  ]);

  return reason === null ? "" : String(reason);
}

function DataTable({ rows, emptyMessage }) {
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
                className="p-4 font-semibold text-slate-600 whitespace-nowrap"
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
                  className="p-4 text-slate-600 whitespace-nowrap"
                >
                  {row[column] === null ||
                  row[column] === undefined
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

export default function Clean({ datasetId }) {
  const [trimSpaces, setTrimSpaces] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);

  const [rules, setRules] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [missingColumns, setMissingColumns] = useState([]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");

  // LOAD PYTHON RECOMMENDATIONS
  useEffect(() => {
    setResult(null);
    setRules({});
    setRecommendations([]);
    setMissingColumns([]);
    setError("");
    setTrimSpaces(true);
    setRemoveDuplicates(false);

    if (!datasetId) return;

    const controller = new AbortController();

    async function loadRecommendations() {
      setPreparing(true);

      try {
        const response = await fetch(
          `${API_URL}/api/recommendations/${encodeURIComponent(
            datasetId
          )}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to load cleaning recommendations."
          );
        }

        if (!controller.signal.aborted) {
          setRecommendations(
            Array.isArray(data.recommendations)
              ? data.recommendations
              : []
          );

          setMissingColumns(
            Array.isArray(data.missing_columns)
              ? data.missing_columns
              : []
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.message || "Failed to load recommendations."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setPreparing(false);
        }
      }
    }

    loadRecommendations();

    return () => controller.abort();
  }, [datasetId]);

  function findRecommendation(columnName) {
    return recommendations.find(
      (row) =>
        String(getRecommendationColumn(row) ?? "")
          .trim()
          .toLowerCase() ===
        String(columnName).trim().toLowerCase()
    );
  }

  function getAvailableMethods(column) {
    const numeric = column.type === "numeric";

    const defaults = numeric
      ? ["Keep Missing", "Mean", "Median", "Mode"]
      : ["Keep Missing", "Mode", "Unknown"];

    const source = Array.isArray(column.methods)
      ? column.methods
      : defaults;

    const methods = source
      .map(normalizeMethod)
      .filter(
        (method) =>
          method &&
          VALID_METHODS.includes(method) &&
          (numeric
            ? method !== "Unknown"
            : method !== "Mean" && method !== "Median")
      );

    return [...new Set(["Keep Missing", ...methods])];
  }

  function applySuggestion(columnName, method) {
    setRules((previous) => ({
      ...previous,
      [columnName]: method,
    }));

    setResult(null);
  }

  function applyAllSuggestions() {
    const updated = { ...rules };

    missingColumns.forEach((column) => {
      const name =
        typeof column === "string"
          ? column
          : column.column ??
            column.Column ??
            column.name;

      if (!name) return;

      const recommendation = findRecommendation(name);
      const method = getRecommendationMethod(recommendation);

      const available = getAvailableMethods(
        typeof column === "string"
          ? { type: "text" }
          : column
      );

      if (method && available.includes(method)) {
        updated[name] = method;
      }
    });

    setRules(updated);
    setResult(null);
  }

  // RUN ORIGINAL PYTHON CLEANING ALGORITHMS
  async function runCleaning() {
    if (!datasetId || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/clean`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset_id: datasetId,
          trim_spaces: trimSpaces,
          remove_duplicates: removeDuplicates,
          cleaning_rules: Object.fromEntries(
            Object.entries(rules).filter(
              ([, method]) =>
                method &&
                method !== "Keep Missing"
            )
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Cleaning failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to clean dataset.");
    } finally {
      setLoading(false);
    }
  }

  // DOWNLOAD CSV REPORTS
  async function downloadReport(type) {
    if (!datasetId || !result) return;

    try {
      const response = await fetch(
        `${API_URL}/api/download/${encodeURIComponent(
          datasetId
        )}/${type}`
      );

      if (!response.ok) {
        throw new Error("Unable to download report.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const filenames = {
        cleaned: "cleaned_dataset.csv",
        quality: "quality_report.csv",
        audit: "audit_log.csv",
      };

      const link = document.createElement("a");

      link.href = url;
      link.download = filenames[type] || "report.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message || "Download failed.");
    }
  }

  // EMPTY STATE
  if (!datasetId) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
        <Database
          size={42}
          className="mx-auto mb-4 text-blue-600"
        />

        <h2 className="text-2xl font-bold text-[#172d51]">
          No Dataset Uploaded
        </h2>

        <p className="text-slate-500 mt-3">
          Upload a CSV file from Home to start cleaning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 text-xs font-bold tracking-widest mb-3">
          <WandSparkles size={18} />
          DATA PREPARATION
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-[#172d51]">
          Smart Data Cleaning
        </h2>

        <p className="text-slate-500 mt-3">
          Review Python-generated recommendations, choose
          cleaning methods, and prepare your dataset.
        </p>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CLEANING CONFIGURATION */}
      <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-[#172d51]">
          Cleaning Configuration
        </h3>

        <p className="text-sm text-slate-500 mt-2 mb-6">
          Select the operations you want to apply.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={trimSpaces}
              onChange={(e) => {
                setTrimSpaces(e.target.checked);
                setResult(null);
              }}
              className="mt-1 w-4 h-4 accent-blue-600"
            />

            <div>
              <p className="font-semibold text-[#172d51]">
                Trim Extra Spaces
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Remove leading and trailing spaces from text.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={removeDuplicates}
              onChange={(e) => {
                setRemoveDuplicates(e.target.checked);
                setResult(null);
              }}
              className="mt-1 w-4 h-4 accent-blue-600"
            />

            <div>
              <p className="font-semibold text-[#172d51]">
                Remove Duplicate Rows
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Remove repeated records from the dataset.
              </p>
            </div>
          </label>
        </div>

        {/* MISSING VALUE CLEANING */}
        <div className="mt-9">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles
                  size={21}
                  className="text-blue-600"
                />

                <h3 className="text-xl font-bold text-[#172d51]">
                  Smart Missing Value Cleaning
                </h3>
              </div>

              <p className="text-sm text-slate-500 mt-2">
                Review suggested methods before applying them.
              </p>
            </div>

            {missingColumns.length > 0 && (
              <button
                onClick={applyAllSuggestions}
                disabled={preparing}
                className="flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition"
              >
                <Sparkles size={17} />
                Apply All Suggestions
              </button>
            )}
          </div>

          {preparing ? (
            <div className="flex items-center gap-3 p-6 bg-slate-50 rounded-2xl text-blue-600">
              <RefreshCw
                size={20}
                className="animate-spin"
              />
              Loading Python recommendations...
            </div>
          ) : missingColumns.length === 0 ? (
            <div className="bg-green-50 text-green-700 p-5 rounded-2xl flex items-center gap-3">
              <CheckCircle2 size={20} />
              No missing-value columns reported.
            </div>
          ) : (
            <div className="space-y-4">
              {missingColumns.map((column, index) => {
                const name =
                  typeof column === "string"
                    ? column
                    : column.column ??
                      column.Column ??
                      column.name;

                if (!name) return null;

                const recommendation =
                  findRecommendation(name);

                const suggestedMethod =
                  getRecommendationMethod(recommendation);

                const reason =
                  getRecommendationReason(recommendation);

                const availableMethods =
                  getAvailableMethods(
                    typeof column === "string"
                      ? { type: "text" }
                      : column
                  );

                const canApply =
                  suggestedMethod &&
                  availableMethods.includes(suggestedMethod);

                const selectedMethod =
                  rules[name] || "Keep Missing";

                const missingCount =
                  typeof column === "object"
                    ? column.missing
                    : null;

                return (
                  <div
                    key={`${name}-${index}`}
                    className="bg-slate-50 border border-slate-100 rounded-2xl p-5 md:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* COLUMN INFORMATION */}
                      <div>
                        <h4 className="text-lg font-bold text-[#172d51]">
                          {name}
                        </h4>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {missingCount != null && (
                            <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">
                              {formatNumber(missingCount)} Missing
                            </span>
                          )}

                          {typeof column === "object" &&
                            column.type && (
                              <span className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                                {column.type}
                              </span>
                            )}
                        </div>
                      </div>

                      {/* METHOD SELECTOR */}
                      <div className="w-full sm:w-52">
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                          Cleaning Method
                        </p>

                        <select
                          value={selectedMethod}
                          onChange={(e) => {
                            setRules((previous) => ({
                              ...previous,
                              [name]: e.target.value,
                            }));
                            setResult(null);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#172d51]"
                        >
                          {availableMethods.map((method) => (
                            <option
                              key={method}
                              value={method}
                            >
                              {method}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* PYTHON RECOMMENDATION */}
                    <div className="mt-5 bg-white border border-blue-100 rounded-2xl p-4 md:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb
                          size={19}
                          className="text-blue-600"
                        />

                        <p className="text-sm font-bold text-[#172d51]">
                          Python Cleaning Recommendation
                        </p>
                      </div>

                      {recommendation ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-sm text-slate-500">
                              Suggested Method:
                            </span>

                            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                              {suggestedMethod ||
                                "Manual Review"}
                            </span>
                          </div>

                          {reason && (
                            <div className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                              <Info
                                size={16}
                                className="shrink-0 mt-0.5 text-blue-500"
                              />

                              <p>{reason}</p>
                            </div>
                          )}

                          {!reason && (
                            <p className="text-sm text-slate-500">
                              Review this column before choosing
                              a cleaning method.
                            </p>
                          )}

                          {canApply && (
                            <button
                              onClick={() =>
                                applySuggestion(
                                  name,
                                  suggestedMethod
                                )
                              }
                              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                            >
                              <CheckCircle2 size={16} />

                              Apply Suggestion

                              <ArrowRight size={16} />
                            </button>
                          )}

                          {!canApply && (
                            <p className="mt-3 text-xs text-amber-700">
                              No supported automatic method was
                              identified. Review this column
                              manually.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          No matching Python recommendation
                          was returned for this column.
                          Select a method manually.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RUN CLEANING BUTTON */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <button
            onClick={runCleaning}
            disabled={loading || preparing}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-7 py-3.5 rounded-xl font-semibold transition"
          >
            {loading ? (
              <RefreshCw
                size={19}
                className="animate-spin"
              />
            ) : (
              <WandSparkles size={19} />
            )}

            {loading
              ? "Cleaning Dataset..."
              : "Run Smart Cleaning"}
          </button>

          <p className="text-xs text-slate-400 mt-3">
            Suggestions only select methods. Cleaning starts
            when you click Run Smart Cleaning.
          </p>
        </div>
      </section>

      {/* ORIGINAL RECOMMENDATION REPORT */}
      {recommendations.length > 0 && (
        <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-[#172d51] mb-2">
            Python Recommendation Report
          </h3>

          <p className="text-sm text-slate-500 mb-5">
            Original recommendations generated by your
            Python cleaning algorithm.
          </p>

          <DataTable
            rows={recommendations}
            emptyMessage="No recommendations available."
          />
        </section>
      )}

      {/* CLEANING RESULTS */}
      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">
                Before Quality Score
              </p>

              <p className="text-3xl font-bold text-[#172d51] mt-3">
                {formatNumber(result.before_score)}%
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">
                After Quality Score
              </p>

              <p className="text-3xl font-bold text-blue-600 mt-3">
                {formatNumber(result.after_score)}%
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">
                Audit Log Entries
              </p>

              <p className="text-3xl font-bold text-[#172d51] mt-3">
                {formatNumber(result.audit_count)}
              </p>
            </div>
          </div>

          {/* BEFORE AFTER COMPARISON */}
          <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-[#172d51] mb-5">
              Before vs After Comparison
            </h3>

            <DataTable
              rows={result.comparison}
              emptyMessage="No comparison data available."
            />
          </section>

          {/* CLEANED DATA PREVIEW */}
          <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-[#172d51] mb-5">
              Cleaned Dataset Preview
            </h3>

            <DataTable
              rows={result.cleaned_preview}
              emptyMessage="No cleaned dataset preview available."
            />
          </section>

          {/* AUDIT LOG PREVIEW */}
          <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-[#172d51] mb-2">
              Cleaning Audit Log
            </h3>

            <p className="text-sm text-slate-500 mb-5">
              Recorded changes made during data cleaning.
            </p>

            <DataTable
              rows={result.audit}
              emptyMessage="No cleaning changes were recorded."
            />
          </section>

          {/* DOWNLOAD SECTION */}
          <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-[#172d51] mb-5">
              Export Cleaning Results
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: "Cleaned Dataset",
                  type: "cleaned",
                },
                {
                  label: "Quality Report",
                  type: "quality",
                },
                {
                  label: "Audit Log",
                  type: "audit",
                },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() =>
                    downloadReport(item.type)
                  }
                  className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 text-[#172d51] p-5 rounded-2xl font-semibold transition"
                >
                  <Download
                    size={18}
                    className="text-blue-600"
                  />

                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="text-center text-xs text-slate-400 pb-4">
        DataQuality 360 • Smart Cleaning Workspace
      </div>
    </div>
  );
}
