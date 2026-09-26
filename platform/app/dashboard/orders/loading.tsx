export default function OrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/[0.06] rounded-xl" />
          <div className="h-4 w-72 bg-white/[0.04] rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-white/[0.05] rounded-xl" />
          <div className="h-10 w-36 bg-white/[0.05] rounded-xl" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-white/[0.04] rounded-lg" />
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-3">
        <div className="h-10 bg-white/[0.05] rounded-xl w-full" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-white/[0.02] rounded-xl w-full border border-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
