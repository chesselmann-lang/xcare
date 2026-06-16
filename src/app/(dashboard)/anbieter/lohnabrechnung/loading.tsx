export default function LohnabrechnungLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-[--muted] rounded" />
          <div className="h-4 w-72 bg-[--muted] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-[--muted] rounded-lg" />
          <div className="h-10 w-24 bg-[--muted] rounded-lg" />
        </div>
      </div>
      <div className="h-16 bg-[--muted] rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-[--muted] rounded-xl" />)}
      </div>
      <div className="h-8 bg-[--muted] rounded-xl" />
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-[--muted] rounded-xl" />)}
      </div>
    </div>
  );
}
