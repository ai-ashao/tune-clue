import type * as React from 'react'
import { cn } from '@/lib/utils'

type FieldProps = React.ComponentProps<'div'> & {
  orientation?: 'vertical' | 'horizontal'
}

function Field({ className, orientation = 'vertical', ...props }: FieldProps) {
  return (
    <div
      data-orientation={orientation}
      data-slot="field"
      className={cn(
        orientation === 'vertical'
          ? 'flex flex-col gap-2'
          : 'grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,auto)_minmax(0,1fr)] sm:items-center',
        className,
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-group" className={cn('grid gap-4', className)} {...props} />
}

function FieldControl({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="field-control" className={cn('grid min-w-0 gap-2', className)} {...props} />
  )
}

function FieldLabel({
  className,
  children,
  htmlFor,
  ...props
}: Omit<React.ComponentProps<'label'>, 'htmlFor'> & { htmlFor: string }) {
  return (
    <label
      data-slot="field-label"
      className={cn('text-sm font-medium leading-none', className)}
      htmlFor={htmlFor}
      {...props}
    >
      {children}
    </label>
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-xs leading-5 text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Field, FieldControl, FieldDescription, FieldGroup, FieldLabel }
