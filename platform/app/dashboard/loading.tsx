export default function DashboardLoading() {
  return (
    <div className="w-full py-12 flex flex-col items-center justify-center min-h-[260px] animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <div className="absolute w-2 h-2 rounded-full bg-blue-400 animate-ping" />
      </div>
      <p className="text-xs text-slate-400 mt-3 font-medium">Chargement en cours...</p>
    </div>
  );
}
