'use client';

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  /**
   * How far the layer drifts across its full scroll range, in pixels.
   * Positive drifts down (background), negative drifts up (foreground).
   */
  distance?: number;
  /** Scale the layer as it scrolls — a subtle Ken Burns for the hero image. */
  scaleTo?: number;
}

/**
 * Scroll-linked parallax layer used for hero depth.
 *
 * Transform is spring-smoothed rather than bound directly to scroll progress: raw
 * scroll values jitter on trackpads and high-refresh displays, and the spring turns
 * that into the slow, weighty drift the design calls for.
 *
 * Returns a static layer under `prefers-reduced-motion` — parallax is one of the most
 * reliable triggers for motion sickness, so it is removed entirely rather than damped.
 */
export function Parallax({ children, className, distance = 120, scaleTo }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });
  const y = useTransform(smooth, [0, 1], [0, distance]);
  const scale = useTransform(smooth, [0, 1], [1, scaleTo ?? 1]);

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} className={className} style={{ y, scale }}>
      {children}
    </motion.div>
  );
}
