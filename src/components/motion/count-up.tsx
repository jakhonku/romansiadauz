'use client';

import { useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { defaultLocale, type Locale } from '@/lib/i18n/config';
import { formatInteger } from '@/lib/i18n/format';

interface CountUpProps {
  value: number;
  /** Rendered after the number, e.g. "+" in "1000+". */
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  /** Drives digit grouping, so 1000 reads as "1 000" in Uzbek and Russian. */
  locale?: Locale;
}

/**
 * Animates a statistic from zero when it scrolls into view.
 *
 * The final value is rendered into the DOM immediately as text content and only then
 * animated, so screen readers and crawlers always see "1000", never a transient "437".
 *
 * Grouping goes through `formatInteger` rather than `Intl.NumberFormat`: this component
 * hydrates, and the two environments disagree about how to group `uz-UZ`.
 */
export function CountUp({
  value,
  suffix = '',
  prefix = '',
  duration = 1.8,
  className,
  locale = defaultLocale,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const shouldReduceMotion = useReducedMotion();

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(value);
      return;
    }
    if (isInView) {
      setDisplay(0);
      motionValue.set(value);
    }
  }, [isInView, motionValue, value, shouldReduceMotion]);

  useEffect(() => {
    if (shouldReduceMotion) return;
    return spring.on('change', (latest) => setDisplay(Math.round(latest)));
  }, [spring, shouldReduceMotion]);

  const formatted = formatInteger(display, locale);

  return (
    <span ref={ref} className={className}>
      {/* The accessible value never animates. */}
      <span aria-hidden="true">
        {prefix}
        {formatted}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {formatInteger(value, locale)}
        {suffix}
      </span>
    </span>
  );
}
