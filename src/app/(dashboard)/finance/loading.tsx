import { SkeletonList } from '@/components/ui/LoadingSkeleton';

export default function FinanceLoading() {
  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="skeleton h-8 w-44 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
      <SkeletonList count={4} />
    </div>
  );
}
