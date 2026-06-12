export default function Loading() {
  return (
    <div className="space-y-6 max-w-5xl animate-pulse">
      <div className="h-8 w-80 bg-[--muted] rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-[--muted] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-[--muted] rounded-xl" />
        <div className="h-96 bg-[--muted] rounded-xl" />
      </div>
      <div className="h-32 bg-[--muted] rounded-xl" />
    </div>
  );
}
