export default function AngehoerigLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-[--muted] rounded" />
      <div className="h-10 w-full bg-[--muted] rounded-xl" />
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-[--muted] rounded-xl" />)}
      </div>
    </div>
  );
}
