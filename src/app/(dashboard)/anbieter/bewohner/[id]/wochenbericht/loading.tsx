export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-14 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-32 bg-gray-200 rounded-xl" />
      <div className="h-48 bg-gray-200 rounded-xl" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  );
}
