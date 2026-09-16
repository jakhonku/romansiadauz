import { siteConfig } from '@/lib/site-config';

/**
 * The instant entries close, preferring the admin-editable value over the build-time
 * default. One helper so the page, the form and the Server Action cannot drift apart
 * and disagree about whether applications are still open.
 */
export function resolveApplicationsCloseAt(override?: string | null): string {
  return override || siteConfig.applicationsCloseAt;
}

/**
 * Are applications still being accepted?
 *
 * Fails *open* on a date the platform cannot parse. An unparseable deadline is a
 * content bug, and the two ways of being wrong are not symmetric: showing the form for
 * a few extra hours is a nuisance, while silently refusing every genuine applicant
 * because an administrator typed a malformed date is the kind of failure nobody
 * notices until the competition has no entrants.
 */
export function applicationsAreOpen(closesAt: string, now: number = Date.now()): boolean {
  const closesMs = new Date(closesAt).getTime();
  if (Number.isNaN(closesMs)) return true;
  return now <= closesMs;
}
