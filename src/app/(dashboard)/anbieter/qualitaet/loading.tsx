export default function LoadingQualitaet() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-80 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>
      {/* Bewohner stats */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl" />
        ))}
      </div>
      {/* Chart */}
      <div className="h-48 bg-gray-200 rounded-xl" />
      {/* Table */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
      </div>
    </div>
  );
}
