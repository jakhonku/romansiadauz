'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before animating. Use for hand-tuned hero sequencing. */
  delay?: number;
  duration?: number;
  direction?: Direction;
  /** Travel distance in pixels. */
  distance?: number;
  /** Render as something other than a <div> — e.g. `as="section"`. */
  as?: ElementType;
  /** Animate every time it scrolls into view rather than only the first time. */
  repeat?: boolean;
  /**
   * Animate on mount instead of waiting to be scrolled into view.
   *
   * Required for anything above the fold. A scroll-triggered entrance for content that
   * is already on screen is a bet that the observer fires promptly, and when it does
   * not — a slow hydration, a tab restored from the background, a bfcache restore — the
   * result is a hero that stays blank with no way for the visitor to recover it.
   */
  immediate?: boolean;
}

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Scroll-triggered fade-and-rise, the workhorse entrance for every section.
 *
 * Under `prefers-reduced-motion` it collapses to a plain opacity fade with no
 * translation — motion-sensitive visitors still get the visual cue that content has
 * arrived, without the vestibular trigger of movement.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  direction = 'up',
  distance = 28,
  as = 'div',
  repeat = false,
  immediate = false,
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = motion[as as 'div'] ?? motion.div;

  const offset = offsets[direction];
  const variants: Variants = {
    hidden: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, x: offset.x * distance, y: offset.y * distance },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : duration,
        delay,
        // The "luxe" easing: fast departure, long gentle settle.
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const trigger = immediate
    ? { animate: 'visible' as const }
    : {
        whileInView: 'visible' as const,
        viewport: { once: !repeat, margin: '-80px 0px -80px 0px' },
      };

  return (
    <MotionTag className={className} initial="hidden" variants={variants} {...trigger}>
      {children}
    </MotionTag>
  );
}
