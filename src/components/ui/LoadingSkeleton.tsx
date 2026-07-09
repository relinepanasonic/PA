export function SkeletonCard() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="flex gap-2 mt-3">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-4">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-32" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
      <div className="skeleton h-6 w-36 mt-4" />
      <SkeletonList count={3} />
    </div>
  );
}
