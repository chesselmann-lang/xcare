export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-[--muted] rounded w-64" />
      <div className="h-4 bg-[--muted] rounded w-96" />
      <div className="h-64 bg-[--muted] rounded-xl" />
      <div className="h-48 bg-[--muted] rounded-xl" />
    </div>
  );
}
