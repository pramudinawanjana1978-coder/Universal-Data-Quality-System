
import { useRef, useState } from "react";

import Profile from "./pages/Profile";
import Validate from "./pages/Validate";
import Clean from "./pages/Clean";
import Reports from "./pages/Reports";
import DatasetPreview from "./pages/DatasetPreview";

import {
  House,
  ScanSearch,
  ShieldCheck,
  WandSparkles,
  FileChartColumn,
  Upload,
  Database,
  Columns3,
  AlertTriangle,
  Copy,
  Sparkles,
  FileSpreadsheet,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";


const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://dataquality-360-fastapi.vercel.app";

const tabs = [
  { id: "home", label: "Home", icon: House },
  { id: "profile", label: "Profile", icon: ScanSearch },
  { id: "validate", label: "Validate", icon: ShieldCheck },
  { id: "clean", label: "Clean", icon: WandSparkles },
  { id: "reports", label: "Reports", icon: FileChartColumn },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [uploadedFile, setUploadedFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const fileInput = useRef(null);
  const uploadVersion = useRef(0);

  // CSV UPLOAD
  async function uploadCSV(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const version = ++uploadVersion.current;

    setLoading(true);
    setError("");
    setData(null);
    setUploadedFile(null);
    setProfile(null);
    setProfileError("");
    setProfileLoading(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${API_URL}/api/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Analysis failed"
        );
      }

      if (version !== uploadVersion.current) return;

      setData(result);
      setUploadedFile(file);
      setActiveTab("home");
    } catch (err) {
      if (version !== uploadVersion.current) return;
      setError(err.message || "Unable to connect to backend");
    } finally {
      if (version === uploadVersion.current) {
        setLoading(false);
      }
      event.target.value = "";
    }
  }

  // DATA PROFILING
  async function openProfile() {
    setActiveTab("profile");

    if (!uploadedFile || profile || profileLoading) return;

    const version = uploadVersion.current;
    setProfileLoading(true);
    setProfileError("");

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await fetch(
        `${API_URL}/api/profile`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Data profiling failed"
        );
      }

      if (version !== uploadVersion.current) return;
      setProfile(result);
    } catch (err) {
      if (version !== uploadVersion.current) return;
      setProfileError(err.message || "Unable to load profile");
    } finally {
      if (version === uploadVersion.current) {
        setProfileLoading(false);
      }
    }
  }

  function navigateTo(tabId) {
    if (tabId === "profile") {
      openProfile();
    } else {
      setActiveTab(tabId);
    }
  }

  const metrics = [
    {
      label: "Total Records",
      value: data?.rows ?? "—",
      icon: Database,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Data Columns",
      value: data?.columns ?? "—",
      icon: Columns3,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Missing Values",
      value: data?.missing_values ?? "—",
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Duplicate Rows",
      value: data?.duplicates ?? "—",
      icon: Copy,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fc] pb-36">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto px-5 md:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#172d51] flex items-center justify-center shadow-lg">
            <Activity className="text-white" size={25} />
          </div>

          <div>
            <h1 className="font-bold text-xl tracking-tight">
              DataQuality{" "}
              <span className="text-blue-600">360</span>
            </h1>
            <p className="text-[10px] tracking-[0.2em] text-slate-400 font-semibold">
              INTELLIGENT DATA WORKSPACE
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-100 rounded-full px-4 py-2 text-sm text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Workspace
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-5 md:px-10">
        {activeTab === "home" ? (
          <div className="animate-rise">
            {/* HERO */}
            <section className="relative overflow-hidden rounded-[24px] bg-[#172d51] text-white px-6 py-7 md:px-9 md:py-8 mb-5">
              <div className="absolute -right-16 -top-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute right-20 bottom-0 w-40 h-40 bg-cyan-400/10 rounded-full blur-2xl" />

              <div className="relative z-10 w-full">
                <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold tracking-widest mb-5">
                  <Sparkles size={16} />
                  YOUR SMART DATA WORKSPACE
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-bold leading-tight tracking-tight mb-3">
                  Make your data{" "}
                  <span className="text-[#8bbcff]">
                    analysis-ready.
                  </span>
                </h2>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-7">
                  Discover missing values, identify data quality
                  issues, and prepare reliable datasets for
                  meaningful insights.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => fileInput.current?.click()}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition"
                  >
                    <Upload size={18} />
                    {loading ? "Analyzing..." : "Upload Dataset"}
                  </button>

                  <span className="text-sm text-slate-300">
                    Supports CSV files
                  </span>
                </div>
              </div>
            </section>

            {/* ERROR */}
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-2xl mb-6">
                {error}
              </div>
            )}

            {/* FILE NAME */}
            {data && (
              <div className="flex items-center gap-2 mb-6 text-sm text-slate-600">
                <FileSpreadsheet
                  size={18}
                  className="text-blue-600"
                />
                <span className="font-medium">
                  {data.filename}
                </span>
              </div>
            )}

            {/* METRICS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <div
                    key={metric.label}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 shrink-0 rounded-xl ${metric.bg} flex items-center justify-center`}
                      >
                        <Icon
                          size={21}
                          className={metric.color}
                        />
                      </div>

                      <p className="text-sm font-semibold text-slate-600">
                        {metric.label}
                      </p>
                    </div>

                    <p className="text-2xl font-bold text-[#172d51]">
                      {metric.value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* QUALITY OVERVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
              {/* QUALITY SCORE */}
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-2">
                  Data Quality Score
                </h3>

                <p className="text-xs text-slate-400 mb-7">
                  Completeness and uniqueness
                </p>

                <div className="flex justify-center">
                  <div
                    className="w-48 h-48 rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(
                        #3478ef ${(data?.quality_score ?? 0) * 3.6}deg,
                        #e8eef8 0deg
                      )`,
                    }}
                  >
                    <div className="w-36 h-36 rounded-full bg-white flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-[#172d51]">
                        {data ? `${data.quality_score}%` : "—"}
                      </span>
                      <span className="text-xs text-slate-400 mt-2">
                        Overall Score
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-slate-400 mt-7">
                  Illustrative quality metric
                </p>
              </section>

              {/* MISSING VALUES CHART */}
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg">
                      Missing Values Analysis
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Missing values across dataset columns
                    </p>
                  </div>
                  <Activity className="text-blue-500" />
                </div>

                {data ? (
                  <ResponsiveContainer
                    width="100%"
                    height={260}
                  >
                    <BarChart
                      data={data.column_missing || []}
                    >
                      <XAxis
                        dataKey="column"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={75}
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
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                    <Database
                      size={35}
                      className="mb-3 opacity-40"
                    />
                    <p className="text-sm">
                      Upload a dataset to explore insights
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* DATASET PREVIEW */}
            <DatasetPreview
              datasetId={data?.dataset_id}
              uploadedFile={uploadedFile}
            />
          </div>
        ) : activeTab === "profile" ? (
          <Profile
            profile={profile}
            loading={profileLoading}
            error={profileError}
          />
        ) : activeTab === "validate" ? (
          <Validate
            datasetId={data?.dataset_id}
            uploadedFile={uploadedFile}
          />
        ) : activeTab === "clean" ? (
          <Clean
            datasetId={data?.dataset_id}
            uploadedFile={uploadedFile}
          />
        ) : activeTab === "reports" ? (
          <Reports
            datasetId={data?.dataset_id}
            data={data}
            uploadedFile={uploadedFile}
          />
        ) : null}
      </main>

      {/* FILE INPUT */}
      <input
        ref={fileInput}
        type="file"
        accept=".csv"
        onChange={uploadCSV}
        className="hidden"
      />

      {/* BOTTOM NAVIGATION */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-[620px] bg-[#172d51]/95 backdrop-blur-xl rounded-[26px] shadow-2xl p-2 border border-white/10"
      >
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.id)}
                aria-current={selected ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition ${
                  selected
                    ? "bg-blue-500 text-white"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
