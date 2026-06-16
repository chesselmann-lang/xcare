export default function LoadingDekubitus() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-72 bg-gray-200 rounded" />
        <div className="h-10 w-44 bg-gray-200 rounded-lg" />
      </div>
      {/* Risk banner */}
      <div className="h-16 bg-gray-200 rounded-xl" />
      {/* Tabs */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-40 bg-gray-200 rounded-full" />
        ))}
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      {/* List items */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
