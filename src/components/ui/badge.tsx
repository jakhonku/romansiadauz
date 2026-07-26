import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium leading-none [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        gold: 'bg-gold/10 text-gold-ink',
        muted: 'bg-muted text-muted-foreground',
        outline: 'border border-border text-foreground',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        destructive: 'bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
