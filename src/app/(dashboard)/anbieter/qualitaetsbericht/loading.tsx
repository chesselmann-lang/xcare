export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-[--muted] rounded-lg" />
      <div className="h-4 w-80 bg-[--muted] rounded" />
      {/* Filter bar */}
      <div className="h-16 bg-[--muted] rounded-xl" />
      {/* Gesamtnote */}
      <div className="h-36 bg-[--muted] rounded-2xl" />
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-24 bg-[--muted] rounded-xl" />)}
      </div>
      {/* Bereiche */}
      <div className="space-y-3">
        {[0,1,2,3].map(i => <div key={i} className="h-16 bg-[--muted] rounded-xl" />)}
      </div>
    </div>
  );
}
