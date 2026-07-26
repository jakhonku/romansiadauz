'use client';

import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * `gold` renders the fading gold hairline that separates sections throughout the site;
 * `plain` is the ordinary border-coloured rule for dense UI.
 */
export const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & { tone?: 'plain' | 'gold' }
>(({ className, orientation = 'horizontal', decorative = true, tone = 'plain', ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      tone === 'gold' ? 'rule-gold' : 'bg-border',
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;
