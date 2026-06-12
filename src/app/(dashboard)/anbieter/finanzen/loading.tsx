export default function Loading() {
  return (
    <div className="space-y-6 max-w-5xl animate-pulse">
      <div className="h-8 w-72 bg-[--muted] rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[--muted] rounded-xl" />
        ))}
      </div>
      <div className="h-56 bg-[--muted] rounded-xl" />
      <div className="h-36 bg-[--muted] rounded-xl" />
      <div className="h-64 bg-[--muted] rounded-xl" />
    </div>
  );
}
