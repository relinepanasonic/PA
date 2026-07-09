import { SkeletonList } from '@/components/ui/LoadingSkeleton';

export default function ActivitiesLoading() {
  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="skeleton h-8 w-48 rounded-2xl" />
      <div className="skeleton h-12 rounded-full w-full" />
      <SkeletonList count={4} />
    </div>
  );
}
