export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-96 bg-[--muted] rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[--muted] rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-[--muted] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
