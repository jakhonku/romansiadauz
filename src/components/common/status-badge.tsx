import { Badge } from '@/components/ui/badge';
import type { ContentStatus, RegistrationStatus } from '@/types/database.types';

const REGISTRATION_TONE: Record<RegistrationStatus, 'warning' | 'success' | 'destructive'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

const CONTENT_TONE: Record<ContentStatus, 'success' | 'muted' | 'outline'> = {
  published: 'success',
  draft: 'muted',
  archived: 'outline',
};

/**
 * Status pill.
 *
 * Colour is never the only signal — the label always carries the status in words, so
 * the badge still works for a colour-blind reviewer and in a printed application list.
 */
export function RegistrationStatusBadge({
  status,
  label,
}: {
  status: RegistrationStatus;
  label: string;
}) {
  return <Badge variant={REGISTRATION_TONE[status]}>{label}</Badge>;
}

export function ContentStatusBadge({ status, label }: { status: ContentStatus; label: string }) {
  return <Badge variant={CONTENT_TONE[status]}>{label}</Badge>;
}
