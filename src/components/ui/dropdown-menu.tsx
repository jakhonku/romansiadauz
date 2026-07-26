'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Slottable } from '@radix-ui/react-slot';
import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const contentClasses = cn(
  'z-50 min-w-[9rem] overflow-hidden rounded-md border border-border bg-popover p-1.5',
  'text-popover-foreground shadow-lift',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
  'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
);

const itemClasses = cn(
  'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2',
  'text-sm outline-none transition-colors',
  'focus:bg-accent focus:text-accent-foreground',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  '[&_svg]:size-4 [&_svg]:shrink-0',
);

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(contentClasses, className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item ref={ref} className={cn(itemClasses, className)} {...props} />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

/**
 * The check indicator sits in a fixed-width gutter rather than being conditionally
 * rendered, so selecting a different item never reflows the menu.
 *
 * `<Slottable>` is load-bearing, not decoration. This item always renders two children —
 * the caller's content and the indicator — so an `asChild` caller (the locale switcher
 * passes a `<Link>`) would make Radix's Slot throw "Expected a single React element
 * child". Slottable marks which of the two the merged element should replace. Outside a
 * Slot it is a transparent fragment, so the non-`asChild` case is unaffected.
 */
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem ref={ref} className={cn(itemClasses, 'pe-8', className)} {...props}>
    <Slottable>{children}</Slottable>
    <span className="absolute end-2 flex size-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="size-4 text-gold-ink" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2.5 py-1.5 text-kicker font-semibold uppercase text-muted-foreground', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn('-mx-1.5 my-1.5 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
};
