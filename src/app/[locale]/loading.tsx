import { Skeleton } from '@/components/ui/skeleton';

/**
 * Route-transition placeholder for the public site.
 *
 * Without a `loading.tsx`, Next holds the *old* page on screen until the new one has
 * finished rendering on the server. Nothing moves — not the URL, not the active item in
 * the header — so a slow route reads as an unresponsive button rather than as a page
 * that is on its way. With this file the transition commits immediately and the header
 * highlights the destination while the body streams in.
 *
 * Deliberately a generic masthead-and-grid shape rather than a per-route skeleton: it
 * only ever shows for a moment, and a wrong-shaped skeleton that then reflows is worse
 * than a neutral one.
 */
export default function LocaleLoading() {
  return (
    <div className="pt-[calc(theme(spacing.header)+3.5rem)]">
      <div className="container">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-6 h-11 w-full max-w-xl" />
        <Skeleton className="mt-4 h-4 w-full max-w-md" />

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-4">
              <Skeleton className="aspect-[16/10] w-full rounded-card" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
