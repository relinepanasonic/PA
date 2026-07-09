import Image from 'next/image';

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
    <div className="space-y-6 p-6 min-h-[70vh] flex flex-col items-center justify-center text-center">
      {/* Animated Glowing 3D Sapphire Logo */}
      <div className="relative w-24 h-24 mb-3 animate-pulse drop-shadow-[0_15px_35px_rgba(59,130,246,0.65)]">
        <Image
          src="/logo.png"
          alt="Loading PersonalAssist..."
          width={96}
          height={96}
          className="object-contain"
          priority
        />
      </div>
      <p className="text-sm font-semibold text-blue-400 tracking-wide animate-pulse">
        Loading Dashboard...
      </p>
      <div className="w-full max-w-sm space-y-4 pt-4">
        <div className="skeleton h-24 rounded-[28px] w-full" />
        <div className="skeleton h-20 rounded-[24px] w-full" />
      </div>
    </div>
  );
}
