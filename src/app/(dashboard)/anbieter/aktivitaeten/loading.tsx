export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-gray-200 rounded" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-40 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
      </div>
    </div>
  );
}
