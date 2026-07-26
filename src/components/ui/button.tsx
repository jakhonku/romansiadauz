import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * The one button in the product.
 *
 * `gold` is deliberately absent as a *filled* variant: gold-on-white fails AA and
 * white-on-gold is barely better, so gold enters the button only as an outline or a
 * hairline. Bordeaux (`default`) carries every primary action.
 */
const buttonVariants = cva(
  cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'font-sans font-medium transition-all duration-300 ease-luxe',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-card hover:bg-primary-hover hover:shadow-lift',
        outline: 'border border-border bg-transparent text-foreground hover:border-gold hover:bg-accent',
        /** Gold hairline on transparent — the "elegant" secondary CTA. */
        gold: 'border border-gold/70 bg-transparent text-gold-ink hover:bg-gold/10 hover:border-gold',
        ghost: 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        subtle: 'bg-muted text-foreground hover:bg-accent',
        link: 'h-auto p-0 text-primary underline-offset-4 hover:underline',
        destructive: 'bg-destructive text-destructive-foreground shadow-card hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        default: 'h-11 px-6 text-sm',
        lg: 'h-13 px-8 text-base tracking-wide',
        icon: 'size-10',
        'icon-sm': 'size-9',
      },
      /** Pill geometry for CTAs; the default rounded-md suits toolbars and forms. */
      pill: {
        true: 'rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a <button> — use for links that look like buttons. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, pill, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        // Buttons inside a form default to `submit`; that has caused an accidental
        // submit in enough codebases to be worth defaulting explicitly.
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size, pill }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
