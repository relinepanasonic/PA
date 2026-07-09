import { SkeletonList } from '@/components/ui/LoadingSkeleton';

export default function TodosLoading() {
  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="skeleton h-8 w-40 rounded-2xl" />
      <SkeletonList count={5} />
    </div>
  );
}
