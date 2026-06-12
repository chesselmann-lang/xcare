export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[--muted]" />
        <div className="space-y-2">
          <div className="h-7 bg-[--muted] rounded w-72" />
          <div className="h-4 bg-[--muted] rounded w-48" />
        </div>
      </div>
      {/* Toolbar */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-9 bg-[--muted] rounded-lg w-28" />)}
      </div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-[--muted] rounded-xl" />)}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-72 bg-[--muted] rounded-xl" />
        <div className="lg:col-span-2 h-72 bg-[--muted] rounded-xl" />
      </div>
      {/* Detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-56 bg-[--muted] rounded-xl" />
        <div className="h-56 bg-[--muted] rounded-xl" />
      </div>
    </div>
  );
}
