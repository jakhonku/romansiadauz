'use client';

import { Archive, ArchiveRestore, Mail, MailOpen, Reply } from 'lucide-react';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { setMessageArchived, setMessageRead } from '@/server/actions/admin-messages';
import { cn } from '@/lib/utils/cn';

export interface MessageCardLabels {
  markRead: string;
  markUnread: string;
  archive: string;
  unarchive: string;
  reply: string;
  noSubject: string;
  receivedAt: string;
}

export function MessageCard({
  id,
  name,
  email,
  phone,
  subject,
  message,
  isRead,
  isArchived,
  receivedAt,
  labels,
}: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  /** Pre-formatted on the server — `Intl` is not portable across hydration. */
  receivedAt: string;
  labels: MessageCardLabels;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <article
      className={cn(
        'rounded-card border bg-card p-5 shadow-card transition-colors',
        // Unread gets a gold edge rather than a bold font: the message body should read
        // the same whether or not it has been opened.
        isRead ? 'border-border' : 'border-s-2 border-s-gold border-border',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">
            {subject || <span className="text-muted-foreground">{labels.noSubject}</span>}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {name} ·{' '}
            <a href={`mailto:${email}`} className="hover:text-foreground hover:underline">
              {email}
            </a>
            {phone ? (
              <>
                {' · '}
                <a href={`tel:${phone}`} dir="ltr" className="hover:text-foreground hover:underline">
                  {phone}
                </a>
              </>
            ) : null}
          </p>
        </div>

        <time className="shrink-0 text-xs text-muted-foreground">{receivedAt}</time>
      </header>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{message}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          {/* The subject is prefixed rather than reused verbatim so a reply thread is
              recognisable in the operator's own mail client. */}
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${subject || ''}`.trim())}`}
          >
            <Reply />
            {labels.reply}
          </a>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => void setMessageRead(id, !isRead))}
        >
          {isRead ? <Mail /> : <MailOpen />}
          {isRead ? labels.markUnread : labels.markRead}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => void setMessageArchived(id, !isArchived))}
        >
          {isArchived ? <ArchiveRestore /> : <Archive />}
          {isArchived ? labels.unarchive : labels.archive}
        </Button>
      </div>
    </article>
  );
}
