'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

const controlClasses = cn(
  'w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm',
  'placeholder:text-muted-foreground/70',
  'transition-colors duration-200',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'aria-[invalid=true]:border-destructive',
);

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium leading-none text-foreground', className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(controlClasses, 'h-11', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(controlClasses, 'min-h-[7rem] resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  // A native <select>, not a Radix listbox. On a phone this opens the OS picker, which
  // is faster to operate and more familiar than any custom dropdown — and this form is
  // mostly filled in on phones.
  <select ref={ref} className={cn(controlClasses, 'h-11 pe-8', className)} {...props} />
));
Select.displayName = 'Select';

/**
 * Label + control + hint + error, wired together.
 *
 * `aria-describedby` points at the hint and the error together, and `aria-invalid`
 * flips with the error — which is what makes a screen reader announce *why* a field was
 * rejected rather than just that focus moved.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  optionalLabel,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Localized "ixtiyoriy" — shown when a field is not required. */
  optionalLabel?: string;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
  }) => React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span aria-hidden className="ms-1 text-destructive">
              *
            </span>
          ) : null}
        </Label>
        {!required && optionalLabel ? (
          <span className="text-xs text-muted-foreground">{optionalLabel}</span>
        ) : null}
      </div>

      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
