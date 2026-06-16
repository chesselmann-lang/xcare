export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-[--muted] rounded-lg" />
      <div className="h-4 w-80 bg-[--muted] rounded" />
      {[0,1,2,3,4,5].map(i => (
        <div key={i} className="h-14 bg-[--muted] rounded-xl" />
      ))}
    </div>
  );
}
