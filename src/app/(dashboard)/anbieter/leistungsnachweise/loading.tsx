export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="flex gap-4 items-start">
        <div className="w-12 h-12 rounded-xl bg-[--muted]" />
        <div className="space-y-2">
          <div className="h-7 bg-[--muted] rounded w-52" />
          <div className="h-4 bg-[--muted] rounded w-80" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[--muted] rounded-xl" />)}
      </div>
      <div className="h-10 bg-[--muted] rounded-xl" />
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[--muted] rounded-xl" />)}
    </div>
  );
}
