
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";
const PAGE_SIZE = 10;

export default function DatasetPreview({ datasetId }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
    setResult(null);
    setError("");
  }, [datasetId]);

  useEffect(() => {
    if (!datasetId) return;

    const controller = new AbortController();

    async function loadRows() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/dataset/${encodeURIComponent(
            datasetId
          )}/rows?page=${page}&page_size=${PAGE_SIZE}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to load dataset rows."
          );
        }

        if (!controller.signal.aborted) {
          setResult(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Failed to load rows.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRows();

    return () => controller.abort();
  }, [datasetId, page]);

  const rows = result?.rows || [];
  const totalRows = result?.total_rows || 0;
  const totalPages = result?.total_pages || 1;

  const start = totalRows === 0
    ? 0
    : (page - 1) * PAGE_SIZE + 1;

  const end = Math.min(page * PAGE_SIZE, totalRows);

  const columns =
    rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <section className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-lg text-[#172d51]">
            Dataset Preview
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            Browse your dataset 10 rows at a time.
          </p>
        </div>

        {result && (
          <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
            {totalRows.toLocaleString()} Records
          </span>
        )}
      </div>

      {!datasetId ? (
        <div className="text-center py-10 text-slate-400">
          <Database size={30} className="mx-auto mb-3" />
          Upload a CSV file to view its records.
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-4 text-sm">
          <AlertTriangle size={18} />
          {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-blue-600">
          <RefreshCw size={18} className="animate-spin" />
          Loading rows...
        </div>
      ) : (
        <>
          <div className="w-full max-w-full overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-max min-w-full text-sm text-left">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 whitespace-nowrap text-[#172d51] font-semibold"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${page}-${index}`}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    {columns.map((column) => (
                      <td
                        key={column}
                        className="px-4 py-3 whitespace-nowrap text-slate-700"
                      >
                        {row[column] == null
                          ? "Missing"
                          : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className="text-center py-8 text-slate-500">
                No records available.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <strong>{start.toLocaleString()}</strong>
              {" – "}
              <strong>{end.toLocaleString()}</strong>
              {" of "}
              <strong>{totalRows.toLocaleString()}</strong>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-[#172d51] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="text-xs text-slate-600 px-2 whitespace-nowrap">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3">
            Scroll horizontally to view additional columns.
          </p>
        </>
      )}
    </section>
  );
}
