import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[--muted]", className)}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[--border] p-5 space-y-3">
      <div className="flex gap-4">
        <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="space-y-4 mt-8">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export { Skeleton };
