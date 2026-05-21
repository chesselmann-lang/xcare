export default function HealthLoading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse">
      <div className="h-8 w-72 bg-gray-200 rounded" />
      <div className="h-14 bg-gray-100 rounded-xl" />
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
