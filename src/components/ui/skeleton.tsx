import { cn } from '@/lib/utils/cn';

/**
 * Loading placeholder. The shimmer lives in `globals.css` so it is a single keyframe
 * shared by every skeleton on the page rather than one per element.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shimmer rounded-md bg-muted', className)} {...props} />;
}
