export default function StoresLoading() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/[0.06] rounded-xl" />
          <div className="h-4 w-64 bg-white/[0.04] rounded-lg" />
        </div>
        <div className="h-10 w-44 bg-white/[0.06] rounded-xl" />
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5" />
        ))}
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5" />
        ))}
      </div>
    </div>
  );
}
