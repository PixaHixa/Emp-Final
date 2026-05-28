import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-blue)] disabled:pointer-events-none disabled:opacity-50 max-[480px]:min-h-11',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-accent-blue)] text-white shadow-sm hover:bg-[#2563eb]',
        secondary:
          'border border-[var(--color-border)] bg-app-card text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-accent-blue)]/35 hover:bg-[var(--color-bg-surface)]',
        danger: 'bg-[var(--color-danger)] text-white shadow-sm hover:bg-[#dc2626]',
        ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]',
        success: 'bg-[var(--color-success)] text-white shadow-sm hover:bg-[#16a34a]',
      },
      size: {
        sm: 'h-9 min-h-9 px-3 text-sm max-[480px]:h-auto max-[480px]:min-h-11',
        md: 'h-11 px-4 text-sm max-[480px]:h-auto',
        lg: 'h-12 px-6 text-base max-[480px]:h-auto max-[480px]:min-h-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button type="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
