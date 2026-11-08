
export default function KPICard({
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
          {Icon && (
            <Icon size={21} className={iconColor} />
          )}
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
