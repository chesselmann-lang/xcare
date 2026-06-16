export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-[--muted] rounded-lg" />
      <div className="grid grid-cols-6 gap-3">
        {[0,1,2,3,4,5].map(i => <div key={i} className="h-20 bg-[--muted] rounded-xl" />)}
      </div>
      {[0,1,2,3].map(i => <div key={i} className="h-16 bg-[--muted] rounded-xl" />)}
    </div>
  );
}
