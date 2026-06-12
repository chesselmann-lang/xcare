export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-80 bg-[--muted] rounded-xl" />
      <div className="h-16 bg-amber-100/60 rounded-xl" />
      <div className="h-24 bg-[--muted] rounded-xl" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-72 bg-[--muted] rounded-xl" />
        <div className="h-72 bg-[--muted] rounded-xl" />
      </div>
      <div className="h-48 bg-[--muted] rounded-xl" />
    </div>
  );
}
