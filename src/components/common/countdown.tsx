'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';

export interface CountdownLabels {
  /** Sits above the digits, e.g. "Tanlovgacha qoldi". */
  title: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  /** Shown once the target moment has passed. */
  finished: string;
}

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function remaining(targetMs: number, nowMs: number): Parts | null {
  const delta = targetMs - nowMs;
  if (delta <= 0) return null;

  const totalSeconds = Math.floor(delta / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Countdown to the festival date.
 *
 * Renders nothing at all on the server and on the first client paint. That is
 * deliberate, not laziness: the remaining time depends on the *viewer's* clock, so
 * server HTML and the first hydration pass are guaranteed to disagree by at least the
 * network latency, and React would throw the subtree away. Mounting first, then
 * ticking, is the only version of this component that hydrates cleanly.
 *
 * The reserved-height placeholder keeps the hero from reflowing when the digits appear.
 *
 * The interval is one second and is cleared on unmount. `Date.now()` is read fresh each
 * tick rather than decrementing a counter, so the display stays correct after the tab
 * has been suspended in the background.
 */
export function Countdown({
  labels,
  /** ISO 8601 instant. Include the offset — `+05:00` for Tashkent — or it is read as UTC. */
  target,
  className,
}: {
  labels: CountdownLabels;
  target: string;
  className?: string;
}) {
  const targetMs = new Date(target).getTime();
  const [parts, setParts] = useState<Parts | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (Number.isNaN(targetMs)) return;

    setMounted(true);
    setParts(remaining(targetMs, Date.now()));

    const id = setInterval(() => setParts(remaining(targetMs, Date.now())), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  // A malformed date is a content bug, not a reason to break the hero.
  if (Number.isNaN(targetMs)) return null;

  if (!mounted) {
    return <div className={cn('mt-9 h-[5.5rem]', className)} aria-hidden />;
  }

  if (!parts) {
    return (
      <p className={cn('mt-9 text-sm font-semibold uppercase tracking-[0.14em] text-gold-ink', className)}>
        {labels.finished}
      </p>
    );
  }

  const cells: { value: number; label: string }[] = [
    { value: parts.days, label: labels.days },
    { value: parts.hours, label: labels.hours },
    { value: parts.minutes, label: labels.minutes },
    { value: parts.seconds, label: labels.seconds },
  ];

  return (
    <div className={cn('mt-9', className)}>
      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {labels.title}
      </p>

      {/*
        One live region for the whole widget, set to `off`: a polite region would make a
        screen reader announce the time every single second. The accessible summary
        below is static text that reads once.
      */}
      <div className="mt-3 flex items-start gap-3" aria-hidden>
        {cells.map((cell, index) => (
          <div key={cell.label} className="flex items-start gap-3">
            <div className="flex min-w-[3.25rem] flex-col items-center">
              <span className="font-display text-3xl font-bold leading-none text-primary tabular-nums sm:text-4xl">
                {String(cell.value).padStart(2, '0')}
              </span>
              <span className="mt-2 text-[0.5625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {cell.label}
              </span>
            </div>
            {index < cells.length - 1 ? (
              <span className="font-display text-2xl leading-none text-gold/50 sm:text-3xl">:</span>
            ) : null}
          </div>
        ))}
      </div>

      <p className="sr-only">
        {labels.title}: {parts.days} {labels.days}, {parts.hours} {labels.hours},{' '}
        {parts.minutes} {labels.minutes}
      </p>
    </div>
  );
}
