import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPageLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Large Card */}
      <div className="card p-8 flex flex-col items-center text-center space-y-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="space-y-2 flex flex-col items-center">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-12 w-48 rounded-2xl" />
      </div>
    </div>
  );
}
