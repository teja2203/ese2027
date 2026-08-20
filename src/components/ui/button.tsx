import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r)] text-[13px] font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-[var(--acc)] text-[var(--acc-ink)] hover:bg-[var(--acc-2)]',
        ghost: 'bg-transparent text-[var(--ink-2)] hover:bg-[var(--surface-lift)] hover:text-[var(--ink)]',
        outline: 'border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface)]',
        accent: 'border border-[var(--acc)] bg-transparent text-[var(--acc)] hover:bg-[var(--acc-dim)]'
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6',
        icon: 'size-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
))
Button.displayName = 'Button'

export { Button, buttonVariants }