import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[var(--r-sm)] border px-2 py-0.5 font-mono text-[10px] tracking-[.15em] uppercase',
  {
    variants: {
      variant: {
        default: 'border-[var(--line-2)] bg-[var(--surface)] text-[var(--ink-3)]',
        accent: 'border-[var(--acc)]/40 bg-[var(--acc-dim)] text-[var(--acc)]',
        solid: 'border-transparent bg-[var(--acc)] text-[var(--acc-ink)]'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }