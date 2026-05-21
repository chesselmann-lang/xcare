export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-4 w-72 bg-gray-100 rounded" />
      <div className="h-56 rounded-xl bg-gray-100" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
