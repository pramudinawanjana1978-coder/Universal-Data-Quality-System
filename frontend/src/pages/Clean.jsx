
import { useEffect, useState } from "react";
import {
  WandSparkles,
  Download,
  AlertTriangle,
  Database,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

function DataTable({ rows = [] }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p className="text-slate-500">No data available.</p>;
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column} className="p-3 whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b">
              {columns.map((column) => (
                <td key={column} className="p-3 whitespace-nowrap">
                  {row[column] == null ? "—" : String(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Clean({ uploadedFile }) {
  const [trimSpaces, setTrimSpaces] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [rules, setRules] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [missingColumns, setMissingColumns] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setResult(null);
    setRules({});
    setRecommendations([]);
    setMissingColumns([]);
    setError("");
    setTrimSpaces(true);
    setRemoveDuplicates(false);

    if (!uploadedFile) return;

    const controller = new AbortController();

    async function loadRecommendations() {
      setPreparing(true);

      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const response = await fetch(
          `${API_URL}/api/recommendations-file`,
          {
            method: "POST",
            body: formData,
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Recommendations failed.");
        }

        if (!controller.signal.aborted) {
          setRecommendations(data.recommendations || []);
          setMissingColumns(data.missing_columns || []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPreparing(false);
        }
      }
    }

    loadRecommendations();
    return () => controller.abort();
  }, [uploadedFile]);

  function createFormData() {
    const formData = new FormData();

    formData.append("file", uploadedFile);
    formData.append("trim_spaces", String(trimSpaces));
    formData.append(
      "remove_duplicates",
      String(removeDuplicates)
    );

    const selectedRules = Object.fromEntries(
      Object.entries(rules).filter(
        ([, method]) => method && method !== "Keep Missing"
      )
    );

    formData.append(
      "cleaning_rules",
      JSON.stringify(selectedRules)
    );

    return formData;
  }

  function getRecommendation(columnName) {
    return recommendations.find((item) => {
      const name =
        item.Column ??
        item.column ??
        item["Column Name"] ??
        item.column_name;

      return String(name || "").toLowerCase() ===
        String(columnName).toLowerCase();
    });
  }

  function getSuggestedMethod(item) {
    if (!item) return null;

    const value = String(
      item["Recommended Method"] ??
      item["Recommended Cleaning Method"] ??
      item.Recommendation ??
      item.Method ??
      item.recommended_method ??
      ""
    ).toLowerCase();

    for (const method of ["Median", "Mean", "Mode", "Unknown"]) {
      if (value.includes(method.toLowerCase())) return method;
    }

    return null;
  }

  function availableMethods(column) {
    return column.type === "numeric"
      ? ["Keep Missing", "Mean", "Median", "Mode"]
      : ["Keep Missing", "Mode", "Unknown"];
  }

  function applyAllSuggestions() {
    const updated = { ...rules };

    missingColumns.forEach((column) => {
      const suggestion = getSuggestedMethod(
        getRecommendation(column.column)
      );

      if (suggestion && availableMethods(column).includes(suggestion)) {
        updated[column.column] = suggestion;
      }
    });

    setRules(updated);
    setResult(null);
  }

  async function runCleaning() {
    if (!uploadedFile || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/clean-file`, {
        method: "POST",
        body: createFormData(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Cleaning failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to clean dataset.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadReport(type) {
    if (!uploadedFile || !result || downloading) return;

    setDownloading(type);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/download-file/${type}`,
        {
          method: "POST",
          body: createFormData(),
        }
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
      link.download = filenames[type];
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message || "Download failed.");
    } finally {
      setDownloading("");
    }
  }

  if (!uploadedFile) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
        <Database size={42} className="mx-auto mb-4 text-blue-600" />
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
      <div>
        <div className="flex items-center gap-2 text-blue-600 text-xs font-bold tracking-widest mb-3">
          <WandSparkles size={18} />
          DATA PREPARATION
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-[#172d51]">
          Smart Data Cleaning
        </h2>
        <p className="text-slate-500 mt-3">
          Review recommendations and prepare your dataset.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl flex gap-3">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-[#172d51] mb-5">
          Cleaning Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-5 rounded-2xl bg-slate-50">
            <input
              type="checkbox"
              checked={trimSpaces}
              onChange={(e) => {
                setTrimSpaces(e.target.checked);
                setResult(null);
              }}
            />
            <span className="font-semibold">Trim Extra Spaces</span>
          </label>

          <label className="flex items-center gap-3 p-5 rounded-2xl bg-slate-50">
            <input
              type="checkbox"
              checked={removeDuplicates}
              onChange={(e) => {
                setRemoveDuplicates(e.target.checked);
                setResult(null);
              }}
            />
            <span className="font-semibold">Remove Duplicate Rows</span>
          </label>
        </div>

        <div className="mt-9">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <h3 className="text-xl font-bold text-[#172d51] flex items-center gap-2">
              <Sparkles size={21} className="text-blue-600" />
              Smart Missing Value Cleaning
            </h3>

            {missingColumns.length > 0 && (
              <button
                onClick={applyAllSuggestions}
                className="bg-blue-50 text-blue-700 px-5 py-3 rounded-xl font-semibold"
              >
                Apply All Suggestions
              </button>
            )}
          </div>

          {preparing ? (
            <p className="text-blue-600 flex gap-2">
              <RefreshCw className="animate-spin" />
              Loading recommendations...
            </p>
          ) : missingColumns.length === 0 ? (
            <p className="text-slate-500">
              No missing-value columns reported.
            </p>
          ) : (
            <div className="space-y-4">
              {missingColumns.map((column) => {
                const name = column.column;
                const recommendation = getRecommendation(name);
                const suggestion = getSuggestedMethod(recommendation);
                const methods = availableMethods(column);

                return (
                  <div
                    key={name}
                    className="bg-slate-50 rounded-2xl p-5 border border-slate-100"
                  >
                    <div className="flex flex-wrap justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-[#172d51]">
                          {name}
                        </h4>
                        <p className="text-sm text-orange-700 mt-2">
                          {column.missing} Missing · {column.type}
                        </p>
                      </div>

                      <select
                        value={rules[name] || "Keep Missing"}
                        onChange={(e) => {
                          setRules((prev) => ({
                            ...prev,
                            [name]: e.target.value,
                          }));
                          setResult(null);
                        }}
                        className="bg-white border rounded-xl px-4 py-3"
                      >
                        {methods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 bg-white rounded-xl p-4">
                      <p className="text-sm text-slate-600">
                        Suggested Method:{" "}
                        <strong>{suggestion || "Manual Review"}</strong>
                      </p>

                      {suggestion && methods.includes(suggestion) && (
                        <button
                          onClick={() => {
                            setRules((prev) => ({
                              ...prev,
                              [name]: suggestion,
                            }));
                            setResult(null);
                          }}
                          className="mt-3 text-blue-600 font-semibold text-sm"
                        >
                          Apply Suggestion
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={runCleaning}
          disabled={loading || preparing}
          className="mt-8 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-7 py-3.5 rounded-xl font-semibold"
        >
          <WandSparkles size={19} />
          {loading ? "Cleaning Dataset..." : "Run Smart Cleaning"}
        </button>
      </section>

      {recommendations.length > 0 && (
        <section className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-5">
            Python Recommendation Report
          </h3>
          <DataTable rows={recommendations} />
        </section>
      )}

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ["Before Quality Score", `${result.before_score}%`],
              ["After Quality Score", `${result.after_score}%`],
              ["Audit Log Entries", result.audit_count],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-3xl p-6 shadow-sm">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-3xl font-bold text-[#172d51] mt-3">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {[
            ["Before vs After Comparison", result.comparison],
            ["Cleaned Dataset Preview", result.cleaned_preview],
            ["Cleaning Audit Log", result.audit],
          ].map(([title, rows]) => (
            <section key={title} className="bg-white rounded-3xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-[#172d51] mb-5">
                {title}
              </h3>
              <DataTable rows={rows} />
            </section>
          ))}

          <section className="bg-white rounded-3xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-[#172d51] mb-5">
              Export Cleaning Results
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ["Cleaned Dataset", "cleaned"],
                ["Quality Report", "quality"],
                ["Audit Log", "audit"],
              ].map(([label, type]) => (
                <button
                  key={type}
                  onClick={() => downloadReport(type)}
                  disabled={Boolean(downloading)}
                  className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 disabled:opacity-50 p-5 rounded-2xl font-semibold"
                >
                  <Download size={18} className="text-blue-600" />
                  {downloading === type ? "Downloading..." : label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
