export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/[0.06] rounded-xl" />
          <div className="h-4 w-60 bg-white/[0.04] rounded-lg" />
        </div>
        <div className="h-10 w-44 bg-white/[0.06] rounded-xl" />
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="h-10 w-64 bg-white/[0.04] rounded-xl" />
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-white/[0.04] rounded-xl" />
          <div className="h-10 w-28 bg-white/[0.04] rounded-xl" />
        </div>
      </div>

      {/* Grid of Product Skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden p-3 space-y-3"
          >
            <div className="aspect-square w-full bg-white/[0.05] rounded-xl" />
            <div className="h-4 bg-white/[0.06] rounded w-3/4" />
            <div className="h-3 bg-white/[0.04] rounded w-1/2" />
            <div className="h-5 bg-white/[0.05] rounded w-1/3 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
