'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Gap between each child's entrance, in seconds. */
  gap?: number;
  delay?: number;
  as?: ElementType;
}

/**
 * Cascades its direct children into view. Pair with `<StaggerItem>`:
 *
 *   <Stagger className="grid gap-8">
 *     {judges.map((j) => <StaggerItem key={j.id}><JudgeCard … /></StaggerItem>)}
 *   </Stagger>
 *
 * The parent owns the timing so cards never need to know their own index.
 */
export function Stagger({ children, className, gap = 0.09, delay = 0, as = 'div' }: StaggerProps) {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = motion[as as 'div'] ?? motion.div;

  const variants: Variants = {
    hidden: {},
    visible: {
      transition: {
        // A cascade is motion. Reduced-motion users get everything at once.
        staggerChildren: shouldReduceMotion ? 0 : gap,
        delayChildren: delay,
      },
    },
  };

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px 0px' }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const reducedItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div className={className} variants={shouldReduceMotion ? reducedItemVariants : itemVariants}>
      {children}
    </motion.div>
  );
}
