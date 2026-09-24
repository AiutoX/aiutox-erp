/**
 * UserListSkeleton Component
 *
 * Skeleton loader for user list table
 */

import { Skeleton } from "~/components/ui/skeleton";

interface UserListSkeletonProps {
  rows?: number;
}

/**
 * UserListSkeleton component
 */
export function UserListSkeleton({ rows = 5 }: UserListSkeletonProps) {
  return (
    <div className="rounded-md border">
      <div className="space-y-0">
        {/* Header */}
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="grid grid-cols-6 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 hidden md:block" />
            <Skeleton className="h-4 w-24 hidden lg:block" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20 hidden xl:block" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 last:border-b-0">
            <div className="grid grid-cols-6 gap-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 hidden md:block" />
              <Skeleton className="h-4 w-1/2 hidden lg:block" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 hidden xl:block" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
