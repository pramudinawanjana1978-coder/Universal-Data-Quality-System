
import {
  Database,
  Columns3,
  BarChart3,
  Search,
} from "lucide-react";
import { useState } from "react";

export default function Profile({ profile, loading, error }) {
  const [search, setSearch] = useState("");

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center">
        Analyzing dataset...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 rounded-3xl p-6">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center">
        <Database className="mx-auto text-blue-500 mb-4" size={40} />
        <h2 className="text-2xl font-bold">Data Profiling</h2>
        <p className="text-slate-500 mt-3">
          Upload a CSV dataset from the Home page to explore its structure.
        </p>
      </div>
    );
  }

  const filteredColumns = profile.columns.filter((column) =>
    column.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#172d51]">
          Data Profiling
        </h2>
        <p className="text-slate-500 mt-2">
          Explore your dataset structure, completeness, and statistics.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <Database className="text-blue-600 mb-3" />
          <p className="text-3xl font-bold">{profile.rows}</p>
          <p className="text-sm text-slate-500">Total Records</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <Columns3 className="text-violet-600 mb-3" />
          <p className="text-3xl font-bold">
            {profile.columns.length}
          </p>
          <p className="text-sm text-slate-500">Total Columns</p>
        </div>
      </div>

      <section className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="font-bold text-lg">
            Column Quality Report
          </h3>

          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
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
                <th className="p-4">Column</th>
                <th className="p-4">Data Type</th>
                <th className="p-4">Missing</th>
                <th className="p-4">Missing %</th>
                <th className="p-4">Unique</th>
              </tr>
            </thead>

            <tbody>
              {filteredColumns.map((col) => (
                <tr
                  key={col.name}
                  className="border-b border-slate-100"
                >
                  <td className="p-4 font-medium">{col.name}</td>
                  <td className="p-4">{col.type}</td>
                  <td className="p-4">{col.missing}</td>
                  <td className="p-4">
                    <span className={
                      col.missing_percentage > 0
                        ? "text-orange-600 font-semibold"
                        : "text-green-600"
                    }>
                      {col.missing_percentage}%
                    </span>
                  </td>
                  <td className="p-4">{col.unique}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="text-blue-600" />
          <h3 className="font-bold text-lg">
            Numerical Statistics
          </h3>
        </div>

        {profile.statistics.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No numeric columns found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["Column", "Mean", "Median", "Min", "Max"].map(
                    (heading) => (
                      <th key={heading} className="p-4">
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {profile.statistics.map((item) => (
                  <tr
                    key={item.column}
                    className="border-b border-slate-100"
                  >
                    <td className="p-4 font-medium">
                      {item.column}
                    </td>
                    <td className="p-4">{item.mean}</td>
                    <td className="p-4">{item.median}</td>
                    <td className="p-4">{item.minimum}</td>
                    <td className="p-4">{item.maximum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
