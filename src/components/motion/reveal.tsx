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

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !repeat, margin: '-80px 0px -80px 0px' }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}
